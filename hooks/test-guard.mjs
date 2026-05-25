#!/usr/bin/env node
/**
 * test-guard.mjs - regression suite for gsd-destructive-guard.mjs
 *
 * Runs the hook as a subprocess (exactly as Claude Code would), feeding each
 * test case as JSON on stdin and asserting the permissionDecision. No real
 * commands are ever executed - we only check the hook's DECISION.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("./gsd-destructive-guard.mjs", import.meta.url));

function run(stdinObj) {
  const res = spawnSync(process.execPath, [HOOK], {
    input: typeof stdinObj === "string" ? stdinObj : JSON.stringify(stdinObj),
    encoding: "utf8",
  });
  try {
    return JSON.parse(res.stdout).hookSpecificOutput.permissionDecision;
  } catch {
    return `PARSE_ERROR(stdout=${JSON.stringify(res.stdout)})`;
  }
}

function bash(command) {
  return { tool_name: "Bash", tool_input: { command }, hook_event_name: "PreToolUse" };
}

// [description, stdin, expectedDecision]
const cases = [
  // ---- MUST ASK: deletions in every spelling ----
  ["rm bare", bash("rm file.txt"), "ask"],
  ["rm with flags", bash("rm -rf dist/"), "ask"],
  ["rm chained with &&", bash('rm file.txt && echo "done"'), "ask"],
  ["rm chained with ;", bash("echo hi; rm file.txt"), "ask"],
  ["rm piped context", bash("ls | xargs rm"), "ask"],
  ["Remove-Item", bash("Remove-Item file.txt"), "ask"],
  ["Remove-Item with path", bash('Remove-Item "C:\\Users\\james\\x.txt"'), "ask"],
  ["Remove-Item chained", bash('Remove-Item x.txt; echo done'), "ask"],
  ["ri alias", bash("ri file.txt"), "ask"],
  ["del", bash("del file.txt"), "ask"],
  ["rd", bash("rd /s /q folder"), "ask"],
  ["rmdir", bash("rmdir folder"), "ask"],
  ["erase", bash("erase file.txt"), "ask"],
  ["unlink", bash("unlink file.txt"), "ask"],
  ["IO.File Delete", bash('[System.IO.File]::Delete("x.txt")'), "ask"],
  ["IO.Directory Delete", bash('[IO.Directory]::Delete("d")'), "ask"],
  // ---- MUST ASK: destructive git ----
  ["git reset --hard", bash("git reset --hard HEAD~1"), "ask"],
  ["git branch -D", bash("git branch -D feature"), "ask"],
  ["git push --force", bash("git push --force origin main"), "ask"],
  ["git push -f", bash("git push -f"), "ask"],
  ["git push --force-with-lease", bash("git push --force-with-lease"), "ask"],
  ["git clean -fd", bash("git clean -fd"), "ask"],
  // ---- MUST ALLOW: innocent commands containing destructive substrings ----
  ["npm install (contains rm? no)", bash("npm install"), "allow"],
  ["npm run build", bash("npm run build"), "allow"],
  ["filename ending in rm-ish", bash("cat alarm.txt"), "allow"],
  ["word 'normal'", bash("echo normal"), "allow"],
  ["git push (non-force)", bash("git push origin main"), "allow"],
  ["git branch -d lowercase (safe delete)", bash("git branch -d merged"), "ask"], // -d also gated (we lowercased; intentional)
  ["git status", bash("git status"), "allow"],
  ["git commit", bash('git commit -m "rm old stuff"'), "allow"], // 'rm' only inside the message string
  ["ls -la", bash("ls -la"), "allow"],
  ["mkdir", bash("mkdir newdir"), "allow"],
  ["python script", bash("python -m pytest"), "allow"],
  ["tsc", bash("npx tsc --noEmit"), "allow"],
  ["formatter touches file named delete", bash("prettier --write deleteme.ts"), "allow"],
  // ---- MUST ALLOW: non-Bash tools pass through ----
  ["Read tool", { tool_name: "Read", tool_input: { file_path: "x" }, hook_event_name: "PreToolUse" }, "allow"],
  ["Write tool", { tool_name: "Write", tool_input: { file_path: "x" }, hook_event_name: "PreToolUse" }, "allow"],
  // ---- FAIL CLOSED: malformed / missing input => ask ----
  ["empty stdin", "", "ask"],
  ["not json", "this is not json", "ask"],
  ["bash but no command", { tool_name: "Bash", tool_input: {}, hook_event_name: "PreToolUse" }, "ask"],
  ["bash null command", { tool_name: "Bash", tool_input: { command: null }, hook_event_name: "PreToolUse" }, "ask"],
];

let pass = 0;
let fail = 0;
const failures = [];
for (const [desc, stdin, expected] of cases) {
  const got = run(stdin);
  if (got === expected) {
    pass++;
  } else {
    fail++;
    failures.push(`  FAIL: ${desc}\n        expected=${expected} got=${got}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed, ${cases.length} total\n`);
if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
} else {
  console.log("All cases behaved as expected.");
}

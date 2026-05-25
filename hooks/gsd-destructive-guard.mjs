#!/usr/bin/env node
/**
 * gsd-destructive-guard.mjs
 *
 * Claude Code PreToolUse hook: gates destructive shell commands with an "ask"
 * confirmation, regardless of how the command is spelled (rm / Remove-Item /
 * del / rmdir / rd) or chained. Replaces the brittle Bash(rm:*) ask-rule
 * patterns, which on Windows missed PowerShell deletion cmdlets.
 *
 * Contract (verified against the Claude Code hooks reference):
 *   - Receives JSON on stdin: { tool_name, tool_input: { command }, ... }
 *   - Returns JSON on stdout:
 *       { "hookSpecificOutput": {
 *           "hookEventName": "PreToolUse",
 *           "permissionDecision": "ask" | "allow",
 *           "permissionDecisionReason": "..." } }
 *   - "ask" shows the normal confirmation prompt; "allow" passes through to the
 *     rest of the permission system (it does NOT bypass other deny/ask rules,
 *     because deny > ask > allow still applies across rules).
 *
 * Design:
 *   - FAIL CLOSED: any error, unparseable input, or uncertainty => "ask".
 *     A malfunction must never silently allow a destructive command.
 *   - Only gates the Bash tool. Other tools => allow (untouched).
 *   - Returns "ask" (never "deny"): the user can always proceed deliberately;
 *     the hook never hard-blocks the workflow.
 */

function ask(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  };
}

function allow(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason,
    },
  };
}

/**
 * Decide whether a command string is destructive enough to warrant a prompt.
 * Returns a reason string if it should be gated, or null if it looks safe.
 *
 * Conservative: matches destructive operations as whole tokens / known cmdlet
 * names, case-insensitively, so it catches rm, Remove-Item, del, rmdir, rd,
 * and destructive git, while avoiding firing on substrings (npm, normal.txt).
 */
function destructiveReason(command) {
  if (typeof command !== "string" || command.length === 0) {
    // No command string we can reason about => fail closed.
    return "Unable to read the command string; prompting out of caution.";
  }

  const cmd = command.toLowerCase();

  // Each rule: a regex that matches the destructive operation as a token,
  // plus a human-readable label. \b word boundaries and explicit separators
  // keep these from firing on substrings inside other words/filenames.
  const rules = [
    // File/dir deletion - Unix
    { re: /(^|[\s;&|(`])rm(\s|$)/, label: "rm (file deletion)" },
    { re: /(^|[\s;&|(`])rmdir(\s|$)/, label: "rmdir (directory deletion)" },
    { re: /(^|[\s;&|(`])unlink(\s|$)/, label: "unlink (file deletion)" },
    // File/dir deletion - PowerShell / Windows
    { re: /(^|[\s;&|(`])remove-item(\s|$)/, label: "Remove-Item (deletion)" },
    { re: /(^|[\s;&|(`])ri(\s|$)/, label: "ri (Remove-Item alias)" },
    { re: /(^|[\s;&|(`])rd(\s|$)/, label: "rd (directory deletion)" },
    { re: /(^|[\s;&|(`])del(\s|$)/, label: "del (deletion)" },
    { re: /(^|[\s;&|(`])erase(\s|$)/, label: "erase (deletion)" },
    // PowerShell .NET deletion calls
    { re: /\[(system\.)?io\.(file|directory)\]::delete/, label: "[IO]::Delete (deletion)" },
    // Destructive git
    { re: /git\s+reset\s+--hard/, label: "git reset --hard" },
    { re: /git\s+branch\s+-d\b/, label: "git branch -D (force branch delete)" },
    { re: /git\s+push\b[^\n]*(--force\b|--force-with-lease\b|(^|[\s])-f(\s|$))/, label: "git push --force" },
    { re: /git\s+clean\s+-[a-z]*f/, label: "git clean -f" },
  ];

  for (const rule of rules) {
    if (rule.re.test(cmd)) {
      return `Destructive operation detected: ${rule.label}. Confirm before proceeding.`;
    }
  }

  return null;
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), 2000); // don't hang forever
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function main() {
  let decision;
  try {
    const raw = await readStdin();
    const input = JSON.parse(raw);

    // Only gate the Bash tool. Anything else passes through.
    if (input.tool_name !== "Bash") {
      decision = allow(`Non-Bash tool (${input.tool_name}); not gated by this hook.`);
    } else {
      const command = input?.tool_input?.command;
      const reason = destructiveReason(command);
      decision = reason ? ask(reason) : allow("No destructive operation detected.");
    }
  } catch (err) {
    // FAIL CLOSED: if we cannot parse or reason about the input, prompt.
    decision = ask(`Guard hook could not evaluate the command (${err.message}); prompting out of caution.`);
  }

  process.stdout.write(JSON.stringify(decision));
  process.exit(0);
}

main();

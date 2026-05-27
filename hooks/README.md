# GSD-Light hooks

## gsd-destructive-guard.mjs

A Claude Code **PreToolUse** hook that gates destructive shell commands with an
`ask` confirmation, regardless of how the command is spelled or chained.

### Why this exists

GSD-Light originally gated destructive commands with declarative `ask` rules in
`settings.json` (e.g. `Bash(rm:*)`). Phase 4 portability testing on Windows found
these brittle: when Claude Code runs a deletion via a PowerShell cmdlet
(`Remove-Item`) rather than `rm`, a rule written as `Bash(rm:*)` does not match,
and the command falls through to the generic permission prompt (or, in some
configurations, runs ungated). Adding per-spelling rules
(`Bash(Remove-Item:*)`, `Bash(del:*)`, ...) was tested and still proved
unreliable: pattern-matching command *spellings* cannot robustly cover every way
a deletion can be expressed.

A PreToolUse hook inspects the actual command string before execution and decides
`allow` / `ask` / `deny` with arbitrary logic. It catches the destructive
*operation* regardless of spelling, and per the Claude Code permission model
(`deny` > `ask` > `allow`, hooks evaluated alongside rules) it works even under
`bypassPermissions` / `--dangerously-skip-permissions`, which skip interactive
confirmations but not hooks.

### Design principles

- **Fail closed.** Any error, unparseable input, or uncertainty returns `ask`,
  never `allow`. A malfunction can never silently wave a destructive command
  through. (Verified by the malformed-input cases in the test suite.)
- **`ask`, never `deny`.** The hook prompts for confirmation; it never hard-blocks.
  The user can always proceed deliberately, so the hook cannot wedge the workflow.
- **Spelling-agnostic.** Gates file/dir deletion across `rm`, `rmdir`, `unlink`,
  `Remove-Item`, the `ri` alias, `rd`, `del`, `erase`, and the
  `[System.IO.File|Directory]::Delete` .NET form, plus destructive git
  (`reset --hard`, `branch -d/-D`, `push --force`/`-f`/`--force-with-lease`,
  `clean -f`).
- **Conservative on false positives.** Matches destructive operations as tokens
  (with separators / word boundaries), so it does not fire on innocent commands
  that merely contain a substring (e.g. `npm`, a filename like `alarm.txt` or
  `deleteme.ts`, or `rm` appearing only inside a commit message string).
- **Bash-only.** Non-Bash tools (Read, Write, etc.) pass through untouched.

### Registration

Save the script to your hooks directory (mirroring however your machine already
invokes Node for hooks). On the reference Windows setup:

`C:\Users\<you>\.claude\hooks\gsd-destructive-guard.mjs`

Then register it as a `PreToolUse` hook with a `Bash` matcher in
`~/.claude/settings.json` (user scope, so it protects all projects). It sits as a
sibling of any other hook events (e.g. `SessionStart`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/<you>/.claude/hooks/gsd-destructive-guard.mjs\""
          }
        ]
      }
    ]
  }
}
```

Use the same Node-invocation form your machine already uses for other working
hooks (explicit `node.exe` path, forward slashes, escaped quotes on Windows).
Restart Claude Code after editing settings; hooks load at session start.

### Relationship to the `ask` rules

The hook supersedes the per-spelling destructive `ask` rules. The rules may be
left in place as harmless redundancy (they agree with the hook: both resolve to
`ask`), or removed once the hook is confirmed working. Credential protection is a
separate concern and stays as `deny` rules (`Read(**/.env)`, `Read(**/.sfdx/**)`,
etc.) — those work reliably and are not replaced by this hook.

### Testing

`test-guard.mjs` is a regression suite that runs the hook as a subprocess and
asserts the `permissionDecision` for 41 cases: deletions in every spelling,
destructive git, innocent commands that contain destructive substrings (must
`allow`), non-Bash tools (must `allow`), and malformed input (must `ask`,
fail-closed). No real commands are executed — only the hook's *decision* is
checked, by feeding JSON on stdin.

```
node test-guard.mjs
```

Expected: `41 passed, 0 failed`.

### Verifying a live install (defeating silent failure)

After registering the hook, do **not** treat "a prompt appeared" as proof it
fired — the generic permission prompt or an existing `ask` rule can produce a
similar prompt without the hook running. Instead, test a deletion spelling that
**no** `ask` rule covers (e.g. `erase` or `unlink`). If the confirmation prompt
cites the hook by name and reason —
`Hook PreToolUse:Bash ... Destructive operation detected: erase (deletion)` —
the hook is genuinely firing. Also confirm a safe command (e.g. `npm --version`)
runs without a destructive-operation prompt, to check there are no false
positives in the live wiring.

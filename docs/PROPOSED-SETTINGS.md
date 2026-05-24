# Proposed settings.json permissions (PROPOSED — not active)

**Status: proposal for review.** This block is the declarative backing for the
confirmation gates in `gsd-execute-phase` and `gsd-ship`. It is intentionally
**not** written to `.claude/settings.json` yet — it is to be reviewed and
activated in the hooks/permissions phase. Until then the gates rest on the
skills' scoped grants and normal permission prompts; this block makes them
deterministic.

Precedence in Claude Code permissions is `deny` > `ask` > `allow`, so the rules
below cannot be overridden by any per-skill or per-agent `allow`.

## Proposed permissions block

```json
{
  "permissions": {
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/.sfdx/**)",
      "Read(**/.sf/**)",
      "Read(**/.ssh/**)",
      "Read(**/.aws/**)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(git push --force:*)",
      "Bash(git push --force-with-lease:*)",
      "Bash(git reset --hard:*)",
      "Bash(git branch -D:*)",
      "Bash(gh pr create:*)",
      "Bash(rm:*)"
    ]
  }
}
```

## What each rule backs

- **`deny` on credential reads** — protects `.env` (and `.env.*`), `.sfdx`,
  `.sf`, `.ssh`, `.aws` from being read into a prompt, even by a skill or agent
  that holds a broad `Read` grant (e.g. gsd-execute-phase). `deny` outranks every
  `allow`, so a poisoned project file cannot cause secret inlining.
- **`ask` on destructive git** — `git push`, force variants, `reset --hard`, and
  `branch -D` prompt for confirmation. Backs the irreversible-git portion of both
  the gsd-execute-phase and gsd-ship confirmation gates.
- **`ask` on PR creation (`gh pr create`)** — prompts for confirmation. Backs the
  PR-creation portion of the gsd-ship confirmation gate.
- **`ask` on `rm`** — deletions prompt for confirmation. Backs the deletion
  portion of the gsd-execute-phase gate.

Note: `Bash(git push:*)` already matches force variants by prefix; the explicit
`--force` / `--force-with-lease` entries are listed for reviewer clarity, not
because the prefix rule misses them.

## Gate coverage (gap now closed)

- **PR creation (`gh pr create`)** — previously flagged as unbacked, now closed:
  `"Bash(gh pr create:*)"` is in the `ask` list above, so PR creation is
  deterministically confirmation-gated to match the gate gsd-ship claims.
- "Finalization" in gsd-ship is fully covered: its irreversible parts are
  `git push` and PR creation, both `ask`-gated above. Local `git add` /
  `commit` / `tag` are non-destructive and intentionally ungated.
- Every confirmation gate claimed by gsd-execute-phase (deletions, destructive
  git) and gsd-ship (git push, PR creation) now has a backing `ask` rule in the
  proposed block.

## Not included here (by design)

- `allow` rules are not enumerated in this block: per-skill and per-agent tool
  access is governed by each component's own `allowed-tools` (least privilege).
  This proposal covers only the `deny`/`ask` guardrails that must hold globally.
- Path containment (no writes outside the project tree) is also a settings-layer
  `deny` concern per the architecture; it is left for the same hooks/permissions
  phase and is not part of this gate-backing proposal.

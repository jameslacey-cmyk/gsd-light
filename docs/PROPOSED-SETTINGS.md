# settings.json permissions (ACTIVATED 2026-05-25)

> **STATUS: ACTIVATED at USER scope on 2026-05-25, validated by direct
> behavioural test.** These rules were activated in the work machine's user
> config (`~/.claude/settings.json`), not in this repository. The live config
> is on the user's machine; this file remains a documentation/audit record of
> what was activated and how it was validated — it is **not** a settings file
> to commit.
>
> **Why user scope.** Activating at user scope means the credential `deny`
> rules protect *all* Claude Code work on the machine, not just this project —
> a poisoned file in any project cannot cause secret inlining. Permission rules
> **merge across scopes** (user + project + local), and `deny` takes precedence
> over every `allow` in any scope, so the user-scope guardrails cannot be
> loosened by a project- or local-scope `allow`.
>
> **Validation results (2026-05-25, direct behavioural test):**
> - **`deny` on credential reads confirmed blocking** — reads of `.env` and the
>   real `.sfdx` directory were blocked, not merely prompted.
> - **`ask` on `rm` confirmed prompting** — fired on both the **bare** form
>   (`rm <path>`) and **compound** forms (e.g. `rm` chained in a single
>   command). The earlier suspicion that compound commands bypassed the `ask`
>   rule was disproven by this test.
> - **`ask` on `git push` confirmed prompting.**
> - **Coverage widened:** an additional `Read(**/*.env)` deny was added so any
>   `.env`-*suffixed* file (e.g. `prod.env`, `local.env`) is also denied, not
>   only files literally named `.env` or `.env.*`. Reflected in the block below.

This block is the declarative backing for the confirmation gates in
`gsd-execute-phase` and `gsd-ship`. Precedence in Claude Code permissions is
`deny` > `ask` > `allow`, so the rules below cannot be overridden by any
per-skill or per-agent `allow`.

## Activated permissions block

```json
{
  "permissions": {
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/*.env)",
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

- **`deny` on credential reads** — protects `.env` (and `.env.*`, plus any
  `.env`-suffixed file via `**/*.env`), `.sfdx`, `.sf`, `.ssh`, `.aws` from
  being read into a prompt, even by a skill or agent that holds a broad `Read`
  grant (e.g. gsd-execute-phase). `deny` outranks every `allow`, so a poisoned
  project file cannot cause secret inlining. Confirmed blocking (not just
  prompting) for `.env` and the real `.sfdx` directory in the 2026-05-25 test.
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
  activated block.

## Not included here (by design)

- `allow` rules are not enumerated in this block: per-skill and per-agent tool
  access is governed by each component's own `allowed-tools` (least privilege).
  This block covers only the `deny`/`ask` guardrails that must hold globally.
- Path containment (no writes outside the project tree) is also a settings-layer
  `deny` concern per the architecture; it is not yet activated and remains
  deferred to a later hardening pass, separate from this gate-backing record.

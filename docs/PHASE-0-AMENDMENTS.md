# Phase 0 Amendments — docs/ARCHITECTURE.md

Audit trail for the approved Phase 0 review changes. Each entry lists the
finding(s) resolved, what changed, and where. Findings not listed (F6, F7, F12,
F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F23, F24) were deferred or
dismissed and were not touched.

## Changes applied

### F1 — Single authority for current position
- ROADMAP.md section: removed the "current phase" pointer bullet; added a line
  stating ROADMAP does not record the current phase and that position lives
  solely in `STATE.current_phase`. Removed "the pointer is advanced by
  gsd-ship" from its "Written by" line.
- STATE.md section: annotated `current_phase` as "the single authoritative
  record of which phase is active. No other file stores this."
- Command table: `gsd-ship` "Writes" changed from `ROADMAP (pointer), STATE` to
  `STATE`; its responsibility reworded from "advance the roadmap pointer" to
  "advance the position to the next phase."

### F2 — Confirmation gates backed by a real mechanism
- Confirmation gates section: replaced "enforced by hooks" with native
  permission `ask`/`deny` rules in `settings.json` (examples: `ask` on
  `Bash(git push *)`, `Bash(gh pr create *)`, deletion commands), noting these
  take precedence over `allow`, and that OS-level Bash sandboxing is an optional
  additional hardening layer.

### F3 — verify-work reads the work under test
- Command table: `gsd-verify-work` "Reads" now includes "the built source code
  under test."

### F4 — ship gates on verification
- Command table: `gsd-ship` "Reads" now includes "the verification report."
- New "Verification gate and rework" subsection states ship reads the report
  and refuses to ship a phase whose most recent verification did not pass.

### F5 — needs_rework state and transition
- STATE.md `phase_status` enum now includes `needs_rework`.
- New "Verification gate and rework" subsection describes the transition: a
  failed verification sets `needs_rework`, the loop returns to
  `gsd-execute-phase` (status back to `executing`) to address failures before
  re-verifying.

### F8, F9, F10 — prose/table reader reconciliation
- PROJECT.md "Read by" changed to `gsd-discuss-phase, gsd-plan-phase` (matches
  the table; was the inaccurate "all planning and execution commands").
- REQUIREMENTS.md "Read by" now includes `gsd-discuss-phase` (the table already
  granted it).
- STATE.md "Read by" changed to "every command at start except gsd-new-project,
  which creates it."

### F11 — no parallel executors in the current contract
- Command table: `gsd-execute-phase` "Delegates to" changed from
  "none (or parallel executors, see below)" to "none."
- Added a paragraph stating execution is serial in this version and parallel
  execution is a deliberate future enhancement, not part of the current
  contract. "Three subagents" remains accurate (researcher, planner, verifier).

### Item 8 — permissions model rewrite
- Renamed "Hooks (deterministic guardrails)" to "Permissions and guardrails"
  and rewrote it: least-privilege via scoped `allow` rules
  (`Write(.planning/**)` for gsd-planner; no `Write` for gsd-verifier, which
  returns its result for the command to persist), credential protection via
  `deny` rules (`Read(**/.env)` etc.), destructive-command gating via `ask`
  rules, precedence `deny` > `ask` > `allow`, and hooks reserved only for logic
  not expressible as a declarative rule. OS-level Bash sandboxing noted as
  optional.

## Self-check

- STATE is the only home for `current_phase`: confirmed (ROADMAP defers to it;
  STATE annotated authoritative).
- No "pointer" remains in ROADMAP: confirmed — the word "pointer" no longer
  appears anywhere in the document.
- verify-work reads source: confirmed (table row updated).
- ship gates on the verification report: confirmed (table read + rework
  subsection).
- needs_rework exists with a described transition: confirmed.
- Prose and table agree on reads for PROJECT, REQUIREMENTS, STATE, CONTEXT:
  confirmed.
- No "parallel executor" delegation text remains; "Three subagents" consistent:
  confirmed.
- Permissions model names concrete allow/deny/ask examples: confirmed.

## Could not fully reconcile (left in place to stay within the nine items)

- The Purpose section still lists the system's primitives as "skills,
  subagents, and hooks." After Item 8, declarative permission rules in
  `settings.json` are the primary guardrail and hooks are residual; the Purpose
  line does not mention permission rules. Left unchanged as out of scope for the
  approved items — flag for a follow-up wording pass if desired.
- The Subagents section still describes gsd-planner's write scope and
  gsd-verifier's no-write/test-execution grant in its own words. This is
  consistent with (not contradictory to) the rewritten Permissions section, but
  the two now state the same constraints in two places. Left unchanged to avoid
  editing beyond Item 8's target section.
- ROADMAP.md "Read by: most commands" was left as-is (its fix, F17, was not
  approved). It is not contradicted by the table (readers: discuss, plan, ship),
  so it is imprecise rather than inconsistent.

## Follow-up fixes

- Updated the Purpose primitives list to "skills, subagents, declarative
  permission rules, and hooks" (rules primary, hooks secondary), and added a
  cross-reference in the Subagents section tying the planner/verifier grants to
  the Permissions and guardrails section. Resolves follow-up items 1 and 2 noted
  above.

## Phase 2a resolutions (2026-05-24)

Recorded in ARCHITECTURE.md after building the four non-destructive skills:

- **F18 (state-file naming) resolved.** Named the phase plan and verification
  report `PLAN-NN.md` and `VERIFICATION-NN.md` (zero-padded phase number),
  phase-numbered and retained as an audit trail. Added a state-files subsection
  and updated the command table (plan-phase writes `PLAN-NN.md`; execute-phase
  and verify-work read it; verify-work writes `VERIFICATION-NN.md`; ship reads
  it). `CONTEXT.md` stays per-phase overwrite (working scratch); plan and
  verification are deliberately not overwritten.
- **F7 (phase_status ownership) resolved.** Added a "Phase status ownership"
  transition table assigning every status to one owning command
  (new-project→not_started, discuss→discussed, plan→planned,
  execute→executing, verify→verifying/needs_rework, ship→shipped). Noted the one
  gap: after ship advances the pointer, no command re-initialises the next phase
  to `not_started` (its first recorded status is `discussed`).
- **Agent dispatch standard recorded.** Subagents are invoked via the `Agent`
  tool (renamed from `Task` in Claude Code v2.1.63); skills scope spawns with
  `Agent(agent_type)`. Documented the three delegating skills' grants
  (gsd-new-project → researcher; gsd-plan-phase → researcher + planner;
  gsd-verify-work → verifier) and that gsd-discuss-phase has no dispatch.

## Phase 2b gap closures (2026-05-24)

Closed two gaps flagged while building the confirmation-gated skills:

- **Unbacked PR-creation gate closed.** Added `"Bash(gh pr create:*)"` to the
  `ask` list in `PROPOSED-SETTINGS.md` and moved it out of the "gates not yet
  backed" section into the active proposed block (now retitled "Gate coverage").
  Every confirmation gate claimed by gsd-execute-phase (deletions, destructive
  git) and gsd-ship (git push, PR creation) now has a backing `ask` rule.
  `PROPOSED-SETTINGS.md` remains a proposal; no `.claude/settings.json` was
  created or activated.
- **execute-phase rework read reconciled.** Updated the command table's
  gsd-execute-phase "Reads" cell to include `VERIFICATION-NN.md (on rework)`,
  and reconciled the prose (the `VERIFICATION-NN.md` "read by" line now lists
  gsd-execute-phase on a rework loop, and the Verification gate and rework
  paragraph states it reads the report). Contract and skill behavior now agree.

## Calibration spike drift fix (2026-05-24)

Found during the calibration spike: two skills predated the F18 resolution and
still referenced the old non-numbered, overwrite-per-phase file names, drifting
from the architecture's phase-numbered retention naming (`PLAN-NN.md`,
`VERIFICATION-NN.md`).

- **gsd-plan-phase: `PLAN.md` → `PLAN-NN.md`.** Updated the Reads/writes line,
  the gsd-planner delegation instruction, and the procedure step to name
  `.planning/PLAN-NN.md` with `NN` resolved from `STATE.current_phase`
  (zero-padded). Rewrote the Notes from "per-phase and overwritten each phase"
  to "per-phase and RETAINED — one file per phase as an audit trail, not
  overwritten (unlike CONTEXT.md)."
- **gsd-verify-work: `PLAN.md` → `PLAN-NN.md` and `VERIFICATION.md` →
  `VERIFICATION-NN.md`.** Updated the Reads/writes line and the two procedure
  steps (brief the verifier from `PLAN-NN.md`; write `VERIFICATION-NN.md`), with
  `NN` resolved from `STATE.current_phase`, and noted the report is retained per
  phase, not overwritten.
- **Other four skills checked.** gsd-execute-phase and gsd-ship already used the
  `-NN` names; gsd-new-project and gsd-discuss-phase reference neither file. No
  non-numbered `PLAN.md`/`VERIFICATION.md` reference remains in any of the six
  skills. `CONTEXT.md` (correctly overwrite-per-phase) was left unchanged.
- **Scope.** Only file-naming references and the Notes wording changed; no
  workflow logic, read/write contracts, delegation structure, or tool grants
  were altered. All six skills now agree with the architecture's retention
  naming.

## Memory-injection isolation constraint (2026-05-24)

Found during the same calibration spike: gsd-verifier reported a false PASS on
deliberately-broken code. The cause was isolated to the `claude-mem` plugin
(`thedotmack/claude-mem`), which injects cross-session memory into the session
and polluted the verifier's supposedly-isolated context with stale memory of
the previously-correct code — so it confabulated a pass instead of reporting
the failing test suite. With `claude-mem` disabled, the same blind verification
on the same broken code correctly FAILED, named the failing test, and diagnosed
the regression to the line (`todo.py:38`, `int` vs `bool`), setting
`needs_rework`.

- **Finding.** GSD-Light's subagents depend on genuine context isolation. Any
  tool/plugin injecting cross-session memory or shared context silently defeats
  it; the concrete failure mode is a verifier false PASS judged from stale
  remembered state rather than the current files and test results.
- **Constraint added.** A new "CRITICAL — the guarantees depend on genuine
  subagent context isolation" caveat under ARCHITECTURE.md's "Verified
  capability facts and their limits", sitting alongside the `bypassPermissions`
  caveat (both describe conditions that void the guarantees silently). It names
  `claude-mem` specifically, states the false-PASS consequence, gives the plain
  disable rule, and flags a SessionStart enforcement check as a candidate for
  the hooks/permissions phase.
- **Decision.** Keep `claude-mem` disabled; GSD-Light is run without
  memory-injection plugins.
- **Scope.** Documentation only — no skills, agents, or settings changed.

## Phase 3 — permission layer activated and validated (2026-05-25)

The proposed permission rules moved from proposal to live. Activated at **USER
scope** (`~/.claude/settings.json` on the work machine) and validated by direct
behavioural test on 2026-05-25. The live config lives on the user's machine, not
in this repo, so this is an audit record only — no `.claude/settings.json` was
created or modified in the repository.

- **Activated at user scope, deliberately.** User scope was chosen so the
  credential `deny` rules protect *all* Claude Code work on the machine, not
  just this project. Permission rules merge across scopes (user + project +
  local) with `deny` taking precedence over every `allow`, so the user-scope
  guardrails cannot be loosened by a project- or local-scope `allow`.
- **Validation results.** `deny` on credential reads confirmed **blocking**
  (not merely prompting) reads of `.env` and the real `.sfdx` directory; `ask`
  confirmed **prompting** on `rm` (both bare and compound forms) and on
  `git push`.
- **Coverage widened.** Added `Read(**/*.env)` to the deny list so any
  `.env`-suffixed file (e.g. `prod.env`) is covered, not only files literally
  named `.env` or `.env.*`. Recorded in `PROPOSED-SETTINGS.md`, now retitled to
  ACTIVATED with the validation results and user-scope rationale.
- **Corrected misdiagnosis.** A suspected compound-command bypass of the `ask`
  rules was investigated and **disproven** by direct test: `rm` fires the `ask`
  prompt on both bare (`rm <path>`) and compound (chained in a single command)
  forms. The earlier suspicion was wrong; no bypass exists.
- **Scope.** Documentation/audit only — the activation happened in the user's
  machine config; this repo's `PROPOSED-SETTINGS.md` and this log were updated
  to record it.

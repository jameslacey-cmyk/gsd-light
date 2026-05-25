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

## Phase 4 — portability test on a second machine + real codebase (2026-05-25)

GSD-Light was installed and run end-to-end on a second Windows machine (Claude
Code 2.1.150) against a real codebase (a TypeScript/Node poker engine), and a
follow-on plugin-compatibility test was run on the primary work machine. Findings
recorded below; the plugin-compatibility result is recorded in ARCHITECTURE.md
("Verified capability facts and their limits", alongside the `claude-mem` caveat).

- **PORTABILITY CONFIRMED.** GSD-Light installs by copying `.claude/skills` and
  `.claude/agents` into a target project; the agents and skills load correctly on
  a second machine (Claude Code 2.1.150) with no machine-specific changes. The
  full loop was validated end-to-end on a real codebase: discuss → plan → execute
  → verify-FAIL → rework → verify-PASS → ship, including a deliberate immutability
  regression that the verifier correctly caught (FAIL) before the rework. The
  copy-in install model and the no-absolute-paths portability principle both hold
  in practice.
- **WINDOWS DELETION GAP (observation).** On Windows, Claude Code may execute
  deletions via PowerShell cmdlets (`Remove-Item`) rather than `rm`, which the
  Unix-style `Bash(rm:*)` `ask` rule does **not** match — so a deletion can run
  without firing the confirmation gate. Mitigation applied on the test machines:
  add `Bash(Remove-Item:*)`, `Bash(del:*)`, `Bash(rmdir:*)` to the `ask` list.
  This is brittle — it pattern-matches command spellings and will miss aliases,
  full paths, or other invocation forms — and is further evidence that a
  PreToolUse hook is the robust cross-platform fix for destructive-command gating
  (see follow-ons below).
- **EXECUTE-SCOPE DEFAULT TOO NARROW (observation + recommended follow-on).**
  `gsd-execute-phase`'s default allowed-tools write scope `Write(src/**)` /
  `Edit(src/**)` does not cover projects that keep tests in a separate `tests/`
  directory, and the Bash allowlist lacked `npx tsc` for TypeScript typechecking.
  Per-project widening was required on the test machine: added `Write(tests/**)`,
  `Edit(tests/**)`, and `Bash(npx tsc:*)`. Not changed in the source skill in
  this pass (documentation-only) — see follow-ons.
- **DENY-GLOB ABSOLUTE-PATH NUANCE (observation, low priority).** Credential
  `deny` rules (e.g. `Read(**/.aws/**)`) reliably match relative / in-project
  paths — which is the realistic agent case, since a poisoned project file induces
  a relative read — but did **not** match a hand-typed Windows absolute path in
  testing. Low priority because real usage is relative; recorded as a known edge,
  not a recommended change.
- **SUB-EFFORT SCOPING NEEDS A FIRM HAND (observation).** When `gsd-new-project`
  is run inside a mature repo with a large `CLAUDE.md`, it initially gravitates
  toward planning the whole project rather than the single feature being added. It
  scopes correctly only when given an explicit boundary ("this is the only goal,
  do not roadmap the broader project"). For feature-addition use in an existing
  codebase, supply that boundary explicitly when starting the project. Recorded as
  a usage note; no skill change recommended at this time.

### Recommended source follow-ons vs. recorded observations

Distinguishing what should be folded back into the source repo from what is just
recorded here:

- **RECOMMENDED — fold into the source repo:**
  1. **Broaden `gsd-execute-phase`'s default write scope and Bash allowlist.**
     Either widen the source default beyond `src/**` to cover a separate `tests/`
     tree (and add `Bash(npx tsc:*)` for TypeScript typechecking), or document
     per-project scope tuning as an explicit setup step. (From EXECUTE-SCOPE
     above. Not applied in this documentation-only pass.)
  2. **Build the PreToolUse destructive-command hook.** The robust, cross-platform
     fix for destructive-command gating — independent of command spelling
     (`rm` vs `Remove-Item` vs `del`/`rmdir`, aliases, absolute paths) — rather
     than extending the brittle per-spelling `ask` list. (From WINDOWS DELETION
     GAP above; reinforces the hook candidacy already noted for the
     hooks/permissions phase.) **RESOLVED 2026-05-25 — see "Destructive-command
     hook built and validated" below.**
- **RECORDED OBSERVATIONS — no source change recommended now:** the deny-glob
  absolute-path nuance (low priority, real usage is relative) and the sub-effort
  scoping behaviour (handled by supplying an explicit scope boundary at project
  start). The Windows per-spelling `ask` additions were applied on the test
  machines as an interim mitigation but are superseded by follow-on #2.

- **Scope.** Documentation only — no skills, agents, or settings files in this
  repo were modified. In particular, `gsd-execute-phase`'s allowed-tools were not
  changed; the scope widening is recorded as a recommendation only.

## Destructive-command hook built and validated (2026-05-25)

Closes Phase 4 recommended follow-on #2. The robust, cross-platform replacement
for the brittle per-spelling destructive `ask` rules is now built, tested, and
committed to this repo under `hooks/`.

- **What was built.** A Claude Code **PreToolUse** hook with a `Bash` matcher at
  `hooks/gsd-destructive-guard.mjs`. It inspects the actual command string and
  gates destructive operations *regardless of spelling or chaining*: file/dir
  deletion across `rm`, `rmdir`, `unlink`, `Remove-Item`, the `ri` alias, `rd`,
  `del`, `erase`, and the `[System.IO.File|Directory]::Delete` .NET form, plus
  destructive git (`reset --hard`, `branch -d`/`-D`, `push --force`/`-f`/
  `--force-with-lease`, `clean -f`). This catches the destructive *operation*
  rather than matching one spelling at a time, which was the failure mode of the
  declarative rules on Windows.
- **Fail-closed, ask-never-deny.** Any error, unparseable input, or uncertainty
  returns `ask`, never `allow` — a malfunction can never silently wave a
  destructive command through. The hook only ever returns `ask` (it prompts for
  confirmation), never `deny`, so the user can always proceed deliberately and the
  hook cannot wedge the workflow.
- **Validated by a regression suite.** `hooks/test-guard.mjs` runs the hook as a
  subprocess and asserts the `permissionDecision` for **41 cases** (deletions in
  every spelling, destructive git, innocent commands containing destructive
  substrings → `allow`, non-Bash tools → `allow`, malformed input → `ask`). It
  passes on Windows (`41 passed, 0 failed`); no real commands are executed, only
  the decision is checked.
- **Live-verified on the work machine.** Confirmed genuinely firing via the
  `erase` discriminator test — a deletion spelling **no** `ask` rule covers — so a
  prompt can only come from the hook; the prompt cited the hook by name with its
  distinctive reason (`Destructive operation detected: erase (deletion)`).
  `npm --version` was run to confirm no false positives in the live wiring.
- **Harness portability bug found and fixed during validation.** On Windows,
  `new URL(import.meta.url).pathname` yields a broken `/C:/...` path (leading
  slash, URL-encoded), which broke the hook's self-path resolution. Fixed by using
  `fileURLToPath()` from `node:url` instead. Recorded here because it is a general
  Windows gotcha for any `.mjs` hook that resolves its own path.
- **Registration is not duplicated here.** The PreToolUse/`Bash`-matcher
  registration (user scope, Node-invocation form, live-verification procedure)
  lives in `hooks/README.md`; refer to it rather than re-stating it.

### Per-spelling `ask` rules now superseded (but retained)

The per-spelling destructive `ask` rules in `settings.json`
(`Bash(rm:*)`, `Bash(Remove-Item:*)`, `Bash(del:*)`, `Bash(rmdir:*)`, …) are now
**superseded by the hook**, which gates the same operations more robustly. They
are **retained as harmless redundancy**: both the rules and the hook resolve to
`ask`, so they agree and do not conflict. They may be removed later once the hook
is fully trusted, but there is no need to. The **credential `deny` rules are
unaffected** — secret protection (`Read(**/.env)`, `Read(**/.sfdx/**)`, etc.)
remains a separate concern handled by `deny` rules, not by this hook.

- **Scope.** This entry is documentation only. The hook, its test, and its README
  were committed under `hooks/`; no skill, agent, or `settings.json` was modified
  in this pass.

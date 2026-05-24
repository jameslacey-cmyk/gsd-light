# Phase 0 Review — docs/ARCHITECTURE.md

Validation of the design contract for internal consistency and completeness.
No code, skills, agents, or hooks were created. All proposed changes are for
approval; ARCHITECTURE.md was not edited.

Severity: **High** (contract is internally contradictory or a stated guarantee
is unbacked), **Medium** (real gap/inconsistency that will force a guess during
implementation), **Low** (wording, minor ambiguity, or stylistic drift).
Confidence: my certainty the finding is real, not a misread.

---

## Strict checks requested

- **Every command's "reads" traces to an earlier "writes": PASSES.** Every
  state file named in a "reads" cell is written by an earlier command
  (`PROJECT/REQUIREMENTS/ROADMAP` by new-project; `CONTEXT` by discuss; phase
  plan by plan; `STATE` by all). `gsd-new-project` reads only "user input",
  which is not a state file. The literal dependency check is clean. The
  problems below are the *reverse* (files written but not read by the command
  that needs them) and *prose-vs-table* mismatches.
- **phase_status forms a coherent lifecycle: PARTIALLY.** The six values can be
  count-matched to commands, but transitions are never assigned to commands,
  there is no failure/rework state, and the tense is mixed (see F5–F7).
- **One responsibility per command: MOSTLY.** Four commands are clean;
  new-project and ship are arguable (F14, F15).
- **Subagent grants match least-privilege: MOSTLY.** Grants are conservative,
  but two of three rely on enforcement mechanisms the document does not provide
  (F12, F13).

---

## High

### F1 — Two sources of truth for the current phase (conf: High)
`STATE.md` is titled "the single source of truth for 'where are we'" and holds
`current_phase`. But `ROADMAP.md` also holds "A 'current phase' pointer", and
`gsd-ship`'s "Writes" cell is `ROADMAP (pointer), STATE`. The current phase is
therefore stored in two files and updated in two places, directly contradicting
the single-source-of-truth claim. Risk: divergence if one write succeeds and
the other does not.
**Proposed:** Make `STATE.current_phase` authoritative; redefine ROADMAP's
"pointer" as either derived/display-only or remove it. Drop `ROADMAP` from
ship's "Writes" if the pointer goes away, or explicitly mark the ROADMAP
pointer as a non-authoritative mirror.

### F2 — Confirmation gates claimed as hook-enforced, but no such hook exists (conf: High)
The Confirmation gates section states irreversible actions (git push, PR
creation, file/branch deletion) are "enforced by hooks, not left to
instructions." The Hooks section defines only two hooks: a write-path-boundary
block and a credential-read block. Neither gates git/PR/deletion actions (which
run via Bash), so the stated guarantee is currently unbacked by any described
mechanism.
**Proposed:** Add a third hook to the Hooks section: a PreToolUse hook matching
irreversible Bash actions (e.g. `git push`, `gh pr create`, `rm`, branch
deletion) that requires confirmation, and reconcile the claim in Confirmation
gates with it.

### F3 — gsd-verify-work cannot read the work it must verify (conf: High)
Its responsibility is "Check built work against the phase's requirements," yet
its "Reads" are `REQUIREMENTS, the phase plan, STATE`. The built artifacts /
source code produced by `gsd-execute-phase` are not in its reads. Verification
of unread work is not possible.
**Proposed:** Add the built work / source code (and likely the project tree) to
gsd-verify-work's "Reads" cell.

---

## Medium

### F4 — Verification report is an orphan write; ship has no pass gate (conf: High)
`gsd-verify-work` writes "a verification report," but no command's "Reads" cell
references it. `gsd-ship` reads only `STATE, ROADMAP`, so nothing in the
contract forces ship to confirm verification passed before advancing the
pointer. The loop can ship unverified or failed work.
**Proposed:** Either have ship read the verification report (or a STATE flag
set from it) and gate on a pass, or document that the pass/fail is recorded in
`STATE` and ship refuses to advance unless `phase_status` indicates a pass.

### F5 — Lifecycle has no failure/rework or "verified" state (conf: High)
`phase_status` is `{not_started, discussed, planned, executing, verifying,
shipped}`. `gsd-verify-work` "returns structured pass/fail," but there is no
status for a *failed* verification, and none for *verified-but-not-yet-shipped*.
The loop ("discuss -> plan -> execute -> verify -> ship") implies looping back
on failure, but no status represents "needs rework" or what phase it reverts to.
**Proposed:** Add states such as `verified` (pass, pre-ship) and
`changes_requested`/`failed` (rework), and document the loop-back target.

### F6 — phase_status tense is mixed, making each value ambiguous (conf: Med)
`discussed/planned/shipped` are completion (past) states; `executing/verifying`
are in-progress (present) states. A reader cannot tell whether a value means
"this step is happening now" or "this step is done." E.g. does `planned` mean
planning finished, parallel to `executing` meaning execution underway?
**Proposed:** Pick one convention (recommend completion-tense throughout:
`discussed, planned, executed, verified, shipped`) or add a one-line definition
of what each value asserts.

### F7 — Status-transition ownership is undocumented (conf: High)
The doc lists the enum but never states which command sets which value. The
"coherent lifecycle" is only inferable (discuss→discussed, plan→planned, …).
For a design contract this should be explicit.
**Proposed:** Add a small table or note mapping each command to the
`phase_status` it sets on completion, including who sets `not_started`.

### F8 — Prose/table mismatch: PROJECT.md readers (conf: High)
PROJECT.md says "Read by: all planning and execution commands."
`gsd-execute-phase` is an execution command, but its "Reads" cell
(`the phase plan, CONTEXT, STATE`) omits `PROJECT`.
**Proposed:** Either add `PROJECT` to execute's reads or narrow the prose to
the commands that actually read it.

### F9 — Prose/table mismatch: REQUIREMENTS.md readers (conf: High)
REQUIREMENTS.md says "Read by: gsd-plan-phase, gsd-verify-work." But
`gsd-discuss-phase`'s "Reads" cell includes `REQUIREMENTS`. Either the prose
under-lists discuss, or the table over-grants it.
**Proposed:** Reconcile — add discuss to the prose, or remove REQUIREMENTS from
discuss's reads if discuss does not actually need it.

### F10 — Prose/table mismatch: STATE.md readers (conf: High)
STATE.md says "Read by: every command at start." `gsd-new-project`'s "Reads"
cell is `user input` only — and logically it cannot read STATE before it
creates it.
**Proposed:** Change the prose to "Read by: every command except
gsd-new-project (which creates it)."

### F11 — Dangling "parallel executors" reference (conf: Med)
`gsd-execute-phase`'s "Delegates to" cell says "none (or parallel executors,
see below)." There is no "below": the Subagents section defines exactly three
agents (researcher, planner, verifier) and opens with "Three subagents." No
parallel-executor agent or its tool grant is specified.
**Proposed:** Either define the parallel-executor subagent (purpose + tools +
update the "Three subagents" count) or remove the parenthetical and the
"(see below)".

### F12 — gsd-planner "Write scoped to .planning/" has no stated enforcement (conf: Med)
The planner is granted "Write scoped to `.planning/`." The only write-related
hook blocks paths *outside the project tree*, not writes outside `.planning/`
within the tree, and a native tool grant of `Write` is not path-scopable to a
subdirectory on its own. So the `.planning/`-only scope is asserted but
unenforced.
**Proposed:** State the enforcement mechanism (e.g. a PreToolUse hook that, for
the planner agent, blocks writes whose resolved path is outside `.planning/`),
or soften the claim to "instructed to write only into `.planning/`."

### F13 — gsd-verifier "scoped test-execution" mechanism unspecified vs "Never Bash(*)" (conf: Med)
Running tests requires an execution tool (Bash). The design forbids `Bash(*)`
but allows scoped grants. The verifier's "scoped test-execution only" does not
say *how* it is scoped (e.g. a command-prefix allowlist like
`Bash(npm test:*)`), so least-privilege compliance can't be confirmed.
**Proposed:** Specify the allowlist form used to scope the verifier's execution
grant.

---

## Low

### F14 — gsd-new-project arguably has more than one responsibility (conf: Med)
Principle 1 says "Each skill does exactly one thing," but new-project produces
PROJECT, REQUIREMENTS, and ROADMAP (three distinct elicitation concerns) plus
initializes STATE. It is materially heavier than the other five.
**Proposed:** Either explicitly frame its one responsibility as "bootstrap a
new project's specs" (and note the exception to the granularity of the others),
or consider splitting spec authoring from roadmap sequencing.

### F15 — gsd-ship responsibility reads as two actions (conf: Med)
"Finalize the phase **and** advance the roadmap pointer." The conjunction
suggests two responsibilities.
**Proposed:** Reword to a single concept (e.g. "Close out the current phase,
advancing the position to the next") or confirm these are one atomic action.

### F16 — Unclear whether gsd-verifier writes the verification report (conf: Med)
gsd-verify-work (command) "Writes a verification report," but the gsd-verifier
(subagent) grant lists "Read, plus scoped test-execution only" with no Write.
Presumably the verifier returns its summary and the command writes the file —
which is good for the "judge cannot alter the work" separation — but this is
not stated.
**Proposed:** Add one sentence: the verifier returns a structured result; the
command persists the report. Confirms no Write grant is needed by the agent.

### F17 — ROADMAP.md "Read by: most commands" overstates (conf: High)
Only discuss, plan, and ship read ROADMAP per the table — 3 of 6. "Most" is
inaccurate.
**Proposed:** Replace with the explicit list.

### F18 — Phase plan and verification report naming/retention unspecified (conf: Med)
CONTEXT.md is explicitly "overwritten each phase," but the phase plan file and
verification report have no stated naming convention or retention. Unclear
whether per-phase history is kept (e.g. `phase-N-plan.md`) or overwritten.
**Proposed:** State a naming convention (phase-numbered, relative to
`.planning/`) and whether prior phases' plans/reports are retained.

### F19 — Two decision stores with undefined relationship (conf: Med)
Decisions are captured in `CONTEXT.md` (per-phase, overwritten) and also in
`STATE.decision_log` (append-only). Since CONTEXT is overwritten each phase,
the relationship between the two — and which is the durable record — is
undefined.
**Proposed:** Define the split (e.g. CONTEXT holds the working per-phase detail;
durable cross-phase decisions are appended to STATE.decision_log by which
command).

### F20 — "Six commands ... looping" conflates bootstrap with the per-phase loop (conf: Med)
The per-phase loop is five commands (discuss → plan → execute → verify → ship);
new-project runs once per project. Calling it "Six commands, run in order,
looping …" blurs that.
**Proposed:** Separate "gsd-new-project (one-time bootstrap)" from "the
five-command per-phase loop."

### F21 — Command naming convention drifts (conf: Low)
`gsd-discuss-phase / gsd-plan-phase / gsd-execute-phase` use `-phase`, but
`gsd-verify-work` uses `-work`, and `gsd-ship` / `gsd-new-project` follow yet
another shape. Minor, but a contract is a good place to fix naming.
**Proposed:** Consider `gsd-verify-phase` for symmetry, or note the convention
is intentional.

### F22 — gsd-researcher is local-only but delegated at new-project time (conf: Low)
The researcher's tools are Read/Grep/Glob (local). At new-project ("turn an
idea into specs") there may be little local material, and "research" sometimes
implies external lookup, for which no tool is granted.
**Proposed:** Confirm research is intentionally local-only, or note where
external input comes from. (Likely intentional given the no-network posture.)

### F23 — Initialization and reset of phase_status unstated (conf: Low)
Who sets `not_started` initially (presumably new-project), and does ship reset
the *next* phase's status to `not_started` when it advances the pointer? Not
documented.
**Proposed:** State both in the F7 transition mapping.

### F24 — Credential deny-list is tool-specific and may block project-local files (conf: Low)
The deny-list (`.sfdx`, `.sf`, `.ssh`, `.aws`, `.env`) includes Salesforce-
specific entries in a tool that markets itself as generic/portable, and a
project-local `.env` would be read-blocked. Not wrong (it is a security
deny-list), but worth a deliberate note.
**Proposed:** Confirm the list is an intentional security default; optionally
note `.env` blocking applies even to project-local copies.

---

## Self-check

- **Reads → writes:** Traced all six commands' "reads" cells; every state-file
  read maps to an earlier write. Strict check passes (F1, F3, F4, F8–F10 are
  reverse-direction or prose mismatches, not violations of this check).
- **phase_status transitions:** Reviewed all six values. No transition is
  assigned to a command anywhere in the doc (F7); no failure/rework or
  verified-pre-ship state exists (F5); tense is mixed (F6). I inferred the
  intended mapping but could not *verify* it from the text.
- **Subagent tool grants:** Reviewed all three (researcher, planner, verifier).
  Researcher is clean. Planner's and verifier's scoping rely on mechanisms the
  doc does not specify (F12, F13).

**Could not verify:**
- Whether Claude Code natively supports path-scoped `Write` grants or only
  hook-based enforcement — F12 assumes the latter. If native scoping exists,
  F12 softens to a documentation nit.
- Whether "parallel executors" (F11) are a planned feature or stray text — no
  definition exists to check against.
- The intended authority between `STATE.current_phase` and the ROADMAP pointer
  (F1) — the doc asserts both, so I flagged the contradiction rather than
  resolving it.

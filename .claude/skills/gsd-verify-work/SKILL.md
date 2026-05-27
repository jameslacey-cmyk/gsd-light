---
name: gsd-verify-work
description: >-
  Check the built work for the current phase against its requirements, then
  write the verification report and update STATE. It delegates the actual
  judging to the gsd-verifier subagent (which reads the source and runs the
  tests in isolation and cannot modify anything), then persists the result. On a
  failed verification it sets phase_status to needs_rework so the loop returns to
  execution.
allowed-tools: Read(.planning/**), Write(.planning/**), Agent(gsd-verifier)
---

# gsd-verify-work

Single responsibility: check built work against the phase's requirements and
record the outcome. Nothing else. This skill never modifies source.

## Reads / writes (per the architecture command table)

- Reads: `.planning/REQUIREMENTS.md`, the phase plan (`.planning/PLAN-NN.md`,
  where `NN` is the zero-padded `current_phase` from STATE), the built source
  code under test, and `.planning/STATE.md`. The built source is read by
  gsd-verifier on this command's behalf (see Delegation); this skill's own
  reads are confined to `.planning/`.
- Writes: a verification report (`.planning/VERIFICATION-NN.md`, same
  zero-padded `NN`) and `.planning/STATE.md`.

## Delegation — state it explicitly; do not infer it

- **Delegate to gsd-verifier** via the Agent tool. Pass it `REQUIREMENTS.md`, the
  phase plan, and a pointer to the built work. It reads the source and runs the
  project's tests in isolated context and returns a structured pass/fail with
  diagnosed failures.
- Do **not** inspect source or run tests yourself, and do **not** fix any
  failure here. The separation is deliberate: the component that judges the work
  must not be able to alter it, and neither must this skill. Fixes happen in
  gsd-execute-phase.

Act directly only for: reading the planning files, writing the verification
report from the verifier's returned result, and updating STATE.

## Procedure

1. Read `STATE.md` for `current_phase`; set `phase_status` to `verifying` and
   refresh `last_updated`.
2. Read `REQUIREMENTS.md` and `PLAN-NN.md` (NN = zero-padded `current_phase`
   from step 1) to brief the verifier.
3. Delegate to gsd-verifier; collect its structured pass/fail result.
4. Write `.planning/VERIFICATION-NN.md` (NN = zero-padded `current_phase`) from
   the returned result: overall pass/fail, per-requirement status, and each
   failure's diagnosis. Record the verifier's scope findings under a distinct
   `## Scope` heading in the report, kept separate from the correctness results.
   The report is retained per phase as an audit trail, not overwritten.
5. Update `STATE.md`:
   - On a correctness **failure**, set `phase_status` to `needs_rework`. The loop
     then returns to gsd-execute-phase, which sets `phase_status` back to
     `executing` and addresses the diagnosed failures before this skill runs
     again.
   - Apply the scope escalation: if the verifier's scope findings include files
     the plan did not anticipate (unplanned files), treat it as a failure and set
     `phase_status` to `needs_rework`, even when every correctness check passed.
     Scope findings that are only in-file churn (changes within files the plan
     named) are recorded in the report but do not block the pass.
   - On a **pass** with no blocking scope findings, leave `phase_status` as
     `verifying`; the report records the pass, and gsd-ship gates on that report
     before finalizing.
   - Append the verification outcome (date, decision, rationale) to
     `decision_log`.

## Constraints

- All paths relative, under `.planning/`. No absolute or home-directory paths.
- Tools: Read and Write scoped to `.planning/**`; Agent restricted to
  gsd-verifier only. No Bash — test execution belongs to gsd-verifier, not here.

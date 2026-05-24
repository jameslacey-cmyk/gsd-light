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

- Reads: `.planning/REQUIREMENTS.md`, the phase plan (`.planning/PLAN.md`), the
  built source code under test, and `.planning/STATE.md`. The built source is
  read by gsd-verifier on this command's behalf (see Delegation); this skill's
  own reads are confined to `.planning/`.
- Writes: a verification report (`.planning/VERIFICATION.md`) and
  `.planning/STATE.md`.

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
2. Read `REQUIREMENTS.md` and `PLAN.md` to brief the verifier.
3. Delegate to gsd-verifier; collect its structured pass/fail result.
4. Write `.planning/VERIFICATION.md` from the returned result: overall pass/fail,
   per-requirement status, and each failure's diagnosis.
5. Update `STATE.md`:
   - On **failure**, set `phase_status` to `needs_rework`. The loop then returns
     to gsd-execute-phase, which sets `phase_status` back to `executing` and
     addresses the diagnosed failures before this skill runs again.
   - On **pass**, leave `phase_status` as `verifying`; the report records the
     pass, and gsd-ship gates on that report before finalizing.
   - Append the verification outcome (date, decision, rationale) to
     `decision_log`.

## Constraints

- All paths relative, under `.planning/`. No absolute or home-directory paths.
- Tools: Read and Write scoped to `.planning/**`; Agent restricted to
  gsd-verifier only. No Bash — test execution belongs to gsd-verifier, not here.

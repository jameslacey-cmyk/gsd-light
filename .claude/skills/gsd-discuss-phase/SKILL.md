---
name: gsd-discuss-phase
description: >-
  Capture the implementation decisions for the current phase into CONTEXT.md and
  update STATE. Run this before planning a phase, to pin down API shapes, data
  structures, layouts, error handling, and edge cases while they are fresh. Acts
  directly — it does not delegate to any subagent.
allowed-tools: Read(.planning/**), Write(.planning/**)
---

# gsd-discuss-phase

Single responsibility: capture the implementation decisions for the current
phase. Nothing else.

## Reads / writes (per the architecture command table)

- Reads: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`,
  `.planning/ROADMAP.md`, `.planning/STATE.md`.
- Writes: `.planning/CONTEXT.md`, `.planning/STATE.md`.

## Procedure

1. Read `STATE.md` to learn `current_phase`, then read the current phase's goal
   and requirement numbers from `ROADMAP.md`, the requirements from
   `REQUIREMENTS.md`, and the fixed context from `PROJECT.md`.
2. Discuss with the user the implementation decisions for this phase only: API
   shapes, data structures, layouts, error handling, and edge cases. Where the
   user does not specify, apply a reasonable default and record it as such.
3. Write `CONTEXT.md` — the decisions for the current phase. `CONTEXT.md` is
   per-phase and overwritten each phase, so it reflects only the current phase.
4. Update `STATE.md`: set `phase_status` to `discussed`, refresh `last_updated`,
   and append any notable decision (with date and rationale) to `decision_log`.

## Delegation

None. This skill works directly with the user. Do not invoke gsd-researcher or
any other subagent — the command table specifies no delegation for this command.

## Constraints

- All paths relative, under `.planning/`. No absolute or home-directory paths.
- Tools: Read and Write scoped to `.planning/**`. No Bash, no Task.

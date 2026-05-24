---
name: gsd-plan-phase
description: >-
  Produce a small, executable plan for the current phase. Run after the phase
  has been discussed. It explicitly delegates twice — first to gsd-researcher to
  gather context, then to gsd-planner to write the phase plan into .planning/ —
  and then updates STATE itself. Use it whenever a phase needs a plan before
  execution.
allowed-tools: Read(.planning/**), Write(.planning/**), Agent(gsd-researcher), Agent(gsd-planner)
---

# gsd-plan-phase

Single responsibility: produce a small, executable plan for the current phase.
Nothing else.

## Reads / writes (per the architecture command table)

- Reads: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`,
  `.planning/ROADMAP.md`, `.planning/CONTEXT.md`, `.planning/STATE.md`.
- Writes: a phase plan file (`.planning/PLAN-NN.md`, where `NN` is the
  zero-padded `current_phase` from STATE, written by gsd-planner) and
  `.planning/STATE.md` (written by this skill).

## Delegation — state it explicitly; do not infer it

Opus 4.7 will not delegate on its own, so both delegations are mandatory steps:

1. **Delegate to gsd-researcher (first).** Invoke it via the Agent tool to gather
   context for `current_phase`. It is read-only and returns a findings summary.
   Do not gather this context yourself — that is the researcher's job, run in
   isolated context to keep this session small.
2. **Delegate to gsd-planner (second).** Invoke it via the Agent tool, passing
   the researcher's findings plus the phase goal (ROADMAP), the requirements,
   and the phase's CONTEXT. Instruct it to write the plan to
   `.planning/PLAN-NN.md`, where `NN` is the zero-padded `current_phase` from
   STATE (for example `PLAN-01.md`).
   Do not write the plan yourself — gsd-planner owns plan authoring and is the
   only component scoped to write it.

Act directly only for: reading the planning files to brief the subagents, and
updating STATE after the plan is written.

## Procedure

1. Read `STATE.md` for `current_phase`, then read PROJECT, REQUIREMENTS,
   ROADMAP, and CONTEXT for that phase.
2. Delegate to gsd-researcher (step 1 above); collect the findings summary.
3. Delegate to gsd-planner (step 2 above); it writes `.planning/PLAN-NN.md`,
   with `NN` resolved from `STATE.current_phase` (read in step 1).
4. Update `STATE.md`: set `phase_status` to `planned`, refresh `last_updated`,
   and append any notable planning decision (date, rationale) to `decision_log`.

## Notes

- `PLAN-NN.md` is per-phase and RETAINED — named by the zero-padded phase
  number (resolve `NN` from `STATE.current_phase`), one file per phase as an
  audit trail. Unlike CONTEXT.md it is **not** overwritten each phase. The
  plan's steps must trace to the requirement numbers they satisfy.

## Constraints

- All paths relative, under `.planning/`. No absolute or home-directory paths.
- Tools: Read and Write scoped to `.planning/**`; Agent restricted to
  gsd-researcher and gsd-planner only. No Bash. This skill never writes source.

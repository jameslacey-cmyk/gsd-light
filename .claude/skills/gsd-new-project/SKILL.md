---
name: gsd-new-project
description: >-
  Turn a project idea into the initial GSD-Light planning files — PROJECT.md,
  REQUIREMENTS.md, ROADMAP.md, and an initial STATE.md — under .planning/. Run
  once at the start of a project. May optionally delegate to the gsd-researcher
  subagent to gather context before drafting. Do not run it on a project that
  already has a .planning/ project; it stops and asks first rather than
  overwrite.
allowed-tools: Read(.planning/**), Write(.planning/**), Agent(gsd-researcher)
---

# gsd-new-project

Single responsibility: turn an idea into `PROJECT.md`, `REQUIREMENTS.md`,
`ROADMAP.md`, and an initial `STATE.md`. Nothing else.

## Reads / writes (per the architecture command table)

- Reads: the user's idea (from conversation). It is the project bootstrap, so
  there are no prior state files to read.
- Writes: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`,
  `.planning/ROADMAP.md`, `.planning/STATE.md`.

Pre-flight guard (not a data input): before writing, check whether
`.planning/PROJECT.md` already exists. If it does, stop and ask the user before
doing anything — PROJECT.md is written once and must not be silently
overwritten.

## Procedure

1. Pre-flight: if `.planning/PROJECT.md` exists, stop and confirm with the user.
2. Draw out the idea: name, one-paragraph purpose, target users/stakeholders,
   hard constraints (stack, compliance, non-negotiables), and what is explicitly
   out of scope.
3. Optionally delegate to gsd-researcher (see Delegation) if external/codebase
   context would materially improve the requirements or roadmap.
4. Write `PROJECT.md` (the vision and fixed context).
5. Write `REQUIREMENTS.md`: numbered functional and non-functional requirements,
   each with verifiable acceptance criteria.
6. Write `ROADMAP.md`: the ordered list of phases, each with a short title, a
   one-to-two-sentence goal, and the requirement numbers it satisfies. ROADMAP
   does not record the current phase — that lives only in `STATE.current_phase`.
7. Write the initial `STATE.md` (see State block).

## Delegation

- Delegate to **gsd-researcher** (optional) via the Agent tool when context
  beyond the user's idea would sharpen requirements or phase ordering — for
  example when bootstrapping inside an existing codebase. It is read-only and
  returns a findings summary; it writes nothing.
- Act directly for everything else. Drafting PROJECT/REQUIREMENTS/ROADMAP and
  writing STATE is this skill's own work — do not delegate authoring.

## State block

`STATE.md` holds a single JSON object inside a fenced code block. Initialize it
pointing at the first phase, not started:

```json
{
  "current_phase": 1,
  "phase_status": "not_started",
  "decision_log": [],
  "last_updated": "<ISO-8601 timestamp>"
}
```

`current_phase` is the sole authoritative record of position. Append any
significant bootstrap decisions (with date and rationale) to `decision_log`.

## Constraints

- All paths relative to the project root, under `.planning/`. No absolute or
  home-directory paths.
- Tools: Read and Write are scoped to `.planning/**`; Agent restricted to
  gsd-researcher only. No Bash.

---
name: gsd-ship
description: >-
  Finalize the current phase and advance the position to the next phase. Run
  after gsd-verify-work has produced a passing verification. It gates hard on the
  verification report — it REFUSES to ship a phase whose latest verification did
  not pass — and it advances current_phase in STATE only (it does not write a
  pointer to ROADMAP). Finalization may push or open a PR, which are irreversible
  and require confirmation. It does not delegate.
allowed-tools: Read(.planning/**), Write(.planning/STATE.md), Bash(git add:*), Bash(git commit:*), Bash(git tag:*), Bash(git push:*), Bash(gh pr create:*)
---

# gsd-ship

Single responsibility: finalize the current phase and advance the position.
Nothing else.

## Reads / writes (per the architecture command table)

- Reads: `.planning/VERIFICATION-NN.md` (the verification report),
  `.planning/STATE.md`, and `.planning/ROADMAP.md`.
- Writes: `.planning/STATE.md` only. It advances `current_phase`. It does **not**
  write a current-phase pointer to `ROADMAP.md` — position lives solely in
  `STATE.current_phase`.

## The verification gate — refuse to ship a failed phase

Read `VERIFICATION-NN.md` for the current phase. **If the latest verification
did not pass, refuse to ship**: do not advance `current_phase`, do not change
`phase_status`, and tell the user the phase must go back through
gsd-execute-phase / gsd-verify-work. Only proceed when the report records a pass.

## Phase status (per the transition table, closing the Phase 2a gap)

On a passing verification and user confirmation:

1. Record phase `NN` as `shipped` in `decision_log` (date, decision, rationale).
2. If `ROADMAP.md` has a next phase, advance `current_phase` to it and set
   `phase_status` to `not_started`, so every phase begins from the same clean
   state as the first. (This closes the Phase 2a gap where no command
   re-initialised a newly advanced phase.)
3. If there is no next phase, the milestone is complete: leave `phase_status` at
   `shipped` and do not advance `current_phase`.
4. Refresh `last_updated`.

## Procedure

1. Read `STATE.md` (`current_phase`), `ROADMAP.md`, and `VERIFICATION-NN.md`.
2. Apply the verification gate above; stop if it did not pass.
3. Confirmation gate (see below) for any irreversible finalization step.
4. Update `STATE.md` per Phase status, then perform the confirmed finalization
   (commit the STATE advance; optionally tag, push, open PR).

## Delegation

None. gsd-ship has no `Agent` grant.

## Confirmation gate (settings-layer enforced, not instruction-only)

`git push`, PR creation, and any other irreversible finalization must stop and
confirm with the user before running. This does not rely on this instruction
alone: these actions are gated by `ask`/`deny` rules at the `settings.json`
layer (see `docs/PROPOSED-SETTINGS.md`), where `deny` outranks `ask` outranks
`allow`.

## Tool grants (scoped; rationale per grant)

- `Read(.planning/**)`: reads STATE, ROADMAP, and the verification report. It
  does not read source.
- `Write(.planning/STATE.md)`: the only file it writes — the STATE advance. It
  cannot write ROADMAP or any other planning file.
- `Bash(git add:*)`, `Bash(git commit:*)`, `Bash(git tag:*)`: commit/tag the
  finalized STATE locally (non-destructive).
- `Bash(git push:*)`, `Bash(gh pr create:*)`: publish the phase. These are
  irreversible and are confirmation-gated by the `ask` rules at the settings
  layer. Never a bare `Bash`. `reset --hard`, `branch -D`, and `rm` are not
  granted.

## Constraints

- All paths relative and portable. No absolute or home-directory references.

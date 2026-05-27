---
name: gsd-execute-phase
description: >-
  Build the current phase against its plan (PLAN-NN.md), writing source code and
  updating STATE. Run after the phase has been planned, or when a phase has
  looped back from a failed verification (needs_rework) to address the diagnosed
  failures. This is the only skill that writes source, so its grants are broader
  than the planning skills — but still scoped, never bare. It does not delegate.
allowed-tools: Read, Write(src/**), Edit(src/**), Write(.planning/STATE.md), Bash(npm install:*), Bash(npm ci:*), Bash(npm run build:*), Bash(npm test:*), Bash(npm run test:*), Bash(pnpm install:*), Bash(pnpm build:*), Bash(pnpm test:*), Bash(yarn install:*), Bash(yarn build:*), Bash(yarn test:*), Bash(pytest:*), Bash(python -m pytest:*), Bash(go build:*), Bash(go test:*), Bash(go run:*), Bash(cargo build:*), Bash(cargo test:*), Bash(cargo run:*), Bash(dotnet build:*), Bash(dotnet test:*), Bash(make:*)
---

# gsd-execute-phase

Single responsibility: build the current phase against its plan. Nothing else.

## Reads / writes (per the architecture command table)

- Reads: the phase plan (`.planning/PLAN-NN.md`), `.planning/CONTEXT.md`,
  `.planning/STATE.md`, and the project's existing source.
- On a rework loop only: also reads `.planning/VERIFICATION-NN.md` to learn the
  diagnosed failures it must address. (Note: the command table lists this read
  for verify/ship but not execute; it is required here for rework. See the
  discrepancy note at the end.)
- Writes: source code (project source roots, see Tool grants) and
  `.planning/STATE.md`.

## Phase status (per the transition table)

- At the start of a run, set `phase_status` to `executing` and refresh
  `last_updated`.
- This applies both to a first build and to a return from `needs_rework`: in
  both cases the phase is `executing` while this skill works.
- Leave `phase_status` as `executing` when done; gsd-verify-work moves it to
  `verifying` next.

## Procedure

1. Read `STATE.md` for `current_phase`; set `phase_status` to `executing`.
2. Read `PLAN-NN.md` and `CONTEXT.md` for the current phase. If `phase_status`
   was `needs_rework`, also read `VERIFICATION-NN.md` and treat its diagnosed
   failures as the work list.
3. Build the phase: write new source and edit existing source within the
   project's source roots, compiling/running as needed (see Tool grants).
4. Update `STATE.md`: keep `phase_status` at `executing`, refresh
   `last_updated`, and append any notable build decision (date, rationale) to
   `decision_log`.

## Build scope

Build only the minimum that satisfies the plan and the requirements it traces
to. A detailed plan describes the outcome; it is not a licence to build beyond
it. Add no speculative features, no configuration options nobody asked for, no
single-use abstractions, and no error handling for conditions that cannot occur.

If a requirement seems to need structure well beyond what the plan describes, do
not expand on your own. Append the tension to `decision_log` (date, the
mismatch, why it matters) and defer it back to plan/discuss, rather than
over-building here.

## Delegation

None. Execution is serial in this version (see the architecture's command
loop); this skill builds the phase itself and has no `Agent` grant.

## Confirmation gate (settings-layer enforced, not instruction-only)

Before any irreversible action — file or directory deletion, destructive git
(`reset --hard`, `branch -D`, force operations), or anything that loses work —
stop and confirm with the user. This gate does not rely on this instruction
alone: such commands are not in this skill's Bash allowlist, and they are
additionally gated by `ask`/`deny` rules at the `settings.json` layer (see
`docs/PROPOSED-SETTINGS.md`), where `deny` outranks `ask` outranks `allow`.

## Tool grants (scoped; rationale per grant)

- `Read` (project-wide): needed to read existing source it will modify, plus the
  planning files. Credential paths are denied at the settings layer
  (`Read(**/.env)`, etc.).
- `Write(src/**)` and `Edit(src/**)`: write new source and modify existing
  source. **Source layout is project-specific** — `src/**` is the default; a
  target project MUST adjust these to its real source roots (for example
  `lib/**`, `app/**`, `packages/**`, `tests/**`). Never broaden to bare `Write`
  or `Write(**)`, and never add `.planning/**` here.
- `Write(.planning/STATE.md)`: the only `.planning/` file this skill may write.
  It deliberately cannot write `PLAN-NN.md`, `CONTEXT.md`, or any other planning
  file owned by other commands.
- `Bash(... :*)` test/build/run prefixes: scoped to dependency install
  (`npm install`, `npm ci`, `pnpm/yarn install`), build/compile (`npm/pnpm/yarn
  run build`, `go build`, `cargo build`, `dotnet build`, `make`), and run/test
  during development (`*/test`, `pytest`, `go test`/`go run`, `cargo
  test`/`cargo run`, `dotnet test`/`dotnet run`). Prune this list to the stack
  the target project actually uses. Never a bare `Bash`. `rm`, destructive git,
  and `git push` are deliberately not granted.

## Constraints

- All paths relative and portable. No absolute or home-directory references.
- Final pass/fail judging is gsd-verifier's job (via gsd-verify-work), not this
  skill's; tests run here are for building, not for the verification record.

## Command-table discrepancy to flag

The command table's `gsd-execute-phase` "Reads" cell lists `PLAN-NN.md, CONTEXT,
STATE` but not `VERIFICATION-NN.md`. Addressing a `needs_rework` loop requires
reading `VERIFICATION-NN.md`. Recommend updating that cell to include
`VERIFICATION-NN.md (on rework)` in a future ARCHITECTURE.md pass.

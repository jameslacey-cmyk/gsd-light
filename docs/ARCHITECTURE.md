# GSD-Light Architecture

## Purpose

GSD-Light is a lightweight, spec-driven development workflow for Claude Code
(Opus 4.7), built entirely on native Claude Code primitives: skills, subagents,
declarative permission rules, and hooks. Permission rules are the primary
guardrail; hooks are secondary, reserved for logic that cannot be expressed as
a rule. It has no custom CLI, SDK, installer, or runtime. It runs under Claude
Code's normal permission model and is never run with
`--dangerously-skip-permissions`.

It solves "context rot" (quality degradation as a context window fills) by
keeping the orchestrating session small and delegating heavy work to
fresh-context subagents, and it preserves continuity across sessions by writing
structured state to a `.planning/` directory in the target project.

## Design principles

1. One responsibility per command. Each skill does exactly one thing.

2. Least privilege. Every skill and subagent requests the minimum tools it
   needs. Never `Bash(*)`.

3. State lives on disk, not in the context window. Any session can rebuild
   orientation by reading `.planning/`.

4. Portability. No absolute paths, no home-directory assumptions, no
   machine-specific configuration. The system works unchanged when copied to
   another machine.

5. Explicit over inferred. Because Opus 4.7 follows instructions literally and
   delegates to subagents less aggressively by default, delegation intent and
   instruction scope are always stated explicitly.

## State files

All state lives in a `.planning/` directory at the root of the target project.
`.planning/` is git-ignored in tooling repos and is treated as working state,
not source.

Structured status data uses JSON. Narrative content uses Markdown.

### PROJECT.md (narrative, written once, updated rarely)

The vision and fixed context for the project.

- Project name and one-paragraph purpose

- Target users / stakeholders

- Hard constraints (tech stack, compliance, non-negotiables)

- Explicitly out of scope

Read by: gsd-discuss-phase, gsd-plan-phase. Written by: gsd-new-project.

### REQUIREMENTS.md (narrative + checklist)

What "done" means for the whole project.

- Numbered functional requirements

- Numbered non-functional requirements (security, performance, accessibility)

- Acceptance criteria per requirement, phrased so they can be verified

Read by: gsd-discuss-phase, gsd-plan-phase, gsd-verify-work. Written by:
gsd-new-project, amended only with user confirmation.

### ROADMAP.md (narrative, ordered)

The sequence of phases from start to milestone.

- Ordered list of phases, each with: a short title, a one-to-two sentence
  goal, and the requirement numbers it satisfies

ROADMAP.md does not record which phase is current; that position lives solely
in `STATE.current_phase`.

Read by: most commands. Written by: gsd-new-project.

### STATE.md (structured, the single source of truth for "where are we")

Current position and the decision log.

- `current_phase` (integer) — the single authoritative record of which phase is
  active. No other file stores this.

- `phase_status` (one of: not_started, discussed, planned, executing,
  verifying, needs_rework, shipped)

- `decision_log`: append-only list of {date, decision, rationale}

- `last_updated`

This file is JSON inside a fenced code block within the Markdown, so it is
both human-readable and machine-parseable.

Read by: every command at start except gsd-new-project, which creates it.
Written by: every command, at end.

### CONTEXT.md (narrative, per-phase, overwritten each phase)

The implementation decisions for the current phase only.

- Decisions captured during gsd-discuss-phase (API shapes, data structures,
  layouts, error handling, edge cases)

- "Reasonable defaults" applied where the user did not specify

Read by: gsd-plan-phase, gsd-execute-phase. Written by: gsd-discuss-phase.

## The command loop

Six commands, run in order, looping discuss -> plan -> execute -> verify ->
ship per phase until a milestone is complete.

| Command            | Single responsibility                              | Reads                                  | Writes                          | Delegates to        |
|--------------------|----------------------------------------------------|----------------------------------------|---------------------------------|---------------------|
| gsd-new-project    | Turn an idea into PROJECT, REQUIREMENTS, ROADMAP   | user input                             | PROJECT, REQUIREMENTS, ROADMAP, STATE | gsd-researcher (optional) |
| gsd-discuss-phase  | Capture implementation decisions for one phase     | PROJECT, REQUIREMENTS, ROADMAP, STATE  | CONTEXT, STATE                  | none                |
| gsd-plan-phase     | Produce a small, executable plan for one phase     | PROJECT, REQUIREMENTS, ROADMAP, CONTEXT, STATE | a phase plan file, STATE | gsd-researcher, gsd-planner |
| gsd-execute-phase  | Build the phase against its plan                   | the phase plan, CONTEXT, STATE         | source code, STATE              | none                |
| gsd-verify-work    | Check built work against the phase's requirements  | REQUIREMENTS, the phase plan, the built source code under test, STATE | a verification report, STATE | gsd-verifier        |
| gsd-ship           | Finalize the phase and advance the position to the next phase | STATE, ROADMAP, the verification report | STATE                  | none                |

Execution is serial in this version: `gsd-execute-phase` builds the phase
itself and delegates to no subagent. Parallel execution across independent plan
steps is a deliberate future enhancement and is not part of the current
contract.

### Verification gate and rework

`gsd-verify-work` writes its pass/fail result to the verification report and
records the outcome in `STATE`. On a failure it sets `phase_status` to
`needs_rework`; the loop then returns to `gsd-execute-phase`, which sets
`phase_status` back to `executing` and addresses the diagnosed failures before
`gsd-verify-work` runs again. `gsd-ship` reads the verification report and
refuses to ship a phase whose most recent verification did not pass.

### Confirmation gates

`gsd-execute-phase` and `gsd-ship` must pause and confirm with the user before
any irreversible action (git push, PR creation, file or branch deletion). These
gates are enforced by native permission rules in `settings.json`: destructive
operations are matched by `ask` or `deny` rules (for example `ask` on
`Bash(git push *)`, `Bash(gh pr create *)`, and the file- and branch-deletion
commands), which take precedence over any `allow` rule. They are declarative
settings, not instructions the model can talk itself out of. OS-level
sandboxing of the Bash tool is available as an optional additional hardening
layer.

## Subagents

Three subagents in `.claude/agents/`, each running in isolated context.

- gsd-researcher: read-only. Gathers context on a phase and returns a findings
  summary. Tools: Read, Grep, Glob. No Write, no Bash.

- gsd-planner: reads research and roadmap, writes a phase plan into
  `.planning/`. Tools: Read, plus Write scoped to `.planning/`. No source
  writes, no Bash.

- gsd-verifier: checks built work against requirements, returns structured
  pass/fail with diagnosed failures. Tools: Read, plus scoped test-execution
  only. No Write to source. (This separation is deliberate: the thing that
  judges the work cannot alter the work.)

These tool grants must stay consistent with the Permissions and guardrails
section; an editor changing one must update the other.

## Permissions and guardrails

Guardrails are declarative permission rules in `settings.json` wherever
possible, because rules are deterministic and cannot be reasoned away by the
model. Precedence is `deny` over `ask` over `allow`.

- Least privilege via scoped `allow` rules. Each skill and subagent is granted
  only the tools it needs, scoped as narrowly as possible. `gsd-planner` is
  granted `Write(.planning/**)` and no broader write access; `gsd-verifier` is
  granted no `Write` at all — it returns its result for the command to persist,
  so the thing that judges the work cannot alter it.

- Credential protection via `deny` rules. Reads of sensitive credential paths
  are denied (for example `Read(**/.env)`, and the equivalents for `.sfdx`,
  `.sf`, `.ssh`, and `.aws`), preventing a poisoned project file from causing
  secret inlining into a prompt. Because `deny` outranks `allow`, no broader
  grant can re-enable these reads.

- Destructive-command gating via `ask` rules. Irreversible operations require
  confirmation (for example `ask` on `Bash(git push *)`, `Bash(gh pr create *)`,
  and file- and branch-deletion commands), as described under Confirmation
  gates.

- Hooks are reserved for logic that cannot be expressed as a declarative rule.
  They block rather than warn, and are used only where a static allow/deny/ask
  pattern is insufficient.

OS-level sandboxing of the Bash tool is available as an optional additional
hardening layer on top of these rules.

### Verified capability facts and their limits

A Claude Code capability check confirmed the following, which bound what this
security model can and cannot promise.

- **CRITICAL — the guarantees depend on the parent session's permission mode.**
  All subagent tool restrictions, including gsd-verifier's no-write property,
  are void if the parent session runs in `bypassPermissions`
  (`--dangerously-skip-permissions`) or `acceptEdits` mode. These modes take
  precedence and cannot be overridden by a subagent. GSD-Light's security
  guarantees therefore depend, as a hard prerequisite, on never running the
  parent session in either mode (consistent with the Purpose section's
  commitment never to use `--dangerously-skip-permissions`).

- **Subagent tool restriction is restrictive, not additive.** A subagent
  declared with a `tools` allowlist may use only the tools on that list. Adding
  a tool is impossible; omitting one denies it. So omitting `Write` from an
  agent's allowlist is sufficient to deny writing under the normal permission
  model — which is exactly how gsd-verifier is kept unable to alter the work.

- **Subagents inherit the parent's working directory and cannot be scoped to a
  narrower directory per-agent.** Per-agent path containment (for example,
  preventing any write outside the project tree) cannot be expressed in the
  agent definition itself. It must be enforced at the `settings.json` deny-rule
  layer during the hooks/permissions phase, not per-agent.

Future hardening option (not a current change): subagents also support a
`disallowed-tools` denylist. gsd-verifier could be given an explicit
`Write, Edit, MultiEdit` denial as defense-in-depth alongside its allowlist.
This is recorded as an option for a later phase, not adopted here.

## Non-goals

GSD-Light deliberately does not include: a multi-runtime installer, an npm
package, a WebSocket viewer, a standalone CLI, crypto/token anything, telemetry,
or auto-update. Adding any of these reintroduces the maintenance and security
burden this design exists to avoid.

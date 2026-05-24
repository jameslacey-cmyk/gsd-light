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

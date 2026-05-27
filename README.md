# GSD-Light

A lightweight, spec-driven way of working with Claude Code. It turns a build into a short, repeatable loop of named steps, so that every piece of work is discussed, planned, built, and independently checked before it ships.

You do not need to be a developer to use it. You do need to be comfortable running Claude Code and typing the occasional command. Everything else, the research, the planning, the writing of code, and the checking, is handled by the workflow.

New here? Start with the step-by-step walkthrough in [docs/USING-GSD-LIGHT.md](docs/USING-GSD-LIGHT.md). It explains the order of the steps, which is the one thing first-time users find confusing.

## Why it exists

Left to its own devices, an AI assistant will happily write a lot of code very quickly, and you are left to work out whether any of it is correct. GSD-Light slows that down in a deliberate, healthy way. It breaks every piece of work into the same sequence of steps, writes down what was agreed at each step, and then has a separate, independent check confirm the work actually meets the requirements before anything is considered done.

It was built on Claude Code's own native building blocks (skills, subagents, and a safety hook) after an earlier, similar tool was withdrawn. That history shaped a core design choice: GSD-Light has no custom installer, no separate program, and no outside dependency that can be changed or taken away. It is just a folder of files you copy into your project. What you see is what you get, and it keeps working regardless of what happens to anything else.

## What makes it different

- **Built on native Claude Code primitives.** No CLI, no SDK, no installer, nothing to break or be withdrawn. You install it by copying a folder. That is the whole mechanism.
- **An independent check that cannot cheat.** The part of the system that judges the work is separate from the part that builds it, and the judge has no ability to edit code. It can only run the tests and report what it finds. That separation is what makes a passing result actually mean something. The builder cannot mark its own homework.
- **Human in the loop, by design.** This is not an autonomous agent that disappears and returns with a finished product. You drive each step, read what it produces, and approve before moving on. It is built for people who want control and confidence, not just speed.
- **Real safety, not just good intentions.** Risky actions such as deleting files are gated by an actual permission check that pauses and asks, rather than relying on the model to be careful.
- **Grounded in sound principles.** The workflow reflects widely shared good practice for working well with AI coding assistants, the kind of disciplined fundamentals championed by leading figures in the field such as Andrej Karpathy (now at Anthropic): think before coding, keep it simple, make surgical changes, and define success so it can be verified rather than assumed.

## How it works, in one line

Discuss the work, plan the approach, build it, check it independently, and ship it only if the check passes. If the check fails, fix and check again. Then move to the next piece.

The full loop, the order of the six steps, and the handful of rules that keep it trustworthy are all explained in [docs/USING-GSD-LIGHT.md](docs/USING-GSD-LIGHT.md).

## Quick start

1. Copy the `.claude/skills` and `.claude/agents` folders into your project.
2. Open Claude Code in that project.
3. Run the first step, `/gsd-new-project`, and describe what you want to build.
4. Follow the loop from there. The walkthrough explains each step.

A short, sensible set of permission rules and a safety hook are included; see the walkthrough and the `hooks/` folder for how to enable them. Run GSD-Light under Claude Code's normal permission model. Never run it with `--dangerously-skip-permissions`; doing so removes the very safety checks the workflow relies on.

## A note on trust

The independent check is the heart of GSD-Light, so it is worth proving once on your own machine that it genuinely works (and that nothing in your setup quietly undermines it). The walkthrough includes a simple test for this: deliberately break something and confirm the check catches it. It takes a few minutes and it is the difference between hoping the check works and knowing it does.

## Learn more

- [docs/USING-GSD-LIGHT.md](docs/USING-GSD-LIGHT.md), the step-by-step walkthrough for first-time users.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), the design and the reasoning behind it.

# Using GSD-Light: a step-by-step walkthrough

This guide walks you through running GSD-Light from start to finish. It is written for people who are comfortable running Claude Code but are not necessarily developers. If you read one thing before starting, read the section on the order of the steps, because that is what trips up first-time users.

## The idea in a nutshell

GSD-Light breaks every piece of work into the same short loop. You run six commands, in order. Each one produces something you can read, and you stay in control at every step. The last step before anything is considered done is an independent check that the work actually meets what was asked. If the check fails, you loop back and fix it; if it passes, you ship.

That is the whole method. The rest of this guide is about running it smoothly.

## The six steps, in order

This is the part to get right. Run these in sequence. Do not skip ahead; each step sets up the next.

1. **`/gsd-new-project`** Sets up the work. You describe what you want; it captures the vision, the requirements, and a roadmap. This is also where you set the boundaries of the work (more on that below).
2. **`/gsd-discuss-phase`** Talks through the implementation choices for the current stage and records the decisions. You pick the options that fit; accept sensible defaults where you have no strong preference.
3. **`/gsd-plan-phase`** Researches your existing code and writes a concrete, ordered plan, naming exactly which files will be created or changed. Read the plan; it should match what you discussed.
4. **`/gsd-execute-phase`** Builds the work. This is the only step that writes code. Approve the prompts as they appear.
5. **`/gsd-verify-work`** Hands the work to the independent checker, which runs the tests on its own and confirms whether every requirement is met. This is your trust anchor. Read its verdict.
6. **`/gsd-ship`** Finalises the work, but only if the check passed. It refuses to ship work that failed or was never checked.

If verification fails at step 5, you do not start over. The work simply returns to step 4, you let it fix the diagnosed problem, and you run step 5 again. Round and round until it passes. That loop is the point: a pass is trustworthy precisely because failures are caught and fixed before shipping.

## Before you start

Two things to have ready.

First, a clear idea of one piece of work you want to get done. GSD-Light works best when each run has a single, well-defined goal.

Second, decide whether you are starting something new or adding to something that already exists. This matters:

- **Starting from scratch?** Just run `/gsd-new-project` and let it scope the whole thing. The whole project is the goal.
- **Adding one feature to an existing codebase?** Still start with `/gsd-new-project`, but say so explicitly, with a clear boundary. Add a sentence like: "This is the only goal. Do not plan the broader project." Without that boundary, GSD-Light will try to plan improvements to your entire codebase rather than the one thing you actually want. This is the single most common first-time mistake, and it is entirely avoidable.

## The most useful habit: branch first

Before you run GSD-Light on code you care about, create a separate branch in your version control. Everything the loop does then happens on that branch. If you are happy with the result, you keep it; if not, you discard the branch and your original is exactly as it was. This one habit removes almost all the risk of experimenting.

## A few rules that keep it trustworthy

None of these is complicated, but each one matters.

- **Let the independent check be the judge.** A successful build is not the same as meeting the requirements. Always let step 5 decide whether the work is done, not the build step's own report that it compiled. The whole point is that an independent check, not the builder, has the final say.
- **Keep memory plugins away from the checker.** Some plugins inject information from previous sessions. If one feeds the checker stale context, it may pass work that is actually broken, the most dangerous kind of failure, because it looks like success. If you use any memory or context plugin, prove the checker still works with the simple test below before you rely on it.
- **Read the prompts before approving.** A safety check pauses before risky actions, such as deleting files, and asks you to confirm. It only protects you if you actually read the prompt rather than approving on autopilot. A two-second glance is the whole safety mechanism.
- **Expect to allow a little more on real projects.** The build step starts with permission to write source files, but real projects often keep tests in a separate folder or need to run a compiler. When the build needs to do something the rules do not yet allow, you will be asked. Allow what makes sense for the project.

## Proving the check works (do this once)

Everything good about GSD-Light rests on the independent check being genuinely independent and honest. It is worth proving that once on your machine, especially if you use any memory or context plugins.

1. Build something small and correct, and run the check. Expect it to pass.
2. By hand, change the code so that something must now be wrong.
3. Start a fresh session and run only `/gsd-verify-work`. Say nothing about the change.
4. If the check reports a failure and names what broke, it is honest; you can trust it. If it still passes, a memory plugin is feeding it stale information; disable that plugin and try again.

A fresh session matters here, because the workflow's files are loaded when a session starts. If you change something and test it in the same session, you are testing the old version. When in doubt, start fresh.

## What a single run feels like

A short example, start to finish, for one small feature added to existing code.

You branch first, so the original is safe. You run `/gsd-new-project`, describe the feature, and add your boundary so it does not try to redesign everything. You run `/gsd-discuss-phase` and answer a question or two about how it should behave. You run `/gsd-plan-phase` and read the plan; it matches. You run `/gsd-execute-phase`, approve the prompts, and it builds. You run `/gsd-verify-work`. Suppose it finds a genuine problem; it reports a clear failure and the work returns to needing fixes. You run `/gsd-execute-phase` again to apply the fix, then `/gsd-verify-work` again, and this time it passes. You run `/gsd-ship`. Done.

Notice the rhythm: every step produced something you could read, you stayed in control throughout, and the independent check, not the builder, decided when it was done. The failure-and-fix in the middle is not an exception; it is the loop doing exactly what it exists to do.

## Going further: a coaching companion (optional)

Once you are comfortable with the loop, you may find it helpful to set up a separate Claude chat as a companion that coaches you through running GSD-Light. This is entirely optional, GSD-Light works on its own, but a companion can suggest the next step, sanity-check a plan before you build, help with version control, and remind you of the rules below. It plays the advisory role; Claude Code still runs the actual loop.

The simplest way to set this up is a Project in the Claude chat interface (separate from Claude Code), with standing instructions that describe the coaching role. A good set of instructions would tell the companion to:

- Act as a guide, not the builder. You run the loop in Claude Code; the companion advises.
- Take one careful step at a time, and prove changes with tests rather than assuming they work.
- Be clear about which commands go to Claude Code (the steps beginning with a slash) and which you type in your own terminal (version control, file operations).
- Watch for the common traps: testing an edit in the same session that made it (start fresh instead), and letting a memory plugin undermine the independent check (prove it with the test above).
- Be honest over agreeable, and flag when something looks risky before you do it.

You do not need this to use GSD-Light. But for involved work, a companion that holds the method in mind can make the loop smoother and catch mistakes earlier.

## Quick troubleshooting

- **It is trying to plan my whole codebase, not just my feature.** You did not set a boundary. Restate that your one feature is the only goal and it should not plan the broader project.
- **The build cannot write to a folder.** It needs a wider permission. Allow it to write to the relevant folder (often the tests folder), or approve the prompt asking for it.
- **The check passes on code I know is broken.** A memory plugin is likely interfering. Disable it, start a fresh session, and run the proving test above.
- **Ship refuses to finalise.** The check has not passed. Run the check, read what it says, fix via the build step, and check again until it passes. Ship gates on a passing check by design.

## In short

Discuss, plan, build, check independently, ship. Run the six steps in order, set a clear boundary, branch before you start, read the prompts, and let the independent check be the judge. That is GSD-Light.

# Playbook: kickoff (`start` → `build_start`)

Goal: leave this phase with a golden path short enough to build in ~4 hours,
an owner for every step, and a running skeleton deployed somewhere.

**Steps 1-4 and 7-8 are captain only.** If `<you>` is a member and the golden
path has no owners yet, help with step 5-6 (stack, scaffolding) or whatever
the captain asked, and wait for the golden path before building features.

1. Check `.claude/state/clock.md`. If any checkpoint is still a bare HH:MM,
   convert it to a full date-time (first occurrence after `start`). Ask the
   user for `deadline` if it is missing. Show the table once and move on.
2. Ask the user for the idea in one paragraph. If they have 2-3 candidates,
   compare them on three axes only: demo impact in 3 minutes, buildability in
   4 hours, and how much depends on external APIs. Recommend one.
3. Draft the golden path: 3-6 numbered steps, each a single user action and
   what the judge sees on screen. Use `../../state/golden-path.md` format.
   Mark each step `[LLM]` or `[API]` if it calls an external service.
4. Cut it. For each step ask: would the demo still make sense without it? If
   yes, move it to a "stretch" list at the bottom. Then assign an owner to
   each step, `(owner: <nickname>)`, spreading work so that each of the four
   gets roughly equal load and steps that share a screen share an owner.
   Get the captain's OK; this is the spec from now on.
5. Pick the stack for speed of the team, not novelty. Name each library the
   golden path needs; for any the user has not used before, call `how`.
6. Scaffold the app and render a placeholder for every golden-path screen,
   connected by real navigation, with hardcoded data.
7. Run `demo-path-verify` in setup mode to create the golden-path test. It
   should pass against the placeholders; that is the baseline.
8. Deploy the skeleton once (call `deploy`, or do it inline). Finding deploy
   problems in the first hour is cheap; after `freeze` it is fatal.
9. Check that `.claude/.gitignore` exists (it keeps evidence out of git),
   commit to `main`, give the user the push command
   (`git push origin main`), and after they push, remind them to have every
   teammate pull before `build_start`.

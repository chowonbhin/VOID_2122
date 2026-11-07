# Playbook: pitch (`pitch_start` → `deadline`)

Goal: slides, a demo script, and materials that match exactly what the app
does. Members draft narration and slide content for the steps they own; the
captain assembles the final deck and script. No code changes in this phase unless a golden-path step actually breaks.

1. Write the demo script from `golden-path.md`: one line of narration per
   step, plus a 20-second problem statement before and a 20-second "what's
   next" after. Total under the time limit with 30 seconds to spare.
2. Every claim in the script must be visible in the app. Remove claims about
   features that were cut.
3. Build the slides (PPT): problem, solution in one sentence, live demo
   (or the harden screenshots as backup), how it works (one architecture
   diagram), what's next. One idea per slide; put the screenshots from
   harden on the demo-backup slide in case the live demo fails.
4. Write the README / submission text: problem, what it does, how it works
   (stack, one architecture sentence), how to run. Short sentences; cut filler.
5. Do a full rehearsal with the reset script and the deployed URL. Then do one
   with the fallback flag on. Fix only wording or ordering, not code, unless a
   golden-path step actually breaks.
6. Final `handoff-<you>.md`: URLs, submission links, and the recovery card.

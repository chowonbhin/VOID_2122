# Playbook: fix (`fix_start` → `freeze`)

Goal: the golden path passes reliably, three runs in a row, on the deployed
URL as well as locally.

1. Run `demo-path-verify` three times. List every failure and every flaky step.
2. Triage each problem with one question: will the judges see it?
   - Yes: if you own the step, reproduce it, find the root cause, fix it,
     verify. If not, report it to the owner (via the user) with the evidence.
   - No: work around it, hide it, or leave it. Note it in `handoff-<you>.md`.
3. Fix in golden-path order, earliest failing step first, since later steps
   often fail because of earlier ones.
4. Look at the evidence screenshots, not just pass/fail. Broken layout, loading
   spinners that never end, placeholder text, and English/Korean mixups are
   golden-path bugs even when the test passes.
5. Make sure every `[LLM]`/`[API]` step has its fallback working before
   `freeze` (call `demo-safety`). Harden is only about an hour; there is no
   time to build fallbacks then.
6. One hour before `freeze`, the captain runs `scope-cut` one last time. Anything not
   passing reliably by `freeze` is cut or replaced with a canned version.

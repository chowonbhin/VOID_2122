# Playbook: fix (`fix_start` → `freeze`)

Goal: the golden path passes reliably, three runs in a row, on the deployed
URL as well as locally.

- [x] Run `demo-path-verify` three times. List every failure and every flaky step.
- [x] Triage each problem with one question: will the judges see it?
   - Yes: if you own the step, reproduce it, find the root cause, fix it,
     verify. If not, report it to the owner (via the user) with the evidence.
   - No: work around it, hide it, or leave it. Note it in `handoff-<you>.md`.
- [x] Fix in golden-path order, earliest failing step first, since later steps
   often fail because of earlier ones.
- [x] Look at the evidence screenshots, not just pass/fail. Broken layout, loading
   spinners that never end, placeholder text, and English/Korean mixups are
   golden-path bugs even when the test passes.
- [x] Make sure every `[LLM]`/`[API]` step has its fallback working before
   `freeze` (call `demo-safety`). Harden is only about an hour; there is no
   time to build fallbacks then.
- [ ] One hour before `freeze`, the captain runs `scope-cut` one last time. Anything not
   passing reliably by `freeze` is cut or replaced with a canned version.

## Result — 2026-11-08 02:11 KST
- Schedule advanced to fix at 02:00; previous continued-build selection applied before this checkpoint. Freeze remains 04:00.
- Integrated upstream 84d6370 on own branch; preserved local documentation commits and edits. No source/test modifications.
- Step 1: deployed PC and mobile each passed three runs (02-09-34 / 02-09-53-mobile); local build PC/mobile each passed three runs (02-10-07 / 02-10-28-mobile). Each folder has 15 PASS step records; no SLOW or console errors.
- Steps 2–3: no failures found, no fixes needed. Typecheck/build and 111 unit tests pass; own setup/recommend browser suite 8/8 passes.
- Step 4: reviewed deployed step-02 desktop, step-03 mobile and focused viewport captures in fix-2026-11-08-0211. No stuck loaders/undefined text; no horizontal overflow on PC/mobile.
- Step 5: no runtime API/LLM call in current golden path; boundary/data assets bundled locally. demo-safety skill unavailable; dependency review performed inline.
- Step 6: not due yet. Captain scope review at 03:00; 02:00 checkpoint review requested. No scope cuts made.
- Current app: 25 dongs, 3 scored simulated-place dongs, 3 awaiting popularity counts, 19 preparing. 413 collected candidates are not all verified recommendations.
- Test source/spec: cc03041bf9e78c06986d59944ff8c1c9f9887d39; public deployment SHA not independently queried. Existing owner assignments retained.

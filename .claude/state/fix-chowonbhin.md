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

## Local main integration — 2026-11-08 02:37 KST
- User requested latest main, tests and local run. Integrated 4decbfe into own branch; tested source a420922aca6aec23647fa138a715b7e259e10f91.
- Step 1: local PC/mobile golden path 3 runs each PASS 5/5; evidence 02-35-48 and 02-36-05-mobile. Public checks not rerun for this local-execution request.
- Steps 2–3: full browser suite 36/37 passes; zT4ek demo-fill.spec.ts captures originals before headings render (initial [] versus restored 20). Original test unchanged; owner follow-up required.
- Separate readiness-aware diagnosis restores 20 headings and original score through visit/reload/pool toggles/deletion. Evidence local-main-2026-11-08-0235; this does not turn the failed repository test into a PASS.
- Typecheck/build PASS, unit 123/123. Step 4: inspected onboarding and 320px map screenshots. Step 5: no new runtime API/LLM requirement. Step 6: 03:00 scope review still upcoming.
- Preview serves latest dist at http://127.0.0.1:3011/; opened in default browser. No application source changes or push.

## Footfall omission fix — 2026-11-08 02:59 KST
- User requested implementing the reviewed asset-based mapping; upstream 3e1ede8 already integrated.
- Connected the 9 omitted source-labelled dongs; 18 markets / 11 dongs / 466765 total; 14 absent dongs still unavailable.
- Added regression tests before fix (3 failures reproduced), then all 126 unit tests, typecheck and build passed. Source values/formula remain unchanged.
- PC/mobile golden path each 3 runs PASS 5/5: 02-57-18 / 02-57-47-mobile, no console errors or SLOW. Screenshot hosu-lv1-map.png inspected.
- Local preview updated; no main merge/push/deploy. No new API/LLM dependency. 03:00 captain scope checkpoint upcoming.

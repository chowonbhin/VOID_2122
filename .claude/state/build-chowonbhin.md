# Playbook: build (`build_start` → `fix_start`)

Goal: every golden-path step is real (not placeholder) and the full path passes
end to end. Work strictly in golden-path order.

- [x] Pick the first golden-path step owned by `<you>` that is still a placeholder.
   Create or switch to branch `<you>/<step-name>`.
- [x] Decide the data shape it needs (types, API response, DB row) before writing
   UI. Write it down in one short code block in the commit or a comment.
- [x] Implement the step with the smallest real implementation. Hardcode anything
   the judge will not see (settings, auth, edge-case screens).
- [x] If the step is marked `[LLM]` or `[API]`, add a timeout and a fallback now,
   not later (call `demo-safety` for the pattern).
- [x] Run `demo-path-verify`. If your step fails, fix it before moving on. If
   someone else's step fails, check whether your change caused it; if not,
   report it to the user with the owner's name.
- [x] Commit with `build: <step>`, then merge to `main` locally as described in
   "Working as a team" (rebase, verify, merge), and give the user the push
   command. Do not start the next step until they confirm the push went
   through, so a rejected push is handled while the change is fresh.
- [x] Repeat from 1. At `build_start` + 2h, or when a step takes twice its estimate,
   stop: the captain runs `scope-cut`; a member writes the problem under
   "For captain" in `handoff-<you>.md` and tells the user to ping the captain.
- [x] When all your steps are real and pass, ask the user whether to help a
   teammate's step (only with that owner's OK) or take a stretch item the
   captain picks.

## Session — 2026-11-08 00:21 KST
- Source af198d3 plus local documentation commit cc5b8ba; working branch chowonbhin/recommendation.
- New golden path includes map-first recommendations and footfall penalty; reassessing current step 2 and delegated production verification.
- Steps 1–3: source implementation already delivered by latest upstream; do not add new features during verification.
- Step 4: inspect tile failure fallback. demo-safety skill missing; handle inline.
- Step 5: run typecheck/unit/build and deployed desktop/mobile golden path.
- Step 6: no source merge/deploy planned; evidence and handoff only unless own-step repair is needed.
- Step 7: 00:00 scope checkpoint elapsed; captain review requested. scope-cut skill missing; member proposes in handoff, does not cut scope.
- Step 8: decide next assignment after evidence.

## Result — 2026-11-08 00:25 KST
- Refreshed upstream to 82af56d during verification, preserving local documentation via stash/rebase/restore. No application/test assertions edited.
- Initial deployed desktop attempt failed because af198d3 test text targeted the earlier tile map while upstream had deployed the schematic; retained evidence 2026-11-08T00-22-28.
- Current source: cb430d9e5135e2fdd5ac5d0ed39474e36675c67f (application/spec identical to upstream 82af56d). Typecheck/build PASS, unit 86/86 PASS.
- Deployed desktop PASS 5/5: 2026-11-08T00-23-36; mobile PASS 5/5: 2026-11-08T00-23-45-mobile; no SLOW/console errors.
- Additional map/footfall browser checks 3/3 passed; includes score-shade stability, marker/card synchronization, keyboard control, offline navigation after loading and no external map requests.
- Screenshots inspected: desktop recommendation, mobile detail, focused maps before/after visit and mobile markers.
- Steps 1–3: no new implementation needed; current upstream meets own golden-path step. Step 4: latest schematic removes tile/API dependency, so timeout/fallback no longer applies.
- Step 6: local evidence documentation checkpoint only; no main merge/push/deploy needed.
- Step 7: captain scope review requested; M08/M09/M11 completion still requires owner evidence. No scope cuts made.
- Step 8: user asked to select early fix or continued build because golden path passes before scheduled fix_start; phase remains build until response.

## Result — 2026-11-08 00:47 KST
- User selected continued build focused on captain-assigned remaining MVP work; the earlier phase question is resolved.
- Integrated origin/main 46d902c onto chowonbhin/recommendation, preserving two local documentation commits. Tested source/spec: 4e038a867525e6e7e6fc953a00bf96c0de3430fe.
- Steps 1–3: own step is already implemented; latest upstream adds franchise/unverified exclusions and region filters. No new assignment or application changes in this session.
- Step 4: no new external API/LLM dependency; current schematic needs no map-network fallback.
- Step 5: typecheck/build PASS; unit 91/91; deployed franchise and region-detail tests 6/6 PASS (last-run status passed).
- Deployed golden path: desktop PASS 5/5 in 2026-11-08T00-44-26; mobile PASS 5/5 in 2026-11-08T00-44-34-mobile; zero SLOW/console errors.
- Inspected desktop/mobile step-03 screenshots: exclusion notice, filters, five markers/cards and selected place visible without overlap.
- Step 6: documentation checkpoint only; application changes already on origin/main, so no main merge, push or new deploy needed.
- Step 7: captain scope review remains requested for the elapsed midnight checkpoint; no member scope cuts made.
- Step 8: user chose captain-assigned remaining MVP work. Current handoff assigns M08/M09 to iwtkmn0219; M11 evidence remains captain-owned. Own step and delegated deployment checks pass.

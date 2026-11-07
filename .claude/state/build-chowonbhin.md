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
- [ ] Commit with `build: <step>`, then merge to `main` locally as described in
   "Working as a team" (rebase, verify, merge), and give the user the push
   command. Do not start the next step until they confirm the push went
   through, so a rejected push is handled while the change is fresh.
- [ ] Repeat from 1. At `build_start` + 2h, or when a step takes twice its estimate,
   stop: the captain runs `scope-cut`; a member writes the problem under
   "For captain" in `handoff-<you>.md` and tells the user to ping the captain.
- [ ] When all your steps are real and pass, ask the user whether to help a
   teammate's step (only with that owner's OK) or take a stretch item the
   captain picks.

## Progress
- Step 1: step 2 placeholders confirmed; branch chowonbhin/recommendation created.
- Step 2: use existing Profile and SearchContext via useAppState().update; score.ts interface is not decided (user confirmed).
- Current scope: M02 input UI. Recommendation integration waits for captain-owned scoring contract.

- Step 3: M02 input and persistence implemented; scored recommendations blocked on captain-owned score.ts.
- Step 4: step 2 has no external API; no timeout/fallback applies.
- Step 5: typecheck and production build passed; setup browser tests 3/3 passed; demo-path-verify PARTIAL 1/5, steps 2–5 pending. Desktop/mobile screenshots inspected; no overflow or console errors.
- Step 6: checkpoint only for M02; no main merge while step 2 remains incomplete.
- Steps 7–8: not reached; current step still pending.

## Update — 2026-11-07 23:18 KST
- Fetched captain commit 7fe4382 and rebased own unpublished commit to 3308407 without conflict.
- Previous contract blocker resolved: score.ts exports recommend(content, profile, visits, ctx), returning recommendations/excluded/allZero.
- Latest checks: Vitest 23/23, setup browser 3/3, typecheck/build passed; golden path PARTIAL 1/5.
- Recommendation UI integration remains next; this turn only pulled and verified as requested.

## Step 2 implementation — 2026-11-07 23:24 KST
- Connected recommend() to saved profile/visits/search; ranked cards show reasons, level, distance, counts and score.
- Added excluded-region direct exploration, empty/allZero guidance and missing-search recovery.
- Browser cases: recommendation 5/5 and setup 3/3 passed; typecheck/build passed.
- Step 2 PASS (0.2s); full path PARTIAL 2/5, other steps pending. Desktop/mobile screenshots inspected.
- setup.spec.ts now selects the h1 explicitly: new empty-state h2 also contains the words 추천 권역.
- Latest fetch found teammate visit commit 03f2b19; integrate next, then rerun affected verification before local main merge.

## Integrated verification — 2026-11-07 23:26 KST
- Rebased onto teammate visit commit 03f2b19 without conflicts; source 69a25b9074709559d2af1532106d9210e71a0766.
- Unit 71/71, browser 14/14, typecheck/build passed. Golden path PARTIAL 3/5 (1,2,4 PASS; 3,5 pending), exit 0, no console errors.
- Real visit changed A→B to B→A in screenshot; step-5 owner must add rank assertion and remove pending.
- Steps 6–8 await human push after local fast-forward merge; no further feature work in this turn.

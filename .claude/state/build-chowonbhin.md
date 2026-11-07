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
- [ ] When all your steps are real and pass, ask the user whether to help a
   teammate's step (only with that owner's OK) or take a stretch item the
   captain picks.

## Current status — 2026-11-07 23:33 KST
- Steps 1–5: own step 2 and required resident/empty states implemented; shared recommend() reused; no external API in own step.
- Step 6: local merge and explicitly authorized push succeeded; fetch confirms main = origin/main = 3e6714c.
- Step 7: no remaining assigned placeholder; no repeat needed. Scope checkpoint at 00:00 KST has not arrived.
- Step 8: awaiting next assignment; teammate support requires that owner’s OK. Stretch is not eligible while required steps remain pending.
- Existing valid evidence reused: desktop 2026-11-07T23-30-37 and mobile 2026-11-07T23-30-47-mobile; PARTIAL 3/5, own step 2 PASS.
- No source changes or test reruns in this restart. Unit 71 passed on published source; build/typecheck passed.

## Delegated deployment verification — 2026-11-07 23:47 KST
- Pulled 2c8f300 and confirmed team.md delegation to chowonbhin. Existing local documentation edits preserved.
- Ran verify on https://void-2122.vercel.app for desktop and --mobile: both PARTIAL 4/5, exit 0, no SLOW or console errors.
- Steps 1,2,4,5 PASS; step 3 remains PENDING and the deployed detail page visibly shows its placeholder.
- Evidence: 2026-11-07T23-46-36 and 2026-11-07T23-46-50-mobile. Screenshots inspected.
- No main merge or deployment triggered. Future source integrations require verify before main because main auto-deploys.

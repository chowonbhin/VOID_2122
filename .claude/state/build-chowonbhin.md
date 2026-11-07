# Playbook: build (`build_start` → `fix_start`)

Goal: every golden-path step is real (not placeholder) and the full path passes
end to end. Work strictly in golden-path order.

- [x] Pick the first golden-path step owned by `<you>` that is still a placeholder.
   Create or switch to branch `<you>/<step-name>`.
- [x] Decide the data shape it needs (types, API response, DB row) before writing
   UI. Write it down in one short code block in the commit or a comment.
- [ ] Implement the step with the smallest real implementation. Hardcode anything
   the judge will not see (settings, auth, edge-case screens).
- [x] If the step is marked `[LLM]` or `[API]`, add a timeout and a fallback now,
   not later (call `demo-safety` for the pattern).
- [ ] Run `demo-path-verify`. If your step fails, fix it before moving on. If
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

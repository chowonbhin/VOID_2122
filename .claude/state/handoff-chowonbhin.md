# Handoff — chowonbhin
- User override: ignore schedule/deadline; no clock-based phase transitions.
- Branch chowonbhin/map-readability; previous five-pick/caption cleanup committed as b6d1e9b.
- New user request: replace top-right mini map with region search, remove caption rank text, show rank 1/2/3 as map pins.
- Search supports partial dong/district names and 대부도 alias; selection highlights/focuses the dong and switches urban/island view without navigating away.
- Enter submits exact/unique matches, Tab reaches result buttons, Escape dismisses results; no-match feedback included.
- Caption retains dong/familiarity/distance status, omits rank. Existing accessible region names retain recommendation rank.
- Top three eligible recommendations have numbered clickable/keyboard pins, fixed 44px hit circles and separated positions; leaders preserve true locations.
- No eligible recommendation → no pins. Existing familiarity, home hatching, scoring, five main picks and dong click-through retained.
- Build PASS; map/search/admin browser checks 11/11 PASS; final narrow-search styling rechecked with 3/3 search tests.
- PC demo PASS 5/5: .claude/state/evidence/2026-11-08T06-06-06/.
- Mobile demo PASS 5/5: .claude/state/evidence/2026-11-08T06-06-21-mobile/; no console errors/SLOW in either run.
- Screenshots inspected at 1280/390/320px: .claude/state/evidence/map-search-pins/; final-320.png includes final compact search header.
- Local URL http://127.0.0.1:3011/ serves current build. No main merge/push/deploy for these map changes.
- Next 1: user searches a dong and checks top-three pins locally.
- Next 2: only on request integrate latest main and verify before merge/push.
- Next 3: verify public PC/mobile after any deployment.
## For captain
- No data/scoring/golden-path changes; map-number assertion updated for the explicit top-three-pin request.

# Handoff: iwtkmn0219
phase: build (2026-11-08 00:59 KST)
branch: iwtkmn0219/region-detail
request: restore our pre-pull region detail design; keep current functional integration
implemented: Leaflet/OSM coordinates, map above cards, palette, Korean event dates and event sources
preserved: shared scoring/status, franchise exclusion, real persisted visits, all/visited/recommended filters
verified: build; unit 91/91; relevant browser 14/14 including keyboard, mobile widths and tile outage
last verify: desktop/mobile PASS 5/5; console errors none
 evidence: .claude/state/evidence/2026-11-08T00-56-55 and 2026-11-08T00-57-33-mobile
visual review: both step-03 screenshots inspected; map and cards match restored vertical layout
next:
1. Review restored design locally before merging/deploying.
2. Coordinate main-map and real-boundary UX separately with captain.
3. Continue assigned M08/M09 after integration.
## For captain
- Explicit user restoration overrides schematic choice for detail; official golden-path wording needs captain reconciliation.
- Own step-3 assertion now verifies real map attribution; other owners' schematic/no-external-request tests not changed or claimed passing.
- Main recommendation map unchanged; no new actual region-boundary dataset, city/Daebu split or photos added.
- Current change not merged/pushed/deployed. Original pre-pull stash remains available.

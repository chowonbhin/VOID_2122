# Golden path

One line per step: the user action, then what the judge sees, then the owner.
Mark steps that call an external service with [LLM] or [API].
After kickoff, only the captain (Byeunghee02) changes this file.

Source: `mvp_implementation_plan.md` §7.2. Updated 2026-11-08 at the user's explicit request
for 25 administrative dongs, source boundaries, top-20 reselection and individual visit/review-count penalties. Owners are unchanged.
Temporary demo fill explicitly requested by the user on 2026-11-08: 25 synthetic candidates per dong (625 total).
All synthetic names, positions, operation and popularity values are labelled. Existing real records and missing evidence remain intact.
Default first-run search: all activities, 100 km, current Korean time. Existing search/visits are preserved; a visible preset applies these conditions.
The top-20 sum, Lv/novelty/distance/footfall formulas and franchise exclusions are unchanged. Filters can still reduce eligible counts.
The additional pool can be turned off in the app; baseline-data regression tests cover that shipped mode.

1. Open the app → first-run residence onboarding; choose under 6 months and see 탐험 시작 (owner: Byeunghee02)
2. Press 탐험 시작 → 25-dong score map with 20/20 places per dong and an explicit demo-data notice; existing users can apply 25개 동 시연 조건 적용 (owner: chowonbhin)
3. Click 중앙동 on the map → the team-designed detail map and 20 recommended demo places from at least 25 candidates; marker pages and cards stay linked (owner: iwtkmn0219)
4. Record a visit to the twentieth place → reserves replace it in the top 20; 가본 장소 shows 자기 신고 and 지역 Lv.1 (owner: zT4ek)
5. Return to recommendations and reload → recalculated region score, 20/20 selection, visits and Lv persist; other dong scores stay fixed (owner: zT4ek)

## Shared modules (not a demo step; owner keeps them stable for everyone)
- App shell, routing, `src/domain/types.ts`, `policy.ts`, content JSON, `src/storage.ts`, verify harness (owner: Byeunghee02)
- Scoring engine `src/domain/score.ts` (M03 운영 판정, M04 Lv·점수·정렬); steps 2, 4, 5 call it, never re-implement it (owner: Byeunghee02)

## MVP-required, off the demo path (owner builds after their step passes)
- M07 방문 기록 수정·삭제, 같은 장소 반복 기록 중복 집계 방지 (owner: zT4ek)
- M08 행사 참여 경험 토글 → 재계산, 취소·종료 행사 가점 제거 (owner: iwtkmn0219)
- M09 현재 위치로 출발지 변경, 거부·실패 시 수동 출발지 유지 (owner: iwtkmn0219)
- 기존 주민 상태, 전체 후보 없음 안내 (owner: chowonbhin)
- M11 두 페르소나 사용 테스트·수정 목록 (owner: Byeunghee02)

## Stretch (only if all steps above pass reliably; captain assigns)
- 실제 권역·장소·운영정보로 데이터 교체 (30~50곳)

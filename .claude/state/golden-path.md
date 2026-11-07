# Golden path

One line per step: the user action, then what the judge sees, then the owner.
Mark steps that call an external service with [LLM] or [API].
After kickoff, only the captain (Byeunghee02) changes this file.

Source: `mvp_implementation_plan.md` §7.2. Updated 2026-11-08 at the user's explicit request
for 25 administrative dongs, source boundaries, top-20 reselection and individual visit/review-count penalties. Owners are unchanged.
The dataset has 3 real venues awaiting popularity counts and 10 simulated discovery places. b3 belongs to Singil-dong.
API HUB authentication and 300 collection calls succeeded: 413 candidates, 3 existing venue coordinates linked. Counts still await verification.
Central score changes 240.7024 → 188.8980 after a1; Wongok stays 146.4235. Do not force a rank swap.
See `src/data/README.md` for operating review periods, source licenses and old-state migration.

1. Open the app → landing page with the one-sentence pitch and a "탐험 시작" button (owner: Byeunghee02)
2. "탐험 시작" → choose 행정동별 익숙함, 관심 활동, 출발지, 날짜·시각, 최대 거리 and press "추천 받기" → 25-dong Ansan map with score shades and 3 scored dongs, 3 awaiting counts, 19 preparing; supporting cards show N/20, shortages, reasons, distance and footfall penalty (owner: chowonbhin)
3. Click 중앙동 on the map → the team-designed drawn detail map with home pin and labelled sample memories and 5 simulated places with operating/closed/unknown status, source dates and events; marker/card selection and visit memories stay linked (owner: iwtkmn0219)
4. On a place, enter a 방문일 and press "방문 기록" → the record appears labelled "자기 신고" and the region shows Lv.0 → Lv.1 (owner: zT4ek)
5. Press "추천으로 돌아가기", then reload → central score changes to 188.9 with footfall penalty 3.21, other dong scores stay fixed; visit, computed order and score shades persist (owner: zT4ek)

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

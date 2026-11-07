# Golden path

One line per step: the user action, then what the judge sees, then the owner.
Mark steps that call an external service with [LLM] or [API].
After kickoff, only the captain (Byeunghee02) changes this file.

Source: `mvp_implementation_plan.md` §7.2 (written 2026-11-07 23:00 KST). Demo data is the
plan's §5 numeric example (권역 A·B, 전부 가상 데이터), so the rank swap in step 5 is a
result of the real calculation, not a hardcoded order.

1. Open the app → landing page with the one-sentence pitch and a "탐험 시작" button (owner: Byeunghee02)
2. "탐험 시작" → choose 지역별 익숙함(신규 주민), 관심 활동, 출발지, 날짜·시각, 최대 거리 and press "추천 받기" → region cards ranked by computed score, each showing 추천 이유, 시작점 직선거리, 운영 확인 장소 수 (demo data: A above B) (owner: chowonbhin)
3. Click the top region card → region detail: only that region's 5 places with 운영 중/휴무/운영정보 미확인 and 출처·확인일, its event cards, and a map with start-point and place markers; clicking a marker selects the same place card [API] (OSM tiles; list still works if tiles fail) (owner: iwtkmn0219)
4. On a place, enter a 방문일 and press "방문 기록" → the record appears labelled "자기 신고" and the region shows Lv.0 → Lv.1 (owner: zT4ek)
5. Press "추천으로 돌아가기", then reload the page → recommendation recomputed from the visit (demo data: B now above A) and the visit and new order are still there after reload (owner: zT4ek)

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

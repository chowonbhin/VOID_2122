# Golden path

One line per step: the user action, then what the judge sees, then the owner.
Mark steps that call an external service with [LLM] or [API].
After kickoff, only the captain (Byeunghee02) changes this file.

Source: `mvp_implementation_plan.md` §7.2. Updated 2026-11-08 at the user's explicit request
for 25 administrative dongs, source boundaries, top-20 reselection and individual visit/review-count penalties. Owners are unchanged.
Correction 2026-11-08: synthetic venues were an incorrect interpretation, not user-authorized content.
Production uses actual NAVER search venues. Each dong shows 20 actual discovery places; scoring
includes all 20 selected real candidates, with unknown evidence labelled provisional.
Unknown review counts remain missing and use a conservative penalty; no counts or hours are fabricated.
Known and suspected chains and confirmed closed places remain excluded. Scores use a fixed 0–100 scale.
Traffic penalty is relative to the fixed maximum source-dong total, capped at 15% for Lv.1 and 30% for Lv.2.

1. Open the app → first-run residence onboarding; choose under 6 months, press 다음 and see 관심 활동 with 탐험 시작 (owner: Byeunghee02)
2. Press 탐험 시작 → onboarding saves the search (내 동네 start, today 14:00, 10 km; no setup page) → actual score map for 25 dongs; all 20 displayed places contribute; pending evidence is labelled (owner: chowonbhin)
3. Click 본오1동 → 20 actual search places, measured review counts, linked markers and 20/20 scored places on a fixed 0–100 scale (owner: iwtkmn0219)
4. Record 바바카멜 visit → real score recalculates; 자기 신고 and 지역 Lv.1 appear (owner: zT4ek)
5. Return and reload → scores and visit persist; the full actual candidate pool remains available (owner: zT4ek)

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

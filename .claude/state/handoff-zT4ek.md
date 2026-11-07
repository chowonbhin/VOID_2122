# Handoff: zT4ek

phase: build (2026-11-07 KST)
branch: zT4ek/step-4 (origin/main 7fe4382 반영)
last verify pass: .claude/state/evidence/2026-11-07T23-18-50 — PARTIAL 2/5, 담당 4단계 PASS, 5단계 순위 연동 PENDING
in progress: 방문일 등록·수정·삭제·중복 방지·저장 실패 안내·공통 엔진 Lv 갱신·새로고침 유지 구현 및 검증함
next:
1. 추천 페이지가 공통 recommend()를 연결하면 5단계의 B → A 순위 assertion 추가 및 pending 제거
2. 다른 담당의 2·3단계 반영 후 전체 demo-path-verify 재검증
3. 기능 단위마다 fetch로 최신 변경 확인, 충돌 해결·검증 후 커밋·병합·업로드

## For captain
- zT4ek 담당 4단계와 M07: 공통 타입·상태·저장 API 유지, 방문 함수/스타일은 features/visits 내부
- 공통 score.ts가 중간에 반영되어 임시 계산을 제거함. progress.ts는 shared regionLevel/placeLevel/distinctVisitedPlaces 연결부만 유지
- clock.md의 최종 deadline은 미정. 사용자가 나중에 재질문해 달라고 한 상태 유지
- 빌드·단위 71개·방문 브라우저 6개 통과. 전체 데모는 콘솔 오류/SLOW 없이 PARTIAL 2/5. 추천 화면은 여전히 데이터 순서이므로 5단계 순위 변화 미검증
- 포터블 Node 22.22.3과 Chromium은 /private/tmp/ansan-visit-runtime 아래 설치. 전역 Node 설정은 변경하지 않음
- handoff 스킬 파일이 없어 hack-mode의 인수인계 형식을 직접 적용함
- HACKATHON.md는 .git/info/exclude로 로컬 제외 상태 유지

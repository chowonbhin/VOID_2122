# Handoff: zT4ek
phase: build (2026-11-08 KST); deadline은 사용자 요청대로 추후 확인
branch: zT4ek/admin-dong-map → main; 사용자 main 반영·최신 변경 재검증 승인. 신규 원격 aab0cec 통합
last verify: .claude/state/evidence/2026-11-08T01-56-34-mobile — 최종 mobile 3회 PASS 5/5, SLOW·콘솔 오류 없음
desktop: .claude/state/evidence/2026-11-08T01-53-43 — 3회 PASS 5/5; 이후 최종 전체 브라우저 32 PASS
validation: build PASS, unit 111 PASS, API adapter 5 PASS, 키보드 지도 전환 5회 PASS, 21개 후보 상위20 교체·삭제복원·320px 전체 마커 클릭 PASS
looked at: map-footfall-2026-11-07T16-56-12-457Z/map-mobile-map.png, map-detail-mobile-map.png, admin-dongs/home-memory-320.png, top20-browser/markers-mobile.png — 지도·집·추억·마커 정상
finished: 25개 행정동 경계·Lv 이관, 개별 방문/리뷰 수 로그 감점, 전체 후보에서 상위20 재선정, N/20 부족 표시
API: NAVER API HUB 인증 1회·수집 300회 성공, 25개 동 413개 후보. 원본 .local/naver-api-hub-20261108/ (Git 제외)
data: 기존 실제 시설 3곳의 ID·방문 기록 유지하며 검색 좌표 연결. 실제 방문/리뷰 수 미확인으로 점수 제외
next 1: docs/naver-candidate-collection.md / docs/naver-place-data.md에 따라 후보 소속·운영·프랜차이즈·개별 수치 출처 검토 후 순차 반영
next 2: 동별 비교 가능한 후보 확보 후 실제 점수 효과 검증. 413개 모두 검증된 추천 장소는 아님
## For captain
- 사용자 명시 요청으로 행정동 지도·실제 장소·개별 수치·상위20·최신 디자인 통합. 공통 코드와 golden path 문구 갱신, 담당 유지
- aab0cec 손그림 상세지도·내 동네·추억 예시·가까운 동네 보존. 경계는 2026-10-01, 주 지도 색상은 사용자 요청대로 추천 점수
- 예전 동 코드 링크/집 표시 호환, 추억 예시는 현재 좌표·동 코드로 연결하고 점수·방문에서 제외. 전환 애니메이션의 일시적 inert 초점 상실 수정
- 실제 시설 운영 검토 기간 11/08~13. 기본 3개 동 시연 점수, 3개 동 수치 대기, 19개 동 자료 없음. Lv.0 감점 0 유지
- 21개 검증 입력은 실측 네이버 수치 아님. API 최대5건/검색어이며 방문·리뷰 수와 운영시간은 별도 조사 필요
- Node/Chromium /private/tmp/ansan-visit-runtime, preview 3002. HACKATHON/.env.local/.local/evidence 제외. 동기화 전 stash 백업 보존

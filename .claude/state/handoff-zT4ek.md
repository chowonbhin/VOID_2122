# Handoff: zT4ek
phase: fix (2026-11-08 KST); 사용자 단위별 검증·main 반영 승인 유지
branch: zT4ek/demo-top20 → main; 최신 온보딩 ef0d3be 통합
last verify: .claude/state/evidence/2026-11-08T02-24-15-mobile — mobile 3회 PASS 5/5, SLOW·콘솔 오류 없음
desktop: .claude/state/evidence/2026-11-08T02-23-51 — 3회 PASS 5/5
validation: build PASS, unit 123 PASS, API adapter 5 PASS, 전체 브라우저 37 PASS, 최신 푸터 통합 후 온보딩 2 PASS
looked at: demo-fill/central-320.png, score-map-320.png, notice-390.png, desktop run1-step-04.png 및 최종 step-01.png — 지도·집·추억·방문 기록·시연 안내 확인
finished: 사용자 최신 요청으로 25개 동에 시연 후보 25곳씩(총 625곳) 추가, 현재 상위20 합산·방문 후 재선정
flow: 첫 온보딩 완료 → 전체 활동·100 km 시연 조건 자동 적용. 기존 사용자는 ‘25개 동 시연 조건 적용’ 버튼, 기록·Lv 유지
data: 기존 실제 3곳·원본 가상 10곳·제외 검증 2곳 그대로 유지. 실제 운영/리뷰 미확인을 임의로 채우지 않음
mode: 화면에서 추가 시연 장소 켜기/끄기. 기존 회귀 검증은 끄기 모드, golden/demo-fill/onboarding은 기본 켜기 모드
map: 최신 수첩·SVG 경계·집·추억 디자인 유지. 장소 마커 8개씩 페이지, 카드 선택 시 해당 페이지 강조
proof: 각 동 20번째 후보 방문 → 예비 후보 편입, 해당 동만 점수 변경. 새로고침·모드 전환·삭제 복원·320px 20개 마커 클릭 통과
## For captain
- 사용자 명시 요청으로 공통 콘텐츠/온보딩 기본 검색/지역 화면과 golden path 갱신, 기존 담당 유지
- 실제 후보 413개는 별도 검토 대기. 새 625개는 실제 네이버 장소가 아니라 이름·위치·운영·인지도를 명시한 가상 데이터
- 필터를 좁히면 N/20로 감소할 수 있음. 20개 보장은 전체 활동 시연 조건이며 수식·프랜차이즈·실제 자료 결측 정책 유지
- 후속: 실제 장소 운영·프랜차이즈·개별 수치 확인 및 행정동 유동인구 연결. docs/naver-place-data.md 참고
- HACKATHON/.env.local/.local/evidence Git 제외. Node/Chromium /private/tmp/ansan-visit-runtime, preview 3002

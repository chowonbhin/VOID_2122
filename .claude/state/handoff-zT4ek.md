# Handoff: zT4ek

phase: build (2026-11-08 KST); 최종 deadline은 사용자 요청대로 추후 확인
branch: zT4ek/exclude-franchises (origin/main 82af56d 기준)
last verify: .claude/state/evidence/2026-11-08T00-26-02-mobile — mobile PASS 5/5, 콘솔 오류·SLOW 없음
desktop: .claude/state/evidence/2026-11-08T00-25-33 — 3회 PASS 5/5
validation: build PASS, unit 91 PASS, browser 20 PASS; 안내 정리 후 제외 시나리오 3개 재검증 PASS
looked at: franchise-2026-11-07T15-26-24-252Z의 excluded-franchise/unverified-mobile — 제외 안내와 5곳만 표시 정상
finished: 프랜차이즈·미확인 제외를 점수/목록/지도/행사/방문 Lv에 공통 적용, 분류 근거·날짜 검증, 직접 탐색 우회 방지
next: 실제 장소 분류 근거·운영정보 수집. M08 행사 경험·M09 위치 권한·M11 사용 테스트는 기존 담당 진행

## For captain
- 사용자가 프랜차이즈 제외 로직을 명시 요청하여 공통 타입·점수·데이터·추천/상세 화면을 함께 갱신. 담당 및 golden path는 유지
- Place.franchise={status: non_franchise|franchise|unknown, source: Source|null}. 분류/근거 누락은 미확인으로 제외
- 가맹점 및 동일 브랜드 직영 체인점 제외. 자동 브랜드 판별은 없음. 실제 분류는 근거 수집 필요
- 기존 가상 10곳은 시연용 비프랜차이즈 설정. 제외 검증용 a6-franchise/b6-unverified 및 e-a6-franchise 추가, 표시 5곳씩·기존 점수 불변
- 제외 장소의 기존 방문 기록은 삭제하지 않되 Lv·점수에서 제외. 초기 경험은 유지. 상권 유동인구 원자료도 유지
- 포터블 Node/Chromium: /private/tmp/ansan-visit-runtime. preview 3002. HACKATHON.md·evidence는 커밋 제외

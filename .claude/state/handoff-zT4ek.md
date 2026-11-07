# Handoff: zT4ek

phase: build (2026-11-08 KST); 최종 deadline은 사용자 요청대로 추후 확인
branch: zT4ek/footfall-policy (origin/main 2c8f300 기준)
last verify: .claude/state/evidence/2026-11-08T00-06-46 — desktop 3회 PASS 5/5, 콘솔 오류·SLOW 없음
mobile: .claude/state/evidence/2026-11-08T00-07-13-mobile — PASS 5/5, 지도/상세/재계산 화면 검토
validation: build PASS, unit 83 PASS, browser 17 PASS; 지도 렌더링 보완 후 지도 3개 재검증 PASS
finished: 원래 유동인구 감점, 실제 권역 2곳·자료 18행 연결, 지도 경계·점수·순위, 권역 클릭·장소 추천·마커 연동
next:
1. 실제 장소·행사·운영정보 수집 후 시연 장소를 명시적으로 교체 (현재 모두 가상 표시)
2. 기존 담당의 M08 행사 경험 토글·M09 위치 권한·M11 사용 테스트는 별도로 진행
3. 최신 원격 변경 확인, 공통 계약과 지도/방문 흐름 회귀 검증

## For captain
- 사용자가 유동인구 정책 구현·실제 권역 구성·지도 형식 반영을 명시 요청하여 공통 계산·타입·추천/상세 및 golden path를 함께 갱신. 담당자는 유지
- 실자료: 중앙동 대표 상권 150039, 안산역·다문화거리 65567 / 고정 분모 466765. f(Lv0/1/2)=0/10/20은 초기 조정값
- 자세한 출처·자료 한계·매핑·시연값은 src/data/README.md. 경계는 앱 정의 탐험 범위, 공식 통계 경계가 아님
- 방문 전 A240.7024/B207.0125 → a1 방문 후 A188.8980. 실제 시작점 거리로 기존 숫자·라벨 검사 갱신
- 최초 공식 검사는 새 지도 버튼과 카드 이름 중복으로 step5 선택자 실패. 지도 버튼으로 범위를 좁힌 뒤 desktop 3회·mobile 1회 모두 통과
- 포터블 Node/Chromium: /private/tmp/ansan-visit-runtime. preview 3002. HACKATHON.md·evidence는 커밋 제외

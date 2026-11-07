# Handoff: zT4ek

phase: build (2026-11-08 KST); 최종 deadline은 사용자 요청대로 추후 확인
branch: zT4ek/rounded-score-map (origin/main af198d3 기준)
last verify: .claude/state/evidence/2026-11-08T00-20-38 — desktop PASS 5/5, 콘솔 오류·SLOW 없음
repeat/mobile: desktop 3회 00-19-29, mobile 00-19-51-mobile 모두 PASS 5/5
validation: build PASS, unit 86 PASS, browser 17 PASS; 최종 지도 3개 재검증 PASS (00-20-22)
looked at: map-footfall-2026-11-07T15-20-22-456Z의 PC 전후·모바일 지도/상세 — 색 변화·번호 간격 정상
finished: 안산만 표현한 SVG 도식, 다각형 모서리만 완만하게, 고정 점수별 녹색 농도, 권역→장소 추천·방문 재계산
next: 실제 장소·행사·운영정보 수집. M08 행사 경험·M09 위치 권한·M11 사용 테스트는 기존 담당 진행

## For captain
- 사용자 요청 “실제 지도 대신 점수별 농도”, 보완 “완전 둥근 지도 대신 보기 편한 둥글둥글함”에 따라 화면·문서·golden path 갱신. 기존 담당 유지
- 외부 타일 호출 제거. Golden path의 [API] 제거 및 통상 1.5초 예산 복원, 기존 타일 검사는 오프라인 탐색 검사로 교체
- 색상 고정 0~300+는 시각화 기준뿐. 원점수·유동인구 정책 불변. A 240.7→188.9에 따라 옅어지고 B 207.0은 순위만 바뀌어 동일 색 유지
- 본토·대부도 및 권역 윤곽은 도식, 실제 행정 경계 아님. 채색은 기존 2권역만, 회색은 미제공/조건 미충족이며 0점과 구분
- 모바일 320px에서 장소 5개 모두 클릭 검증. 번호 배치는 목록 연결용이며 실제 위치·거리 아님을 명시
- 포터블 Node/Chromium: /private/tmp/ansan-visit-runtime. preview 3002. HACKATHON.md·evidence는 커밋 제외

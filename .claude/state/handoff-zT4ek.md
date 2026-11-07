# Handoff: zT4ek

phase: fix (2026-11-08 KST)
branch: zT4ek/real-place-correction; latest integrated origin/main c5e1a94
authorization: 사용자 단위별 검증·main 반영 승인 유지. 직접 요청한 실제 장소/지도/점수 공통 수정 범위이며 기존 담당은 유지.

## 최신 사용자 결정

- 가상 625곳은 요청의 잘못된 해석이었다. 가상 장소/추억/시연 모드를 운영 화면에서 제거했다.
- 실제 20곳을 표시만 하고 3곳만 점수에 넣은 것도 잘못이었다. 이제 **표시 20곳 = 점수 반영 20곳**이다.
- 실제 검색 출처·좌표가 있는 운영/리뷰/분류 미확인 후보를 잠정 점수·Lv에 포함한다. 정보는 미확인으로 유지한다. 알려진/의심되는 체인은 제외하고 확인된 휴무는 다른 후보로 대체한다.
- 리뷰 수를 지어내지 않는다. 미확인 P는 보수적 감점 계수 1, 실제 count 필드는 없음. Lv.0 인지도 감점 없음 유지.
- 0~100 지역 점수: sum(top20)/(20*110)*100*(1-footfallRate)*(novelty/1.2)*distanceWeight. 결과 집합 기준 min-max나 N 평균 아님.
- 유동인구 Lv.1 최대15% / Lv.2 최대30% / Lv.0 없음. 원자료 동별 합계의 최대150,039가 감점 분모. 466,765는 설명용 구성비만.
- 18개 상권을 sourceDong 11개 동에 연결. 14개 동 자료 없음/감점 보류. 행정동 전체 실측 통계가 아닌 표시 동의 상권 대리지표임을 안내.

## 데이터와 디자인

- 실제 API 후보2329 / 수록1930 / 리뷰 수 공개2차출처 대조300. src/data/real-places.json, research/*.json. 실제 API값·검증근거 유지.
- 25개 동 모두 실제 후보20개 초과. 2026-11-08 14:00/전체활동/100km에서 Lv.0·1·2 전부 20/20.
- 관심 활동을 좁히거나 확인된 휴무가 많으면 N/20 가능; 해당 활동과 다른 장소를 억지로 넣지 않음.
- 최신 d2eebae 장소 추천 카드/스크롤/친밀도 문구/내 동네 빗금/푸터 경계 출처 유지. 점수 보기 기본 0~100; 친밀도 보기 전환. 작은 지도 접근용 동 이름 목록은 접어 둠.
- 장소 마커 실제 좌표, 8개씩 페이지. 방문으로 순위 밖으로 나간 장소는 가본 장소에서 수정·삭제.
- 예: 중앙동 Lv.1, 출발 중앙동,14시 → 장소합계1260.62, 정규화57.30, 유동인구15%/8.60점 차감, 최종44.6.

## 검증

build PASS; unit130 PASS; API/import tests8 PASS; full browser30 PASS (최신 안내 칩까지 통합 후)
desktop3runs: .claude/state/evidence/2026-11-08T03-16-31 PASS5/5
mobile3runs: .claude/state/evidence/2026-11-08T03-16-59-mobile PASS5/5
최종 desktop golden: .claude/state/evidence/2026-11-08T03-21-12 PASS5/5. 지도 라벨과 온보딩 후보 기준, 최신 안내 칩까지 통합한 빌드.
visual: normalized-inspection/map-1280.png, central-lv1-390.png, picks-320.png. 실제20/20,15%감점,100점범례,팀디자인 확인. 지도 라벨 축약/최상단 렌더 후 재확인 완료. data-chip-390.png에서 실제 데이터 안내 표시 확인.

## 게시/남은 사항

게시 절차: 검증된 작업 브랜치 커밋→main ff-only→push (사용자 명시 승인). 배포 상태는 해당 커밋의 Vercel 체크로 확인하고 공개 서비스 golden 검증을 남긴다.
공개 서비스 확인: https://void-2122.vercel.app (배포 후 golden 검사 필요).
HACKATHON.md/.env.local/.local/evidence는 Git 제외. 두 실제 자격증명이 변경 파일에 포함되지 않음을 확인.
리뷰·영업시간·비프랜차이즈 조사 완료를 뜻하지 않음. 사실값·공개 출처를 계속 보완할 대상이다. 프랜차이즈 전수제외 보증 아님.
Node22/Chromium: /private/tmp/ansan-visit-runtime; preview3002. 안전 stash 세 개 남겨 둠 (이전 복원용).

최신 c5e1a94의 떠 있는 안내 칩은 디자인/키보드/터치 동작을 보존하고 실제 데이터 안내로 전환. 가상 모드 전환은 제거.

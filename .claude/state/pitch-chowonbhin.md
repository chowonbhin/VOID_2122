# chowonbhin — 담당 시연 및 실행 안내 초안

사용자 요청에 따라 시간표와 마감에 따른 단계 강제는 하지 않는다. 최종 대본과 PPT는 팀장이 조립한다.

## 담당 2단계 대사

“관심 활동을 고르고 탐험을 시작하면 안산의 25개 행정동 지도가 나옵니다. 동네에 익숙해진 정도를 색으로 보고, 오늘 추천하는 동네와 장소를 살펴볼 수 있습니다.”

화면 조작: 새 브라우저에서 ‘6개월이 안 됐어요’ → 다음 → 관심 활동 → 탐험 시작 → 지도와 장소 추천 확인.

## 팀장에게 전달할 전체 흐름 초안

- 문제: “새 동네에서 어디부터 가야 할지 막막할 때, 익숙한 곳만 반복해서 찾게 됩니다. 안산에 스며들다는 내 관심과 방문 경험을 바탕으로 다음에 둘러볼 동네를 찾도록 돕습니다.”
- 1단계: 거주 경험과 관심 활동을 선택합니다. (Byeunghee02 최종 검토)
- 2단계: 25개 동 지도에서 오늘의 추천 동네와 장소를 살펴봅니다. (chowonbhin)
- 3단계: 본오1동을 열어 발견할 20곳과 지도 위치를 확인합니다. (iwtkmn0219 최종 검토)
- 4단계: 바바카멜의 방문 기록을 열고 방문 날짜를 남깁니다. (zT4ek 최종 검토)
- 5단계: 지도와 동네 화면을 다시 열고 새로고침해 기록이 남아 있는지 확인합니다. (zT4ek 최종 검토)
- 다음 계획 제안: “운영 정보와 지역 자료의 확인 범위를 넓히고, 여러 기기에서 기록을 이어갈 수 있도록 발전시키려 합니다.” 구현 완료가 아닌 팀장 검토용 제안이다.

## 제출 설명 초안

안산에 스며들다는 관심 활동과 방문 경험을 바탕으로 안산의 동네와 실제 장소를 탐색하는 웹 앱입니다. 행정동 지도에서 장소를 찾고 방문 날짜를 기록할 수 있습니다.
React·TypeScript·Vite를 사용합니다. 수집된 장소·행정동·유동인구 JSON을 브라우저에서 읽어 규칙으로 추천하고, 방문 기록은 브라우저에 저장합니다. 서버 계정 동기화나 실시간 네이버 검색을 구현했다고 설명하지 않습니다.

```text
수집·정리된 JSON → 브라우저 추천 계산 → 지도·장소 목록
                       ↑                    ↓
                  방문 기록 ← 브라우저 저장소
```

## 실행과 복구 카드

- 공개 URL: https://void-2122.vercel.app/
- 현재 로컬: http://127.0.0.1:3011/ (공개본보다 한 커밋 이전 UI)
- Node: 22.x 중 22.12 이상. 프로젝트의 npm 버전 고정 설정은 아직 없음.
- 새 체크아웃: `npm ci`, `npm run dev` 순서로 실행. 기본 주소 http://localhost:3000/.
- 빌드 미리보기: `npm run build`, `npm run preview` 순서로 실행.
- 초기 상태 시연은 새 비공개 창 사용. 기존 사용자 저장소를 지우지 않는다.
- 인터넷 장애: 이미 실행 중인 로컬 미리보기 또는 evidence 스크린샷 사용. 오프라인 서비스 워커는 보장하지 않는다.
- 재현: `node scripts/verify.mjs --url https://void-2122.vercel.app/`, 이어서 같은 명령에 `--mobile` 추가.
- 공개본은 84f688a 테스트 기준 PC·모바일 5/5 통과. 기존 브랜치 테스트는 옛 리뷰 문구를 요구하므로 3단계에서 실패한다.
- PC evidence: `.claude/state/evidence/2026-11-08T05-32-31/`.
- 모바일 evidence: `.claude/state/evidence/2026-11-08T05-32-40-mobile/`.
- 백업: 각 폴더의 `run1-step-02.png` 지도, `run1-step-03.png` 장소, `run1-step-04.png` 방문 기록.
- reset 스크립트와 fallback 플래그는 없음. 자동 검증은 사람의 발표 리허설을 대신하지 않음.

## Pitch playbook 체크리스트 (원문)

- [x] Write the demo script from `golden-path.md`: one line of narration per step, plus a 20-second problem statement before and a 20-second "what's next" after. Total under the time limit with 30 seconds to spare.
  - 담당 대사와 전체 흐름 초안 작성. 시간 조건은 사용자 요청으로 적용하지 않았다.
- [x] Every claim in the script must be visible in the app. Remove claims about features that were cut.
  - 내부 점수·리뷰 수가 화면에 표시된다는 주장과 서버 동기화·실시간 검색 주장을 제외했다. 향후 계획은 제안으로 구분했다.
- [ ] Build the slides (PPT): problem, solution in one sentence, live demo (or the harden screenshots as backup), how it works (one architecture diagram), what's next. One idea per slide; put the screenshots from harden on the demo-backup slide in case the live demo fails.
  - 팀장 조립 담당. 문구·구조도·백업 이미지 경로를 준비했으며 PPT는 생성하지 않았다.
- [x] Write the README / submission text: problem, what it does, how it works (stack, one architecture sentence), how to run. Short sentences; cut filler.
  - 위 제출 설명과 실행 안내를 검토용 초안으로 준비했다.
- [ ] Do a full rehearsal with the reset script and the deployed URL. Then do one with the fallback flag on. Fix only wording or ordering, not code, unless a golden-path step actually breaks.
  - 공개 URL 자동 시연은 PC·모바일 통과. reset/fallback 기능은 없어 해당 모드는 적용 불가. 사람의 대본 리허설은 미실시.
- [x] Final `handoff-<you>.md`: URLs, submission links, and the recovery card.
  - handoff-chowonbhin.md 갱신. 제출 링크는 제공받지 않아 기재하지 않았다.

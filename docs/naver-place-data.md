# 네이버 후보 수집과 장소별 방문·리뷰 수

2026-11-08 기준. 신규 발급 키는 **NAVER API HUB**용이다. 기존 개발자센터 방식의 안내는 아래 내용으로 정정한다. 상위 20개 선정·재선정과 감점 계산은 별도 입력 데이터로 검증하며, 검토 완료 데이터와 검색 후보를 구분한다.

## 1. 검색 API 키 발급

1. 네이버 클라우드 플랫폼 콘솔에서 **All Services → Application Services → NAVER API HUB**로 이동한다.
2. **Subscription → 서비스 이용 신청** 후 **Application → Application 등록**에서 **NAVER 검색 → 지역**을 선택한다. [공식 등록 안내](https://guide.ncloud-docs.com/docs/apihub-application).
3. **인증 정보**의 Client ID와 Client Secret을 프로젝트 루트의 `.env.local`에 넣고 파일을 저장한다. 파일은 Git에서 제외된다.

개발자센터의 검색 신규 신청은 2026-07-31 종료되어 해당 메뉴가 보이지 않는다. [이관 공지](https://developers.naver.com/notice/article/32530). 2026-11-08 확인 기준 API HUB는 한시적 무료이며 유료 전환 시 사전 공지한다. 검색 카테고리는 월 775,000회 한도에 도달하면 호출이 차단된다. [이용 조건](https://guide.ncloud-docs.com/docs/apihub-overview).

```dotenv
NAVER_CLIENT_ID=발급받은_ID
NAVER_CLIENT_SECRET=발급받은_SECRET
```

키를 채팅이나 JSON 데이터에 넣지 않고 `VITE_` 접두사도 붙이지 않는다. 이 키는 로컬 수집 스크립트만 읽으며 브라우저 앱에 전달하지 않는다.

호출 주소는 `https://naverapihub.apigw.ntruss.com/search/v1/local`이고 헤더는 `X-NCP-APIGW-API-KEY-ID` / `X-NCP-APIGW-API-KEY`다. 이전 개발자센터의 주소·헤더와 혼용하지 않는다. [현재 지역검색 API 명세](https://api.ncloud-docs.com/docs/naver-api-hub-search-local).

## 2. 행정동별 후보 수집

프로젝트 루트에서 Node.js 22.12 이상으로 실행한다. 다음 예시는 중앙동을 수집하며 `--dong`에는 25개 동의 이름 또는 `dong-행정기관코드`를 넣을 수 있다.

```sh
node --experimental-strip-types --env-file=.env.local scripts/collect-naver-places.mjs --dong 중앙동
```

공원·박물관·미술관·전시관·독립서점·공방·시장·체험관·문화공간·맛집·카페·관광명소의 12개 검색어를 사용한다. 검색 결과의 좌표를 행정동 경계와 대조하고 이름·주소로 중복을 제거한다. 경계 밖 또는 좌표가 잘못된 결과는 제외한다.

- [공식 지역검색 API](https://api.ncloud-docs.com/docs/naver-api-hub-search-local)는 `display` 최대 5, `start` 1이다. 현재 `sort=random`(정확도순), `format=json`을 사용한다. 여러 검색어의 합집합이며 **네이버지도 화면 상위 20위와 같은 목록이 아니다**.
- 최대 60개 원본 응답에서 중복·경계 검토를 거치므로 20개 이상 확보를 보장하지 않는다. 필요하면 검색어와 후보 조사 범위를 확장한다.
- 응답에는 방문·리뷰 수와 영업시간이 없다. `sort=comment` 순서도 리뷰 수의 실측값으로 사용하지 않는다.
- 결과는 Git 제외 경로 `.local/naver-행정기관코드.json`에 저장된다. 갱신 시 `--out .local/다른파일명.json`을 지정한다. 기존 파일은 덮어쓰지 않으며 요청 실패 시 부분 결과를 앱에 반영하지 않는다.
- API 응답만으로 비프랜차이즈·운영 확인·리뷰 수를 추정하지 않는다. 수집 파일의 검토 상태는 모두 `unknown`에서 시작한다.

## 3. 검토 후 앱 데이터로 반영

수집 결과는 곧바로 추천 목록이 되지 않는다. 후보를 검토해 [Place 타입](../src/domain/types.ts)에 맞는 전체 레코드를 `src/data/naver-places.json` 배열에 추가한다. 앱은 이 파일을 기존 장소와 합치고 동별 소속을 다시 만든다. 기존 장소를 갱신할 때는 같은 ID를 유지해 방문 기록을 보존한다. 신규 장소는 수집 ID를 유지한다.

| 필드 | 확인할 내용 |
| --- | --- |
| regionId, location, address, regionSource | 행정동 경계·공식 주소·소속 근거. 법정동과 행정동 구분 |
| name, category, searchSource | 검색명·앱 분류·검색 출처와 확인일 |
| franchise | 가맹점과 동일 브랜드 직영 체인 여부. `non_franchise`는 근거·확인일 필수 |
| opening, source | 요일별 시간·휴무·입장 마감·검토 기간·공식 출처. 미확인 시 `status: unknown` |
| popularityEvidence | 제공자·지표·개별 장소 수치·기간·출처 URL·확인일 |
| baseValue, isVirtual | 기본 가치는 현재 0~100 시연 기준. 실제 장소는 `isVirtual: false` |

실제 수치는 직접 확인 가능한 네이버 장소 정보 또는 운영기관 자료에서 별도로 확보한다. 수집 시 서비스 이용 조건을 확인한다. 없는 수치를 만들지 않고 확인된 0과 미확인을 구분한다. 수치가 없으면 `popularityEvidence`를 생략한다. 실제 장소에 가상 `popularity`를 넣어도 점수에 사용하지 않는다.

`popularityEvidence` 계약:

- `provider`: `naver_place` 또는 `operator`
- `metric`: `visitor_reviews`(방문자 리뷰 수), `blog_reviews`(블로그 리뷰 수), `visits`(운영기관 방문수)
- `count`: 확인된 0 이상의 정수. 리뷰 수는 실제 총방문자 수가 아니다.
- `period`: 누적이면 `cumulative`, 월별 집계면 `YYYY-MM`. 서로 다른 기간·지표를 더하지 않는다.
- `source`: 실제 확인한 자료의 `label`, `url`, `checkedAt`(YYYY-MM-DD)

가능하면 같은 시점·지표로 동별 후보를 조사한다. 현재 제공자·지표·기간이 같으면 같은 정규화 집단으로 사용하며 출처 확인일의 자동 만료는 구현하지 않았다. 데이터 갱신 시 함께 재확인한다.

## 4. 점수와 재선정

1. 출처 있는 비프랜차이즈 후보를 유지한다. 프랜차이즈·분류 미확인은 탐색에서도 제외한다.
2. 같은 데이터 묶음의 제공자·지표·기간별 최대 수치로 `P=ln(1+count)/ln(1+maxCount)`를 계산한다. 모두 확인된 0이면 P=0. 운영·관심사 필터와 상위 20개 선택 전에 기준을 고정한다.
3. 운영·관심사·인지도 자료 조건을 통과한 장소에 `max(0, B−w(Lv)×P)+행사 가점`을 적용한다. `w=0/10/20/30`이므로 Lv.0은 인지도 감점이 없다.
4. 장소 점수 내림차순·동점 ID 순으로 최대 20개를 고른다. 전체 후보를 보관하고 방문·삭제·조건 변경 시 다시 계산한다. 방문 후에도 점수가 높으면 기존 장소가 남을 수 있다.
5. 지역 점수는 `max(0,상위20개 합계+유동인구 조정)×새로움×거리`다. 20개 미만은 확보한 수만 합산하고 `N/20개`와 부족 안내를 표시한다.

이는 초기 정규화 방식이다. 동마다 비교 분모를 새로 잡지 않으며 사용자의 방문 한 번으로 정규화 기준이 바뀌지 않는다. 후보 데이터 자체를 갱신하면 기준 최대값이 바뀔 수 있다. 기본 가치·가중치의 추천 효과는 별도 사용 테스트가 필요하다.

## 5. 반영 전 검증

```sh
npm test
npm run build
node --experimental-strip-types --test scripts/naver-candidates.test.mjs
node scripts/verify.mjs --url http://127.0.0.1:3002 --runs 3
```

브라우저 검증 전 해당 주소에서 최신 빌드의 서버를 실행한다. 점수 계산뿐 아니라 N/20·부족 안내·수치 출처·미확인 상태·방문 후 재선정을 확인한다. 2026-11-08 사용자 승인에 따라 검증 완료 후 main에 반영한다.

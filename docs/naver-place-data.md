# 네이버 후보 수집과 장소별 방문·리뷰 수

> 2026-11-08 갱신: 현재 운영 스냅샷은 실제 검색 후보 2,329곳에서 수록한 1,930곳, 리뷰 수 연결 300곳이다. 25개 동에서 실제 추천 20곳을 표시하고 동일한 20곳 전부로 0~100점을 계산한다. 미확인 정보는 잠정 계산임을 표시한다. 아래 초기 수집 기록과 현재 상태를 구분하고, 최신 기준·제약·재수집 명령은 [실제 장소 콘텐츠 계약](../src/data/README.md)을 따른다.


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

1. 실제 검색 출처·좌표가 있는 후보를 사용한다. 확인된 프랜차이즈·체인 의심 후보를 제외하며, 분류 미확인은 확정으로 표현하지 않고 잠정 계산에 포함한다.
2. 출처가 있는 개별 수치에 `P=ln(1+count)/ln(1+maxCount)`를 적용한다. 제공자·지표·기간별 기준을 검색 조건과 무관하게 고정한다. 미확인 count는 만들지 않고 최대 인지도 감점 계수 1을 보수적으로 사용한다.
3. 확인된 휴무와 관심 활동 불일치는 제외한다. 운영 미확인은 잠정 점수로 남기고 방문 전 확인을 안내한다. 장소 점수는 `max(0,B-w[Lv]*P)+E`, w=(0,10,20,30)이다.
4. 전체 후보에서 점수 내림차순·동점은 자료 검토 완료 우선·ID 순으로 20곳을 골라 표시하고 **동일한 20곳 전부**를 지역 점수에 넣는다. 방문·수정·삭제·조건 변경 시 전체 후보에서 다시 선정한다.
5. 기본 점수는 `sum(top20)/(20*110)*100`. 여기에 유동인구 감점률(최대0/15/30%)과 새로움/1.2, 거리 배율을 곱해 최종 0~100점을 얻는다. 조건에 맞는 후보가 부족할 때만 N/20을 표시하고 고정 분모를 유지한다.

이 정책은 최신 사용자 요청에 따른다. 원자료 숫자·미확인 상태를 그대로 유지하며 잠정 계산과 검증된 정보는 구별한다. 현재 결과 집합의 최대값으로 지역 점수를 늘리지 않는다. 가중치의 추천 효과는 후속 사용 테스트 대상이다. [현재 계약과 11개 동별 유동인구 감점률](../src/data/README.md).

## 5. 반영 전 검증

```sh
npm test
npm run build
node --experimental-strip-types --test scripts/naver-candidates.test.mjs
node scripts/verify.mjs --url http://127.0.0.1:3002 --runs 3
```

브라우저 검증 전 해당 주소에서 최신 빌드의 서버를 실행한다. 점수 계산뿐 아니라 N/20·부족 안내·수치 출처·미확인 상태·방문 후 재선정을 확인한다. 2026-11-08 사용자 승인에 따라 검증 완료 후 main에 반영한다.

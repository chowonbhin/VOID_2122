# 안산 행정동 경계

- 25개 행정동: 상록구 13개, 단원구 12개. 명칭을 [안산시 행정구역 현황](https://www.ansan.go.kr/stat/common/cntnts/selectContents.do?cntnts_id=C0001013)과 대조했다(확인 2026-11-08). 해당 표의 계 30은 법정동 수이므로 행정동 수로 사용하지 않는다. 안산시 지도 이미지는 복제·변형하지 않았다.
- 경계 원본: [vuski/admdongkor ver20261001](https://github.com/vuski/admdongkor/blob/master/ver20261001/HangJeongDong_ver20261001.geojson), Git blob SHA `877acdc676ee332414cd0d6dd0a2b143dbfbd7d7`.
- 원본의 `sgg=41271/41273`만 추출했다. 좌표는 WGS84 경도·위도이며 MultiPolygon의 섬과 구멍을 보존했다. 원본 파일 SHA-256은 `admin-dongs.json.sourceSha256`에 기록한다.
- 재생성: 원본 다운로드 후 `node scripts/import-admin-dongs.mjs <원본.geojson>`. 빌드·브라우저에서는 네트워크를 사용하지 않는다. 전체 전국 원본(약 33 MB)은 저장소에 포함하지 않는다.
- `adm_cd2`(10자리 행정기관 코드)로 `dong-<code>` ID를 만든다. `labelPoint`는 경계 내부에서 가장자리 여유가 큰 샘플 지점이며 주민센터·출입구가 아니다.
- SVG는 위도에 따른 경도 축척을 적용하고 shared edge를 그대로 보존한다. 둥근 stroke join만 적용한다. 대부동 전체(도서 포함)는 전체 지도에서 별도 축척의 삽입도로 표시한다. 구별 확대·키보드 선택·동 목록을 함께 제공한다.
- 원자료에 오차가 있을 수 있으며 법적 경계 확정이나 길찾기 용도가 아니다.

본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다.

이 저장소의 추가 가공: 안산 추출, 내부 표시점 생성, SVG 투영 및 대부동 삽입도 배치. 원본 라이선스 전문은 [LICENSE-DATA.txt](LICENSE-DATA.txt), 가공 데이터의 조건은 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)을 따른다.

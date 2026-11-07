// No synthetic locations, counts, categories or opening hours. Missing data stays missing.
export const normalizeName = value => value.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
export function categoryFor(value) {
  if (/유흥주점|초등학교|임대업|홍보관|얼음|부동산|장례|병원|학원|주차장|출입구|화장실|대피소|관리사무소/.test(value)) return null;
  if (/박물관|미술관|전시|도서관|문화시설|문화재|공연/.test(value)) return 'culture';
  if (/공방|볼링|클라이밍|체험|오락시설|방탈출|레저|스포츠시설/.test(value)) return 'activity';
  if (/시장|상가,아케이드/.test(value)) return 'market';
  if (/공원|식물원|여행,명소|수목원/.test(value)) return 'nature';
  if (/음식점|한식>|중식>|일식>|양식>|분식>|카페|베이커리|음식료품/.test(value)) return 'food';
  return null;
}
// A conservative discovery exclusion, not proof that every matching business is franchised.
const chain = /스타벅스|투썸|메가.*커피|컴포즈|빽다방|이디야|할리스|파리바게|뚜레쥬르|배스킨|던킨|맥도날드|롯데리아|버거킹|맘스터치|서브웨이|써브웨이|이삭토스트|신전떡볶이|엽기떡볶이|명랑핫도그|역전할머니|홍콩반점|빽보이|본죽|본도시락|한솥|교촌|bhc|bbq|비비큐|굽네|네네치킨|처갓집|노랑통닭|피자스쿨|도미노|피자헛|청년다방|노브랜드|세븐일레븐|이마트|cu\b|gs25|커피마마|뽁식당|남월|그라츠커피|철길부산집|달리는커피|싹쓰리|노군꼬치|고기싸롱|응급실국물|맛찬들|설문동본갈비|백스비어|와드커피|코끼리찹쌀|경성찹쌀|수내닭꼬치|효자동솥뚜껑|만월경|투몬스터|바르바커피|천냥빵|에바돈가츠|명륜진사|김밥천국|김밥나라|김가네|토마토김밥|국수나무|채선당|샤브향|두끼|육대장|신의주|할매순대국|크라운호프|청담동말자|가장맛있는족발|큰맘|홍익돈까스|홍익궁중|한신포차|용용선생|깡우동|지코바|호식이|처갓집|봉구스|한촌설렁탕|육수당|본설렁탕|땅스부대찌개|놀부|보드람|노모어피자|감성커피|더벤티|매머드|요거프레소|셀렉토|탐앤탐스|커피베이|커피에반하다|커피빈|공차|쥬씨|쥬스스타|읍천리|빵위에치즈|봉구비어|와플대학|와플칸|청자다방|정성순대|이백장돈가스|뜸들이다|프랭크버거|뉴욕버거|에그드랍|써브웨이|빨봉분식|청년피자|반올림피자|60계|푸라닭|호치킨|바른치킨|또래오래|멕시카나|또봉이|치킨플러스|자담치킨|호식이|장모님치킨|피자마루|7번가피자|빅스타피자|배떡|응떡|삼첩분식|배달의쌀국수|포메인|미분당|소담촌|등촌샤브|유가네|홍춘천|신참떡볶이|점$|본점|지점|본사|지사|체인|가맹/i;
export const chainConcern = name => chain.test(name) ? '브랜드·본점·지점 표기 포함 · 체인 여부 확인 전 제외' : undefined;
export function distanceMeters(a, b) {
  const dy = (a.lat - b.lat) * 111320;
  const dx = (a.lng - b.lng) * 111320 * Math.cos(a.lat * Math.PI / 180);
  return Math.hypot(dx, dy);
}
export function matchedEvidence(candidate, evidence) {
  // Name, road address and coordinates must all agree. Never join by name alone.
  // Preserve the boundary between building number and floor/unit numbers.
  const road = value => value.match(/안산시\s*(?:상록|단원)구\s*\S+(?:로|길)(?:\d+번길)?\s+\d+(?:-\d+)?(?=\s|$)/)?.[0].replace(/\s+/g, '');
  return evidence.find(e => normalizeName(e.name) === normalizeName(candidate.name)
    && e.geo && distanceMeters(candidate.location, { lat: e.geo.latitude, lng: e.geo.longitude }) <= 60
    && road(candidate.address) && road(candidate.address) === road(e.address?.streetAddress ?? ''));
}
export function openingFromEvidence(evidence) {
  if (!evidence) return { status: 'unknown' };
  const weekly = {}, unknownDays = [];
  // Only complete simple daily intervals are accepted. Overnight, break-time or
  // ambiguous schedules stay unknown until reviewed; never infer all-day opening.
  for (const [day, label] of ['일', '월', '화', '수', '목', '금', '토'].entries()) {
    const value = evidence.hoursWeekly[label];
    const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(value ?? '');
    if (match && match[1] < match[2] && !evidence.complexHours) weekly[day] = [{ open: match[1], close: match[2] }];
    else if (value === '휴무') weekly[day] = [];
    else unknownDays.push(day);
  }
  return { status: Object.keys(weekly).length ? 'known' : 'unknown', weekly, unknownDays,
    entryCondition: '공개 시간표 기준 · 휴게시간·주문 마감·임시휴무는 매장 안내 확인' };
}

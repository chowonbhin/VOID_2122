// Offline candidate collection only. Requires Node 22 --experimental-strip-types.
// Reviewed records are promoted separately; search results alone never imply eligibility.
import fs from 'node:fs';
import path from 'node:path';
import { SEARCH_TERMS, searchNaver, normalizeCandidate, mergeCandidates } from './lib/naver-candidates.mjs';
const args = process.argv.slice(2);
const dongName = args[args.indexOf('--dong') + 1];
if (!args.includes('--dong') || !dongName) {
  console.error('Usage: node --experimental-strip-types --env-file=.env.local scripts/collect-naver-places.mjs --dong 중앙동 [--out .local/naver-central.json]'); process.exit(1);
}
const geography = JSON.parse(fs.readFileSync('src/data/geography/admin-dongs.json', 'utf8'));
const region = geography.dongs.find(d => d.name === dongName || d.id === dongName);
if (!region) { console.error('UNKNOWN_ANSAN_DONG'); process.exit(1); }
const credentials = { clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET };
if (!credentials.clientId?.trim() || !credentials.clientSecret?.trim()) { console.error('NAVER_CREDENTIALS_MISSING: .env.local의 두 키를 설정해 주세요.'); process.exit(1); }
const output = args.includes('--out') ? args[args.indexOf('--out') + 1] : `.local/naver-${region.adminCode}.json`;
const checkedAt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const candidates = [], queries = [];
try {
  for (const term of SEARCH_TERMS) {
    const query = `안산시 ${region.district} ${region.name} ${term}`;
    const items = await searchNaver(query, credentials);
    const normalized = items.map((item, i) => normalizeCandidate(item, region, query, i + 1, checkedAt)).filter(Boolean);
    candidates.push(...normalized);
    queries.push({ query, returned: items.length, keptInDong: normalized.length });
  }
  const unique = mergeCandidates(candidates);
  const snapshot = { provider: 'naver_api_hub_local', checkedAt, regionId: region.id, sort: 'random', queries, candidates: unique,
    note: '여러 검색어의 합집합. 네이버지도 화면 상위 20위가 아님. 운영·프랜차이즈·방문/리뷰 수 검토 전에는 점수 데이터로 사용하지 않음.' };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  // Exclusive creation prevents an interrupted/failed refresh from destroying an existing snapshot.
  fs.writeFileSync(output, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  console.log(`Collected ${unique.length} unique in-dong candidates from ${queries.length} queries: ${output}`);
} catch (error) { console.error(error.code === 'EEXIST' ? 'OUTPUT_ALREADY_EXISTS: 새 출력 파일명을 지정해 주세요.' : error.message); process.exitCode = 1; }

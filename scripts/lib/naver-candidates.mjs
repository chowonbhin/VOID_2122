import { createHash } from 'node:crypto';
import { containsPoint } from '../../src/features/map/geometry.ts';

export const SEARCH_TERMS = ['공원', '박물관', '미술관', '전시관', '독립서점', '공방', '시장', '체험관', '문화공간', '맛집', '카페', '관광명소'];
const text = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&(amp|quot|apos|lt|gt);/g, (_, entity) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[entity])).replace(/\s+/g, ' ').trim();
function coordinate(value, limit) {
  if (value === '' || value === undefined || value === null) return NaN;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.abs(n) <= limit ? n : n / 10_000_000;
}
export function normalizeCandidate(item, region, query, rank, checkedAt) {
  if (!item || typeof item !== 'object') return null;
  const name = text(item.title), address = text(item.roadAddress || item.address);
  const location = { lat: coordinate(item.mapy, 90), lng: coordinate(item.mapx, 180) };
  if (!name || !address || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)
    || !containsPoint(region, location)) return null;
  const identity = `${name.normalize('NFKC').toLowerCase()}|${address.normalize('NFKC').replace(/\s+/g, '')}`;
  let website;
  try { const u = new URL(item.link); if (['http:', 'https:'].includes(u.protocol)) website = u.href; } catch { /* no public site */ }
  return {
    id: `naver-${createHash('sha256').update(identity).digest('hex').slice(0, 20)}`,
    regionId: region.id, name, address, location, naverCategory: text(item.category), website,
    searchSource: { label: '네이버 지역검색 API · 후보 수집 (지도 화면 순위와 별개)',
      url: `https://map.naver.com/p/search/${encodeURIComponent(`${region.name} ${name}`)}`, checkedAt },
    queries: [{ query, rank }],
    reviewStatus: { opening: 'unknown', franchise: 'unknown', popularity: 'unknown' },
  };
}
export function mergeCandidates(candidates) {
  const byId = new Map();
  for (const candidate of candidates) {
    const old = byId.get(candidate.id);
    if (!old) byId.set(candidate.id, structuredClone(candidate));
    else for (const q of candidate.queries) if (!old.queries.some(x => x.query === q.query)) old.queries.push(q);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
export async function searchNaver(query, credentials, fetcher = fetch) {
  if (!credentials.clientId?.trim() || !credentials.clientSecret?.trim()) throw new Error('NAVER_CREDENTIALS_MISSING');
  // New applications are issued by NAVER API HUB (NCP), not Developers Center.
  const url = new URL('https://naverapihub.apigw.ntruss.com/search/v1/local');
  url.search = new URLSearchParams({ query, display: '5', start: '1', sort: 'random', format: 'json' }).toString();
  let response;
  try {
    response = await fetcher(url, { headers: { 'X-NCP-APIGW-API-KEY-ID': credentials.clientId.trim(), 'X-NCP-APIGW-API-KEY': credentials.clientSecret.trim() }, signal: AbortSignal.timeout(8000), redirect: 'error' });
  } catch { throw new Error('NAVER_NETWORK_OR_TIMEOUT'); }
  // Never log credentials, request headers, or arbitrary error bodies.
  if (!response.ok) throw new Error(`NAVER_HTTP_${response.status}`);
  let body;
  try { body = await response.json(); } catch { throw new Error('NAVER_INVALID_RESPONSE'); }
  if (!body || !Array.isArray(body.items) || body.items.length > 5) throw new Error('NAVER_INVALID_RESPONSE');
  return body.items;
}

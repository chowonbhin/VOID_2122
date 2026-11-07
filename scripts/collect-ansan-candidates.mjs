// Actual NAVER results only. Assign every returned place to its coordinate's dong,
// including results outside the queried dong; retain provenance and missing fields.
import fs from 'node:fs';
import path from 'node:path';
import { searchNaver, normalizeCandidate, mergeCandidates } from './lib/naver-candidates.mjs';
import { containsPoint } from '../src/features/map/geometry.ts';
import { categoryFor, chainConcern } from './lib/real-place-import.mjs';

const args = process.argv.slice(2);
const argument = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const output = argument('--out', '.local/ansan-real-candidates');
const target = Number(argument('--target', '25'));
const maxRequests = Number(argument('--max-requests', '1800'));
if (!Number.isSafeInteger(target) || target < 21 || !Number.isSafeInteger(maxRequests) || maxRequests < 1) {
  throw new Error('--target must be at least 21; --max-requests must be a positive integer');
}
const dongs = JSON.parse(fs.readFileSync('src/data/geography/admin-dongs.json', 'utf8')).dongs;
const credentials = { clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET };
const checkedAt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
fs.mkdirSync(output, { recursive: true });
const snapshotPath = path.join(output, 'candidates.json');
const prior = fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) : null;
const logs = prior?.queries ?? [];
const seenQueries = new Set(logs.map(log => log.query));
const seedDirectory = argument('--seed-dir', '');
const seeds = prior?.candidates ?? (seedDirectory ? fs.readdirSync(seedDirectory).filter(name => /^\d+\.json$/.test(name))
  .flatMap(name => JSON.parse(fs.readFileSync(path.join(seedDirectory, name), 'utf8')).candidates) : []);
let candidates = mergeCandidates(seeds);
let requests = 0;
const relevant = place => categoryFor(place.naverCategory) && !chainConcern(place.name);
function counts() { return dongs.map(d => ({ name: d.name, regionId: d.id, count: candidates.filter(p => p.regionId === d.id && relevant(p)).length })); }
function save() { fs.writeFileSync(snapshotPath, JSON.stringify({ provider: 'naver_api_hub_local', checkedAt, queries: logs, candidates, counts: counts() }, null, 2) + '\n'); }
async function collect(query) {
  if (seenQueries.has(query) || requests >= maxRequests) return;
  const items = await searchNaver(query, credentials);
  requests++; seenQueries.add(query);
  const kept = []; const rejected = { outsideAnsan: 0, malformed: 0 };
  items.forEach((item, index) => {
    const lat = Number(item.mapy) / (Math.abs(Number(item.mapy)) > 90 ? 10_000_000 : 1);
    const lng = Number(item.mapx) / (Math.abs(Number(item.mapx)) > 180 ? 10_000_000 : 1);
    const dong = dongs.find(d => containsPoint(d, { lat, lng }));
    if (!dong) { rejected.outsideAnsan++; return; }
    const normalized = normalizeCandidate(item, dong, query, index + 1, checkedAt);
    if (normalized) kept.push(normalized); else rejected.malformed++;
  });
  candidates = mergeCandidates([...candidates, ...kept]);
  logs.push({ query, returned: items.length, accepted: kept.length, rejected });
  fs.appendFileSync(path.join(output, 'responses.jsonl'), JSON.stringify({ query, checkedAt, items }) + '\n');
  if (requests % 25 === 0) { save(); console.log(JSON.stringify({ requests, unique: candidates.length, underTarget: counts().filter(d => d.count < target) })); }
}
const terms = ['한식', '카페', '분식', '국수', '중식', '일식', '베이커리', '돈까스', '고기집', '횟집', '칼국수', '디저트', '브런치', '양식', '공방', '도서관', '공원', '문화공간', '체험', '볼링', '백반', '국밥', '순대국', '해장국', '냉면', '김밥', '떡볶이', '만두', '족발', '삼겹살', '감자탕', '곱창', '닭갈비', '쌀국수', '초밥', '우동', '파스타', '피자', '찜닭', '찌개', '해산물', '떡집', '반찬', '전통시장', '전시', '독립서점', '도예', '방탈출'];
const aliases = { '중앙동': ['고잔동 중앙역', '중앙역'], '호수동': ['고잔동 호수동', '고잔신도시'], '백운동': ['원곡동 라성', '라성시장'], '선부1동': ['선부동 선부역'], '선부2동': ['선부동 석수골'], '선부3동': ['선부동 선부광장'], '사이동': ['사동 감골', '사동 시곡'], '해양동': ['사동 해양동', '한양대 에리카'], '본오1동': ['본오동 본오1동'], '본오2동': ['본오동 본오2동'], '본오3동': ['본오동 상록수역'], '대부동': ['대부도'] };
try {
  // Optional public evidence names are looked up through the official API too;
  // coordinates and addresses still have to pass the importer's independent join.
  const evidenceFile = argument('--evidence', '');
  if (evidenceFile) for (const record of JSON.parse(fs.readFileSync(evidenceFile, 'utf8'))) {
    await collect(`안산 ${record.name}`);
  }
  // Cycle through all dongs before advancing a term, so each area gets collection coverage.
  for (const term of terms) for (const dong of dongs) {
    if (counts().find(d => d.regionId === dong.id).count < target) await collect(`안산 ${dong.name} ${term}`);
  }
  // Administrative names may not appear in NAVER addresses. Use local place/road anchors,
  // but continue to decide membership exclusively by the actual returned coordinates.
  for (const dong of dongs) {
    const roads = [...new Set(candidates.filter(p => p.regionId === dong.id).map(p => p.address.match(/(?:구|시)\s+(\S+(?:로|길)(?:\d+번길)?)/)?.[1]).filter(Boolean))].slice(0, 8);
    for (const anchor of [...(aliases[dong.name] ?? []), ...roads]) {
      for (const term of terms) {
        if (counts().find(d => d.regionId === dong.id).count >= target || requests >= maxRequests) break;
        await collect(`안산 ${anchor} ${term}`);
      }
    }
  }
  save(); console.log(JSON.stringify({ complete: true, requests, totalRequests: logs.length, unique: candidates.length, counts: counts() }));
} catch (error) { save(); console.error(error.message); process.exitCode = 1; }

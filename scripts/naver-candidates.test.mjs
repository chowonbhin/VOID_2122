import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mergeCandidates, normalizeCandidate, searchNaver } from './lib/naver-candidates.mjs';
const region = JSON.parse(fs.readFileSync('src/data/geography/admin-dongs.json')).dongs.find(d => d.name === '중앙동');
const item = { title: '<b>검증용</b> 가게', roadAddress: '경기도 안산시 단원구 검증로 1', mapx: '1268395294', mapy: '373170302', category: '테스트', link: 'https://example.com/' };
const candidate = query => normalizeCandidate(item, region, query, 1, '2026-11-08');
test('candidate import retains source and unknown review fields, validates boundary and strips markup', () => {
  const p = candidate('안산 중앙동 카페');
  assert.equal(p.name, '검증용 가게');
  assert.equal(p.location.lat, 37.3170302);
  assert.equal(p.regionId, region.id);
  assert.deepEqual(p.reviewStatus, { opening: 'unknown', franchise: 'unknown', popularity: 'unknown' });
  assert.equal(normalizeCandidate({ ...item, mapx: '1270000000', mapy: '375000000' }, region, 'q', 1, '2026-11-08'), null);
  assert.equal(normalizeCandidate({ ...item, mapx: '' }, region, 'q', 1, '2026-11-08'), null);
  assert.equal(normalizeCandidate(null, region, 'q', 1, '2026-11-08'), null);
});
test('same place found by multiple queries is stored once with both provenance records', () => {
  const a = candidate('안산 중앙동 카페'), b = candidate('안산 중앙동 맛집');
  const result = mergeCandidates([a, b, a]);
  assert.equal(result.length, 1);
  assert.equal(result[0].queries.length, 2);
  assert.equal(a.queries.length, 1);
});
test('search uses API HUB authentication and five-result cap without putting credentials in URL', async () => {
  const calls = [];
  const found = await searchNaver('안산 중앙동', { clientId: 'test-id', clientSecret: 'test-secret' }, async (url, options) => {
    calls.push({ url, options }); return { ok: true, json: async () => ({ items: [item] }) };
  });
  assert.equal(found.length, 1);
  assert.equal(calls[0].url.origin, 'https://naverapihub.apigw.ntruss.com');
  assert.equal(calls[0].url.pathname, '/search/v1/local');
  assert.deepEqual(calls[0].options.headers, { 'X-NCP-APIGW-API-KEY-ID': 'test-id', 'X-NCP-APIGW-API-KEY': 'test-secret' });
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].url.searchParams.get('format'), 'json');
  assert.equal(calls[0].url.searchParams.get('display'), '5');
  assert.equal(calls[0].url.searchParams.get('start'), '1');
  assert.equal(calls[0].url.searchParams.get('sort'), 'random');
  assert(!calls[0].url.href.includes('test-secret'));
});
test('malformed API responses do not become empty successful collections', async () => {
  for (const body of [null, {}, { items: Array(6).fill(item) }]) {
    await assert.rejects(searchNaver('q', { clientId: 'test', clientSecret: 'test' },
      async () => ({ ok: true, json: async () => body })), /^Error: NAVER_INVALID_RESPONSE$/);
  }
});
test('missing credentials make no request, and auth/network failures expose no raw response', async () => {
  let called = false;
  await assert.rejects(searchNaver('q', {}, async () => { called = true; }), /NAVER_CREDENTIALS_MISSING/);
  assert.equal(called, false);
  await assert.rejects(searchNaver('q', { clientId: 'test', clientSecret: 'test' }, async () => ({ ok: false, status: 401 })), /^Error: NAVER_HTTP_401$/);
  await assert.rejects(searchNaver('q', { clientId: 'test', clientSecret: 'test' }, async () => { throw new Error('private internals'); }), /^Error: NAVER_NETWORK_OR_TIMEOUT$/);
});

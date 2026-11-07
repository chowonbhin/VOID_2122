import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openingFromWeeklyText, openingFromTabling } from './opening-hours.mjs';
import { applyOpeningObservations } from './opening-observations.mjs';

test('missing days and invalid/ambiguous times do not become opening hours', () => {
  const o = openingFromWeeklyText({ 월: '정보 없음', 화: '09:00 - 18:00', 수: '휴무', 목: '25:00 - 28:00', 금: '09:00 - 18:00 휴게시간 별도' });
  assert.deepEqual(o.weekly[2], [{ open: '09:00', close: '18:00' }]);
  assert.deepEqual(o.weekly[3], []);
  assert.deepEqual(o.unknownDays, [0, 1, 4, 5, 6]);
});
test('overnight periods carry into the following calendar day, including Sunday to Monday', () => {
  const o = openingFromWeeklyText(Object.fromEntries([...'일월화수목금토'].map(d => [d, d === '일' ? '휴무' : '17:00 - 02:00 다음 날'])));
  assert.deepEqual(o.weekly[6], [{ open: '00:00', close: '02:00' }, { open: '17:00', close: '24:00' }]);
  assert.deepEqual(o.weekly[0], [{ open: '00:00', close: '02:00' }]);
  assert.deepEqual(o.weekly[1], [{ open: '17:00', close: '24:00' }]);
  const partial = openingFromWeeklyText({ 월: '17:00~02:00', 화: '17:00~02:00' });
  assert.ok(partial.unknownDays.includes(1));
  assert.deepEqual(partial.weekly[2], [{ open: '00:00', close: '02:00' }, { open: '17:00', close: '24:00' }]);
});
test('explicit 24-hour schedules stay continuous at midnight', () => {
  const o = openingFromWeeklyText(Object.fromEntries([...'일월화수목금토'].map(d => [d, '00:00~24:00'])));
  assert.deepEqual(o.weekly[0], [{ open: '00:00', close: '24:00' }]);
});
test('subtracts weekday-specific breaks and respects regular holidays', () => {
  const e = { regularHolidays: [{ criterion: 'WEEK', weekNo: null, dayOfWeek: 1 }], restaurantTimes: [
    { dayOfWeek: 1, dayStatus: 'REGULAR_HOLIDAY' },
    { dayOfWeek: 2, dayStatus: 'BUSINESS', openTimeList: [{ startTime: '11:30', endTime: '21:00' }], breakTimeList: [{ startTime: '15:00', endTime: '17:00' }] },
  ] };
  assert.deepEqual(openingFromTabling(e).weekly[2], [{ open: '11:30', close: '15:00' }, { open: '17:00', close: '21:00' }]);
  assert.deepEqual(openingFromTabling(e).weekly[1], []);
  assert.equal(openingFromTabling({ ...e, regularHolidays: [{ criterion: 'MONTH', weekNo: 4, dayOfWeek: 1 }] }).status, 'unknown');
  assert.equal(openingFromTabling({ ...e, temporaryHolidays: ['2026-11-08'] }).status, 'unknown');
});
test('enrichment preserves every existing venue and every field outside opening/provenance', () => {
  const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
  const observations = read('../../src/data/research/opening-observations.json');
  const observedIds = new Set(observations.map(e => e.placeId));
  const raw = read('../../src/data/research/real-places.json').map(p => observedIds.has(p.id)
    ? { ...p, opening: { status: 'unknown' }, source: null } : p);
  const enriched = applyOpeningObservations(raw, observations);
  const identity = ({ opening, source, ...rest }) => rest;
  assert.deepEqual(enriched.map(identity), raw.map(identity));
  assert.ok(enriched.filter(p => p.opening.status === 'known').length > raw.filter(p => p.opening.status === 'known').length);
  const first = observations[0];
  assert.throws(() => applyOpeningObservations(raw, [{ ...first, address: first.address.replace(/\d/, '9') }]), /mismatch/);
  assert.throws(() => applyOpeningObservations(raw, [{ ...first, placeId: 'new-venue' }]), /no existing venue/);
  assert.throws(() => applyOpeningObservations(raw, [first, first]), /Duplicate/);
  for (const p of enriched) for (const ranges of Object.values(p.opening.weekly ?? {})) {
    for (const r of ranges) assert.ok(r.open < r.close && r.close <= '24:00', `${p.name}: ${JSON.stringify(r)}`);
  }
});

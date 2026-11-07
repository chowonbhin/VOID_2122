import { describe, expect, it } from 'vitest';
import { content } from '../data/content';
import type { Place, Profile, SearchContext, Visit } from './types';
import { eventBonus, eventState, parseKst, placeLevel, placeStatus, recommend, regionLevel } from './score';

const place = (id: string) => content.places.find((p) => p.id === id)!;
const event = (id: string) => content.events.find((e) => e.id === id)!;
const fresh = (): Profile => ({ initialLevels: {}, interests: [], experiencedEventIds: [] });
const visit = (placeId: string, n = 1): Visit => ({ id: `${placeId}-${n}`, placeId, date: '2026-11-08', method: 'self_report' });
// Demo: 안산시청 (example origin), Sunday 2026-11-08 14:00 KST.
const ctx = (over: Partial<SearchContext> = {}): SearchContext => ({
  origin: { lat: 37.3219, lng: 126.8309, label: '안산시청' },
  when: '2026-11-08T14:00',
  interests: [],
  maxDistanceKm: 10,
  ...over,
});
const order = (visits: Visit[], profile = fresh(), c = ctx()) => recommend(content, profile, visits, c).recommendations.map((r) => r.regionId);
const scoreOf = (regionId: string, visits: Visit[], profile = fresh(), c = ctx()) =>
  recommend(content, profile, visits, c).recommendations.find((r) => r.regionId === regionId)!.score;

describe('time', () => {
  it('parses KST independent of browser zone', () => {
    const t = parseKst('2026-11-08T14:00');
    expect(t.dayOfWeek).toBe(0);
    expect(t.epochMs).toBe(Date.parse('2026-11-08T14:00+09:00'));
  });

  it('open / closed by exception / unknown', () => {
    expect(placeStatus(place('a1'), '2026-11-08T14:00').status).toBe('open');
    expect(placeStatus(place('a4'), '2026-11-08T14:00')).toEqual({ status: 'closed', note: '시설 점검 임시 휴무' });
    expect(placeStatus(place('a4'), '2026-11-09T14:00').status).toBe('open');
    expect(placeStatus(place('a5'), '2026-11-08T14:00').status).toBe('unknown');
  });

  it('weekly closed day', () => {
    expect(placeStatus(place('a2'), '2026-11-09T14:00').status).toBe('closed'); // Monday
    expect(placeStatus(place('b4'), '2026-11-08T14:00').status).toBe('closed'); // Sunday
  });

  it('last entry and close are exclusive', () => {
    expect(placeStatus(place('a2'), '2026-11-08T17:29').status).toBe('open');
    expect(placeStatus(place('a2'), '2026-11-08T17:30')).toEqual({ status: 'closed', note: '입장·주문 마감 17:30' });
    expect(placeStatus(place('a2'), '2026-11-08T18:00').status).toBe('closed');
    expect(placeStatus(place('a2'), '2026-11-08T10:00').status).toBe('open');
  });

  it('split day ranges', () => {
    expect(placeStatus(place('a3'), '2026-11-08T15:00').status).toBe('closed');
    expect(placeStatus(place('a3'), '2026-11-08T17:00').status).toBe('open');
  });

  it('known opening without hours is not assumed open', () => {
    const p: Place = { ...place('a1'), opening: { status: 'known' } };
    expect(placeStatus(p, '2026-11-08T14:00').status).toBe('unknown');
  });
});

describe('levels', () => {
  const places = content.places;
  it('distinct places 0/1/2/3 → Lv 0/1/1/2, repeats count once', () => {
    expect(regionLevel('dong-4127353200', fresh(), [], places)).toBe(0);
    expect(regionLevel('dong-4127353200', fresh(), [visit('a1')], places)).toBe(1);
    expect(regionLevel('dong-4127353200', fresh(), [visit('a1'), visit('a1', 2)], places)).toBe(1);
    expect(regionLevel('dong-4127353200', fresh(), [visit('a1'), visit('a2')], places)).toBe(1);
    expect(regionLevel('dong-4127353200', fresh(), [visit('a1'), visit('a2'), visit('a3')], places)).toBe(2);
  });

  it('visits in another region do not count', () => {
    expect(regionLevel('dong-4127353200', fresh(), [visit('b1'), visit('b2'), visit('b3')], places)).toBe(0);
  });

  it('initial level is kept when visits are fewer', () => {
    const p = { ...fresh(), initialLevels: { 'dong-4127353200': 2 as const } };
    expect(regionLevel('dong-4127353200', p, [], places)).toBe(2);
    expect(regionLevel('dong-4127353200', p, [visit('a1')], places)).toBe(2);
  });

  it('place level caps at 3', () => {
    expect(placeLevel('a1', 2, [visit('a1')])).toBe(3);
    expect(placeLevel('a1', 2, [])).toBe(2);
  });
});

describe('events', () => {
  it('states', () => {
    expect(eventState(event('e-b1-market'), '2026-11-08T14:00')).toBe('active');
    expect(eventState(event('e-a2-concert'), '2026-11-08T14:00')).toBe('cancelled');
    expect(eventState(event('e-b3-workshop'), '2026-11-08T14:00')).toBe('condition_unknown');
    expect(eventState(event('e-b1-market'), '2026-11-09T20:00')).toBe('ended');
    expect(eventState(event('e-b3-workshop'), '2026-11-07T14:00')).toBe('upcoming');
  });

  it('bonus only for active, matching, not experienced', () => {
    expect(eventBonus('b1', content.events, ctx(), fresh()).bonus).toBe(5);
    expect(eventBonus('b1', content.events, ctx({ interests: ['nature'] }), fresh()).bonus).toBe(0);
    expect(eventBonus('b1', content.events, ctx(), { ...fresh(), experiencedEventIds: ['e-b1-market'] }).bonus).toBe(0);
    expect(eventBonus('a2', content.events, ctx(), fresh()).bonus).toBe(0);
    expect(eventBonus('b3', content.events, ctx(), fresh()).bonus).toBe(0);
  });
});

describe('recommend — real-region starts and footfall', () => {
  it('before any visit A (≈240.70) ranks above B (≈146.42)', () => {
    expect(scoreOf('dong-4127353200', [])).toBeCloseTo(240.7024, 3);
    expect(scoreOf('dong-4127354500', [])).toBeCloseTo(146.4235, 3);
    expect(order([])).toEqual(['dong-4127353200', 'dong-4127354500', 'dong-4127356500']);
  });

  it('visiting a1 drops central score without forcing a rank swap', () => {
    expect(scoreOf('dong-4127353200', [visit('a1')])).toBeCloseTo(188.8980, 3);
    expect(order([visit('a1')])).toEqual(order([]));
  });

  it('repeat visit to the same place changes nothing; deleting all restores', () => {
    expect(scoreOf('dong-4127353200', [visit('a1'), visit('a1', 2)])).toBe(scoreOf('dong-4127353200', [visit('a1')]));
    expect(scoreOf('dong-4127353200', [])).toBeCloseTo(240.7024, 3);
  });

  it('unknown and closed places are listed but not scored', () => {
    const r = recommend(content, fresh(), [], ctx()).recommendations.find((x) => x.regionId === 'dong-4127353200')!;
    expect(r.placeIds).toEqual(['a1', 'a2', 'a3']);
    expect(r.unknownPlaceCount).toBe(1);
    expect(r.openPlaceCount).toBe(3);
  });

  it('max distance applies before scoring', () => {
    const res = recommend(content, fresh(), [], ctx({ maxDistanceKm: 0.1 }));
    expect(res.recommendations).toEqual([]);
    expect(res.excluded.filter(e => e.reason === 'too_far')).toHaveLength(6);
    expect(res.excluded.filter(e => e.reason === 'no_data')).toHaveLength(19);
  });

  it('region with no eligible places is excluded', () => {
    const res = recommend(content, fresh(), [], ctx({ interests: ['nature'] }));
    expect(res.recommendations.map((r) => r.regionId)).toEqual(['dong-4127353200']);
    expect(res.excluded).toContainEqual(expect.objectContaining({ regionId: 'dong-4127354500', reason: 'no_eligible_places' }));
  });

  it('at night nothing is open → no recommendation', () => {
    expect(recommend(content, fresh(), [], ctx({ when: '2026-11-08T23:30' })).recommendations).toEqual([]);
  });

  it('same input → same output', () => {
    expect(recommend(content, fresh(), [visit('a1')], ctx())).toEqual(recommend(content, fresh(), [visit('a1')], ctx()));
  });
});

import { describe, expect, it } from 'vitest';
import { baseContent as content } from '../data/testContent';
import { type Content } from '../data/content';
import type { Place, Profile, SearchContext, Visit } from './types';
import { recommend, regionLevel, scorePlaces } from './score';
import { placePopularity } from './popularity';

const region = content.regions[0];
const base = content.places.find(p => p.id === 'a1')!;
const source = { label: '검증용 입력 수치 (실제 수집 아님)', url: 'https://example.com/reviews', checkedAt: '2026-11-08' };
const profile: Profile = { initialLevels: {}, interests: [], experiencedEventIds: [] };
const ctx: SearchContext = { origin: region.start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 10 };
const visit: Visit = { id: 'visit-p20', placeId: 'p20', date: '2026-11-08', method: 'self_report' };
function place(id: string, baseValue: number, count: number): Place {
  return { ...base, id, regionId: region.id, category: 'culture', isVirtual: false, popularity: undefined,
    baseValue, popularityEvidence: { provider: 'naver_place', metric: 'visitor_reviews', count, period: 'cumulative', source } };
}
const places = [...Array.from({ length: 19 }, (_, i) => place(`p${String(i + 1).padStart(2, '0')}`, 90, 10)), place('p20', 80, 1000), place('p21', 79, 1)];
const data: Content = { ...content, regions: [{ ...region, placeIds: places.map(p => p.id) }], places, events: [] };
const result = (visits: Visit[] = [], c = data, search = ctx) => recommend(c, profile, visits, search).recommendations[0];

describe('top 20 reselection from the complete candidate pool', () => {
  it('normalizes the selected 20 with a fixed denominator, not the search-result maximum', () => {
    const before = result();
    expect(before.placeIds).toHaveLength(20);
    expect(before.placeIds).toContain('p20');
    expect(before.placeIds).not.toContain('p21');
    expect(before.eligiblePlaceCount).toBe(21);
    expect(before.shortfallCount).toBe(0);
    expect(before.score).toBeCloseTo((19 * 90 + 80) * 1.2 / 26.4);
  });
  it('after visiting the 20th, the former 21st enters and region sum/penalty recompute; deletion restores', () => {
    const after = result([visit]);
    expect(after.placeIds).not.toContain('p20');
    expect(after.placeIds).toContain('p21');
    expect(after.placeIds).toHaveLength(20);
    const ten = Math.log1p(10) / Math.log1p(1000), one = Math.log1p(1) / Math.log1p(1000);
    expect(after.score).toBeCloseTo((19 * (90 - 10 * ten) + (79 - 10 * one)) * 0.85 * 1.1 / 26.4);
    expect(regionLevel(region.id, profile, [visit], data.places)).toBe(1); // dropped places still count as visited
    expect(scorePlaces(region, data, profile, [visit], ctx).find(p => p.placeId === 'p20')).toMatchObject({ eligible: true, selected: false, rank: 21 });
    expect(result([visit, { ...visit, id: 'repeat', date: '2026-11-09' }])).toEqual(after);
    expect(result([]).placeIds).toContain('p20');
  });
  it('keeps a visited place if its new score still qualifies, without forcing 20 different places', () => {
    const after = result([{ ...visit, placeId: 'p01' }]);
    expect(after.placeIds).toContain('p01');
    expect(after.placeIds).toHaveLength(20);
  });
  it('stable ties survive source reorder and do not mutate source content', () => {
    const tied = { ...data, places: data.places.map(p => ({ ...p, baseValue: 80 })) };
    const before = structuredClone(tied);
    expect(result([], tied).placeIds).toEqual(result([], { ...tied, places: [...tied.places].reverse() }).placeIds);
    expect(tied).toEqual(before);
  });
  it('filters franchise, unknown evidence, opening and interests before choosing the 20', () => {
    const excluded: Place[] = [
      { ...place('franchise', 100, 0), franchise: { status: 'franchise', source } },
      { ...place('unknown', 100, 0), popularityEvidence: undefined, popularity: 0 },
      { ...place('closed', 100, 0), opening: { status: 'known', weekly: {} } },
      { ...place('other-interest', 100, 0), category: 'food' },
    ];
    const changed = { ...data, places: [...data.places, ...excluded] };
    const top = result([], changed, { ...ctx, interests: ['culture'] });
    expect(top.placeIds).toEqual(result().placeIds);
    expect(top.eligiblePlaceCount).toBe(21);
  });
  it('uses fewer than 20 as-is, reports shortfall, and excludes an empty candidate set', () => {
    const small = { ...data, places: [place('only', 70, 0)] };
    expect(result([], small)).toMatchObject({ placeIds: ['only'], placeLimit: 20, shortfallCount: 19 });
    expect(result([], small).score).toBeCloseTo(70 / 2200 * 100);
    expect(recommend({ ...small, places: [] }, profile, [], ctx).recommendations).toEqual([]);
  });
});

describe('source-backed per-place popularity', () => {
  it('larger counts mean greater penalty at equal base value and Lv', () => {
    const c = { ...data, places: [place('few', 80, 10), place('many', 80, 1000)] };
    const scores = scorePlaces(region, c, { ...profile, initialLevels: { [region.id]: 1 } }, [], ctx);
    expect(scores[0].score).toBeGreaterThan(scores[1].score);
    expect(scores[1].score).toBe(70);
    expect(placePopularity(c.places[1], c.places)).toMatchObject({ status: 'measured', value: 1, referenceMax: 1000 });
  });
  it('preserves original Lv.0 policy and distinguishes verified zero from missing real evidence', () => {
    const zero = place('zero', 80, 0);
    expect(placePopularity(zero, [zero])).toMatchObject({ status: 'measured', value: 0 });
    expect(placePopularity({ ...zero, popularityEvidence: undefined, popularity: 0 }, [zero])).toEqual({ status: 'unknown', value: null });
    expect(scorePlaces(region, data, profile, [], ctx).find(p => p.placeId === 'p20')!.score).toBe(80);
  });
  it('does not mix visits/reviews, different sources or reporting periods, or user visit counts', () => {
    const p = place('target', 80, 10);
    const other = place('other', 80, 999999);
    for (const evidence of [
      { ...other.popularityEvidence!, metric: 'visits' as const },
      { ...other.popularityEvidence!, provider: 'operator' as const },
      { ...other.popularityEvidence!, period: '2026-08' },
    ]) expect(placePopularity(p, [p, { ...other, popularityEvidence: evidence }])).toMatchObject({ referenceMax: 10, value: 1 });
    const before = scorePlaces(region, data, profile, [], ctx).map(p => p.popularity);
    expect(scorePlaces(region, data, profile, [visit], { ...ctx, interests: ['food'] }).map(p => p.popularity)).toEqual(before);
  });
  it.each([-1, NaN, Infinity, 1.5])('rejects invalid counts %s instead of inventing a low popularity', count => {
    expect(placePopularity(place('invalid', 80, count), places).status).toBe('unknown');
  });
  it('requires provenance and permits legacy simulation only when explicitly virtual', () => {
    const p = place('bad-source', 80, 5);
    expect(placePopularity({ ...p, popularityEvidence: { ...p.popularityEvidence!, source: { ...source, url: '' } } }, places).status).toBe('unknown');
    expect(placePopularity(base, [base])).toMatchObject({ status: 'simulated', value: 1 });
  });
});

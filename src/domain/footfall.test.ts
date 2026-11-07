import { describe, expect, it } from 'vitest';
import { baseContent as content } from '../data/testContent';
import { content as production, validateContent } from '../data/content';
import { footfallAdjustment } from './footfall';
import { recommend } from './score';
import type { FootfallDataset, Profile, SearchContext } from './types';

const data = content.footfall!;
const central = content.regions[0];
const multicultural = content.regions[1];
const profile: Profile = { initialLevels: { 'dong-4127353200': 1, 'dong-4127354500': 1 }, interests: [], experiencedEventIds: [] };
const ctx: SearchContext = { origin: central.start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 10 };

describe('footfall policy and source snapshot', () => {
  it('connects all 18 supplied markets once to their 11 source-labelled dongs, leaving 14 missing rather than zero', () => {
    const mapped = production.regions.filter(region => region.footfallMarketIds?.length);
    expect(mapped).toHaveLength(11);
    const ids = mapped.flatMap(region => region.footfallMarketIds!);
    expect(ids.sort()).toEqual(data.markets.map(market => market.id).sort());
    expect(new Set(ids).size).toBe(18);
    for (const region of mapped) {
      expect(region.footfallMappingBasis).toBe('source_dong_label');
      expect(region.footfallMarketIds!.every(id => data.markets.find(market => market.id === id)?.sourceDong === region.name)).toBe(true);
    }
    expect(production.regions.filter(region => footfallAdjustment(region, 1, data, 1400).status === 'unavailable')).toHaveLength(14);
    expect(validateContent(production)).toEqual([]);
    const hosu = mapped.find(region => region.name === '호수동')!;
    expect(footfallAdjustment(hosu, 1, data, 1400)).toMatchObject({ dailyAverage: 111414 });
  });

  it('applies the previously omitted Bono1 source to real scored venues after a visit', () => {
    const region = production.regions.find(region => region.name === '본오1동')!;
    const visits = [{ id: 'footfall-visit', placeId: 'naver-f6c955863b3e69076ded', date: '2026-11-08', method: 'self_report' as const }];
    const search = { ...ctx, origin: region.start };
    const before = recommend(production, { ...profile, initialLevels: {} }, [], search).recommendations.find(item => item.regionId === region.id)!;
    const after = recommend(production, { ...profile, initialLevels: {} }, visits, search).recommendations.find(item => item.regionId === region.id)!;
    const noFootfall = recommend({ ...production, footfall: undefined }, { ...profile, initialLevels: {} }, visits, search).recommendations.find(item => item.regionId === region.id)!;
    expect(before.footfall).toMatchObject({ status: 'available', dailyAverage: 11360, adjustment: 0 });
    expect(after.level).toBe(1);
    expect(after.footfall).toMatchObject({ status: 'available', referenceMax: 150039 });
    if (after.footfall.status === 'available') expect(after.footfall.penaltyRate).toBeCloseTo(0.15 * 11360 / 150039);
    expect(after.score / noFootfall.score).toBeCloseTo(1 - 0.15 * 11360 / 150039);
  });

  it('rejects one market counted for multiple dongs or a mismatched source label', () => {
    const duplicate = { ...production.regions[1], footfallMarketIds: ['ansan-samil'] };
    const problems = validateContent({ ...production, regions: [production.regions[0], duplicate] });
    expect(problems.some(problem => problem.includes('multiple regions ansan-samil'))).toBe(true);
    expect(problems.some(problem => problem.includes('source dong mismatch ansan-samil'))).toBe(true);
  });

  it('matches the provided 18-market total and each selected real-region aggregate', () => {
    expect(data.markets).toHaveLength(18);
    expect(data.markets.reduce((sum, market) => sum + market.dailyAverage, 0)).toBe(466765);
    expect(footfallAdjustment(central, 1, data, 1400)).toMatchObject({ dailyAverage: 150039, normalizedShare: 150039 / 466765 });
    expect(footfallAdjustment(multicultural, 1, data, 1400)).toMatchObject({ dailyAverage: 65567, normalizedShare: 65567 / 466765 });
    expect(validateContent(content)).toEqual([]);
  });

  it('never penalizes Lv.0, even for the busiest region', () => {
    expect(footfallAdjustment(central, 0, data, 1400)).toMatchObject({ status: 'available', adjustment: 0 });
  });

  it('penalizes higher footfall more at the same Lv, and higher Lv more at the same footfall', () => {
    const a1 = footfallAdjustment(central, 1, data, 1400).adjustment;
    expect(a1).toBe(-210);
    expect(a1).toBeLessThan(footfallAdjustment(multicultural, 1, data, 1400).adjustment);
    expect(footfallAdjustment(central, 2, data, 1400).adjustment).toBeCloseTo(2 * a1);
  });

  it('marks absent mapping/data explicitly instead of reporting a measured zero', () => {
    expect(footfallAdjustment({}, 1, data, 1400)).toEqual({ status: 'unavailable', adjustment: 0, reason: 'unmapped' });
    expect(footfallAdjustment(central, 1, undefined, 1400)).toEqual({ status: 'unavailable', adjustment: 0, reason: 'missing_data' });
    expect(footfallAdjustment({ footfallMarketIds: ['missing', 'ansan-samil'] }, 1, data, 1400).status).toBe('unavailable');
  });

  it('rejects duplicate market mappings rather than double-counting', () => {
    expect(footfallAdjustment({ footfallMarketIds: ['ansan-samil', 'ansan-samil'] }, 1, data, 1400).status).toBe('unavailable');
  });

  it.each([-1, NaN, Infinity])('rejects invalid source value %s without poisoning the score', (dailyAverage) => {
    const invalid: FootfallDataset = { ...data, markets: [{ ...data.markets[0], dailyAverage }] };
    expect(footfallAdjustment(central, 1, invalid, 1400)).toMatchObject({ status: 'unavailable', adjustment: 0 });
    expect(recommend({ ...content, footfall: invalid }, profile, [], ctx).recommendations.every((item) => Number.isFinite(item.score))).toBe(true);
  });

  it('distinguishes a genuine zero from unavailable data', () => {
    const zero: FootfallDataset = { ...data, markets: data.markets.map((market, i) => i === 0 ? { ...market, dailyAverage: 0 } : market) };
    expect(footfallAdjustment(central, 1, zero, 1400)).toMatchObject({ status: 'available', dailyAverage: 0, adjustment: 0 });
    expect(footfallAdjustment(central, 1, { ...zero, markets: zero.markets.map((market) => ({ ...market, dailyAverage: 0 })) }, 1400).status).toBe('unavailable');
  });

  it('applies the adjustment before novelty and distance and preserves the score floor', () => {
    const without = recommend({ ...content, footfall: undefined }, profile, [], ctx).recommendations.find((item) => item.regionId === central.id)!;
    const withData = recommend(content, profile, [], ctx).recommendations.find((item) => item.regionId === central.id)!;
    expect(withData.score / without.score).toBeCloseTo(0.85); // exactly 15%, also after novelty/distance
    const tiny = { ...content, events: [], places: content.places.map((place) => ({ ...place, baseValue: 0 })) };
    expect(recommend(tiny, profile, [], ctx).recommendations.every((item) => item.score === 0)).toBe(true);
  });

  it('keeps the denominator fixed when interests or distance remove another region', () => {
    const all = recommend(content, profile, [], ctx).recommendations.find((item) => item.regionId === central.id)!;
    const filtered = recommend(content, profile, [], { ...ctx, interests: ['nature'], maxDistanceKm: 0.1 });
    expect(filtered.recommendations).toHaveLength(1);
    expect(filtered.recommendations[0].footfall).toMatchObject({ status: 'available', referenceMax: 150039, referenceTotal: 466765, penaltyRate: 0.15 });
    expect(all.footfall).toMatchObject({ status: 'available', referenceMax: 150039, referenceTotal: 466765, penaltyRate: 0.15 });
  });

  it('lowers the final score for greater footfall when all other inputs are identical', () => {
    const low = { ...content, regions: [{ ...central, footfallMarketIds: ['ansan-multicultural'] }] };
    const high = { ...content, regions: [central] };
    expect(recommend(high, profile, [], ctx).recommendations[0].score)
      .toBeLessThan(recommend(low, profile, [], ctx).recommendations[0].score);
  });
});

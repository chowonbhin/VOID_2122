import { describe, expect, it } from 'vitest';
import { content, validateContent } from '../data/content';
import { footfallAdjustment } from './footfall';
import { recommend } from './score';
import type { FootfallDataset, Profile, SearchContext } from './types';

const data = content.footfall!;
const central = content.regions[0];
const multicultural = content.regions[1];
const profile: Profile = { initialLevels: { 'dong-4127353200': 1, 'dong-4127354500': 1 }, interests: [], experiencedEventIds: [] };
const ctx: SearchContext = { origin: central.start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 10 };

describe('footfall policy and source snapshot', () => {
  it('matches the provided 18-market total and each selected real-region aggregate', () => {
    expect(data.markets).toHaveLength(18);
    expect(data.markets.reduce((sum, market) => sum + market.dailyAverage, 0)).toBe(466765);
    expect(footfallAdjustment(central, 1, data)).toMatchObject({ dailyAverage: 150039, normalizedShare: 150039 / 466765 });
    expect(footfallAdjustment(multicultural, 1, data)).toMatchObject({ dailyAverage: 65567, normalizedShare: 65567 / 466765 });
    expect(validateContent(content)).toEqual([]);
  });

  it('never penalizes Lv.0, even for the busiest region', () => {
    expect(footfallAdjustment(central, 0, data)).toMatchObject({ status: 'available', adjustment: 0 });
  });

  it('penalizes higher footfall more at the same Lv, and higher Lv more at the same footfall', () => {
    const a1 = footfallAdjustment(central, 1, data).adjustment;
    expect(a1).toBeCloseTo(-3.2144440993);
    expect(a1).toBeLessThan(footfallAdjustment(multicultural, 1, data).adjustment);
    expect(footfallAdjustment(central, 2, data).adjustment).toBeCloseTo(2 * a1);
  });

  it('marks absent mapping/data explicitly instead of reporting a measured zero', () => {
    expect(footfallAdjustment({}, 1, data)).toEqual({ status: 'unavailable', adjustment: 0, reason: 'unmapped' });
    expect(footfallAdjustment(central, 1)).toEqual({ status: 'unavailable', adjustment: 0, reason: 'missing_data' });
    expect(footfallAdjustment({ footfallMarketIds: ['missing', 'ansan-samil'] }, 1, data).status).toBe('unavailable');
  });

  it('rejects duplicate market mappings rather than double-counting', () => {
    expect(footfallAdjustment({ footfallMarketIds: ['ansan-samil', 'ansan-samil'] }, 1, data).status).toBe('unavailable');
  });

  it.each([-1, NaN, Infinity])('rejects invalid source value %s without poisoning the score', (dailyAverage) => {
    const invalid: FootfallDataset = { ...data, markets: [{ ...data.markets[0], dailyAverage }] };
    expect(footfallAdjustment(central, 1, invalid)).toMatchObject({ status: 'unavailable', adjustment: 0 });
    expect(recommend({ ...content, footfall: invalid }, profile, [], ctx).recommendations.every((item) => Number.isFinite(item.score))).toBe(true);
  });

  it('distinguishes a genuine zero from unavailable data', () => {
    const zero: FootfallDataset = { ...data, markets: data.markets.map((market, i) => i === 0 ? { ...market, dailyAverage: 0 } : market) };
    expect(footfallAdjustment(central, 1, zero)).toMatchObject({ status: 'available', dailyAverage: 0, adjustment: 0 });
    expect(footfallAdjustment(central, 1, { ...zero, markets: zero.markets.map((market) => ({ ...market, dailyAverage: 0 })) }).status).toBe('unavailable');
  });

  it('applies the adjustment before novelty and distance and preserves the score floor', () => {
    const without = recommend({ ...content, footfall: undefined }, profile, [], ctx).recommendations.find((item) => item.regionId === central.id)!;
    const withData = recommend(content, profile, [], ctx).recommendations.find((item) => item.regionId === central.id)!;
    expect(withData.score - without.score).toBeCloseTo(-10 * 150039 / 466765 * 1.1); // distance is zero
    const tiny = { ...content, events: [], places: content.places.map((place) => ({ ...place, baseValue: 0 })) };
    expect(recommend(tiny, profile, [], ctx).recommendations.every((item) => item.score === 0)).toBe(true);
  });

  it('keeps the denominator fixed when interests or distance remove another region', () => {
    const all = recommend(content, profile, [], ctx).recommendations.find((item) => item.regionId === central.id)!;
    const filtered = recommend(content, profile, [], { ...ctx, interests: ['nature'], maxDistanceKm: 0.1 });
    expect(filtered.recommendations).toHaveLength(1);
    expect(filtered.recommendations[0].footfall).toEqual(all.footfall);
  });

  it('lowers the final score for greater footfall when all other inputs are identical', () => {
    const low = { ...content, regions: [{ ...central, footfallMarketIds: ['ansan-multicultural'] }] };
    const high = { ...content, regions: [central] };
    expect(recommend(high, profile, [], ctx).recommendations[0].score)
      .toBeLessThan(recommend(low, profile, [], ctx).recommendations[0].score);
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeRegionBase, recommend, scorePlaces } from './score';
import { footfallAdjustment } from './footfall';
import { content } from '../data/content';

const profile = { initialLevels: {}, interests: [], experiencedEventIds: [] };
const central = content.regions.find(region => region.name === '중앙동')!;
const search = { origin: central.start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 100 };

describe('fixed 100-point regional scale and proportional traffic penalty', () => {
  it('maps the documented theoretical 20×110 maximum to 100 without result-set min/max scaling', () => {
    expect(normalizeRegionBase(0)).toBe(0);
    expect(normalizeRegionBase(2200)).toBe(100);
    expect(normalizeRegionBase(1400)).toBeCloseTo(63.63636);
    expect(normalizeRegionBase(70)).toBeCloseTo(3.181818); // missing 19 places are not invented
    expect(normalizeRegionBase(3000)).toBe(100);
    expect(normalizeRegionBase(-1)).toBe(0);
  });

  it('takes exactly 15% / 30% off an 80-point base in the busiest source dong', () => {
    expect(footfallAdjustment(central, 0, content.footfall, 80)).toMatchObject({ adjustment: 0, penaltyRate: 0 });
    expect(footfallAdjustment(central, 1, content.footfall, 80)).toMatchObject({ adjustment: -12, penaltyRate: 0.15 });
    expect(footfallAdjustment(central, 2, content.footfall, 80)).toMatchObject({ adjustment: -24, penaltyRate: 0.30 });
  });

  it('keeps the same regional score when other regions are filtered out and exposes every actual selected place', () => {
    const all = recommend(content, profile, [], search).recommendations.find(item => item.regionId === central.id)!;
    const narrowed = recommend(content, profile, [], { ...search, maxDistanceKm: 0.1 }).recommendations[0];
    expect(narrowed.score).toBe(all.score);
    expect(all.placeIds).toHaveLength(20);
    expect(all.normalizedBaseScore).toBeCloseTo(63.63636);
    expect(all.provisionalPlaceCount).toBe(20);
  });

  it('unknown popularity stays unknown and receives the largest penalty without fabricated reviews', () => {
    const p = { ...profile, initialLevels: { [central.id]: 1 as const } };
    const scores = scorePlaces(central, content, p, [], search);
    const unknown = scores.find(item => item.eligible && item.popularity.status === 'unknown')!;
    const measured = scores.find(item => item.eligible && item.popularity.status === 'measured')!;
    expect(unknown).toMatchObject({ popularity: { status: 'unknown', value: null }, score: 60, provisional: true });
    expect(measured.score).toBeGreaterThanOrEqual(unknown.score);
    expect(content.places.find(place => place.id === unknown.placeId)!.popularityEvidence).toBeUndefined();
  });

  it('all production recommendations stay within 0–100 across region experience levels', () => {
    for (const level of [0, 1, 2] as const) {
      const p = { ...profile, initialLevels: Object.fromEntries(content.regions.map(r => [r.id, level])) };
      const result = recommend(content, p, [], search);
      expect(result.recommendations).toHaveLength(25);
      for (const item of result.recommendations) {
        expect(item.placeIds).toHaveLength(20);
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(100);
      }
    }
  });
});

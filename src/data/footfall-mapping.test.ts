import { describe, expect, it } from 'vitest';
import { content } from './content';
import { footfallAdjustment } from '../domain/footfall';
import { recommend } from '../domain/score';

// Independently transcribed totals from assets/안산/02_동별_유동인구_비중.png.
const sourceTotals: Record<string, number> = {
  중앙동: 150039, 호수동: 111414, 원곡동: 65567, 사동: 30423,
  이동: 29834, 초지동: 22902, 선부3동: 16427, 본오3동: 11545,
  본오1동: 11360, 해양동: 10702, 월피동: 6552,
};
const missing = '일동 사이동 본오2동 부곡동 성포동 반월동 안산동 와동 고잔동 신길동 백운동 선부1동 선부2동 대부동'.split(' ');

describe('provided asset coverage in recommendation scoring', () => {
  it('uses all 18 source markets once and matches all 11 dong totals from the asset', () => {
    const ids = content.regions.flatMap(region => region.footfallMarketIds ?? []);
    expect(ids).toHaveLength(18);
    expect(new Set(ids).size).toBe(18);
    expect([...ids].sort()).toEqual(content.footfall!.markets.map(market => market.id).sort());
    for (const [name, total] of Object.entries(sourceTotals)) {
      const region = content.regions.find(item => item.name === name)!;
      expect(footfallAdjustment(region, 1, content.footfall, 100)).toMatchObject({
        status: 'available', dailyAverage: total, referenceTotal: 466765,
        normalizedShare: total / 466765, adjustment: -100 * (0.15 * (total / 150039)),
      });
      expect(footfallAdjustment(region, 0, content.footfall, 100).adjustment).toBe(0);
    }
  });

  it('keeps the 14 dongs absent from the asset unavailable rather than measured zero', () => {
    const unmapped = content.regions.filter(region => !region.footfallMarketIds?.length);
    expect(unmapped.map(region => region.name).sort()).toEqual([...missing].sort());
    for (const region of unmapped) {
      expect(footfallAdjustment(region, 2, content.footfall, 100)).toEqual({
        status: 'unavailable', adjustment: 0, reason: 'unmapped',
      });
    }
  });

  it('propagates each source total into the final recommended score without changing selected places', () => {
    const profile = { initialLevels: Object.fromEntries(content.regions.map(region => [region.id, 1 as const])), interests: [], experiencedEventIds: [] };
    const search = { origin: content.regions[0].start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 100 };
    const withData = recommend(content, profile, [], search).recommendations;
    const withoutData = recommend({ ...content, footfall: undefined }, profile, [], search).recommendations;
    expect(withData).toHaveLength(25);
    for (const region of content.regions) {
      const result = withData.find(item => item.regionId === region.id)!;
      const baseline = withoutData.find(item => item.regionId === region.id)!;
      const expectedDelta = -baseline.score * (0.15 * ((sourceTotals[region.name] ?? 0) / 150039));
      expect(result.score - baseline.score).toBeCloseTo(expectedDelta, 8);
      expect(result.placeIds).toEqual(baseline.placeIds);
    }
  });
});

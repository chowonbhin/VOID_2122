import { describe, expect, it } from 'vitest';
import { baseContent, demoContent, validateContent } from './content';
import { withDemoPlaces, demoSearch } from './demoPlaces';
import { recommend, scorePlaces } from '../domain/score';
import { containsPoint } from '../features/map/geometry';
import type { Profile, Visit } from '../domain/types';

const profile: Profile = { initialLevels: {}, interests: [], experiencedEventIds: [] };
const context = demoSearch(baseContent.regions[0].start, '2026-11-08T02:00');
describe('explicit demo candidate fill', () => {
  it('adds 25 stable, labelled virtual candidates inside every dong without changing existing evidence', () => {
    expect(validateContent(demoContent)).toEqual([]);
    expect(demoContent.places).toHaveLength(baseContent.places.length + 625);
    expect(withDemoPlaces(baseContent)).toEqual(demoContent);
    expect(demoContent.places.slice(0, baseContent.places.length)).toEqual(baseContent.places);
    for (const region of demoContent.regions) {
      const extra = demoContent.places.filter(p => p.regionId === region.id && p.id.startsWith('demo-'));
      expect(extra).toHaveLength(25);
      for (const place of extra) {
        expect(place.isVirtual).toBe(true);
        expect(place.name).toContain('시연');
        expect(place.source?.label).toContain('실제 장소·운영·리뷰 정보 아님');
        expect(place.popularityEvidence).toBeUndefined();
        expect(containsPoint(region, place.location!)).toBe(true);
      }
    }
  });
  it.each(['2026-11-08T02:00', '2026-11-08T14:00', '2026-12-24T23:59'])('scores 20 of at least 25 candidates in all 25 dongs at %s', when => {
    const result = recommend(demoContent, profile, [], { ...context, when });
    expect(result.excluded).toEqual([]);
    expect(result.recommendations).toHaveLength(25);
    for (const item of result.recommendations) {
      expect(item.placeIds).toHaveLength(20);
      expect(item.eligiblePlaceCount).toBeGreaterThanOrEqual(25);
      expect(item.shortfallCount).toBe(0);
      expect(item.score).toBeGreaterThan(0);
    }
  });
  it('visiting the twentieth candidate brings in reserves, recomputes the region and deletion restores it for every dong', () => {
    const before = recommend(demoContent, profile, [], context);
    for (const region of demoContent.regions) {
      const original = before.recommendations.find(item => item.regionId === region.id)!;
      const lastId = original.placeIds[19];
      const visits: Visit[] = [{ id: 'test', placeId: lastId, date: '2026-11-08', method: 'self_report' }];
      const after = recommend(demoContent, profile, visits, context).recommendations;
      const changed = after.find(item => item.regionId === region.id)!;
      expect(changed.placeIds).toHaveLength(20);
      expect(changed.placeIds).not.toContain(lastId);
      expect(changed.placeIds.some(id => !original.placeIds.includes(id))).toBe(true);
      expect(changed.score).toBeLessThan(original.score);
      expect(changed.level).toBe(1);
      for (const other of after.filter(item => item.regionId !== region.id)) {
        expect(other).toEqual(before.recommendations.find(item => item.regionId === other.regionId));
      }
    }
    expect(recommend(demoContent, profile, [], context)).toEqual(before);
  });
  it('still respects interests and excludes unknown real popularity, franchises and unknown classification', () => {
    const central = demoContent.regions[0];
    const filtered = scorePlaces(central, demoContent, profile, [], { ...context, interests: ['nature'] });
    expect(filtered.filter(p => p.selected)).toHaveLength(5);
    expect(filtered.some(p => p.placeId === 'a6-franchise')).toBe(false);
    for (const real of demoContent.places.filter(p => !p.isVirtual)) {
      const scores = scorePlaces(demoContent.regions.find(r => r.id === real.regionId)!, demoContent, profile, [], { ...context, when: '2026-11-08T14:00' });
      expect(scores.find(p => p.placeId === real.id)?.eligible).toBe(false);
    }
  });
});

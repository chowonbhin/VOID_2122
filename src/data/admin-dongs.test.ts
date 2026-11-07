import { describe, expect, it } from 'vitest';
import { baseContent as content } from './content';
import geography from './geography/admin-dongs.json';
import { containsPoint, projection, regionPath } from '../features/map/geometry';
import { recommend, regionLevel, placeStatus } from '../domain/score';
import { migrateState, emptyState } from '../storage';
import { parseRoute } from '../route';

const profile = emptyState().profile;
const ctx = { origin: content.regions[0].start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 100 };

describe('administrative-dong migration and geography', () => {
  it('has the complete official 13 + 12 dong set, unique administrative codes, real polygons and interior anchors', () => {
    const expected = '일동 이동 사동 사이동 해양동 본오1동 본오2동 본오3동 부곡동 월피동 성포동 반월동 안산동 와동 고잔동 중앙동 호수동 원곡동 백운동 신길동 초지동 선부1동 선부2동 선부3동 대부동'.split(' ');
    expect(content.regions.map(r => r.name).sort()).toEqual(expected.sort());
    expect(new Set(content.regions.map(r => r.adminCode)).size).toBe(25);
    expect(content.regions.filter(r => r.district === '상록구')).toHaveLength(13);
    expect(content.regions.filter(r => r.district === '단원구')).toHaveLength(12);
    for (const r of content.regions) {
      expect(containsPoint(r, geography.dongs.find(d => d.id === r.id)!.labelPoint)).toBe(true);
      expect(regionPath(r, projection([r]))).not.toMatch(/NaN|Infinity/);
      expect(r.geometry!.coordinates.length).toBeGreaterThan(0);
    }
  });
  it('assigns every geolocated place to its containing dong; b3 belongs to Singil, not Wongok', () => {
    for (const p of content.places.filter(p => p.location)) {
      expect(containsPoint(content.regions.find(r => r.id === p.regionId)!, p.location!)).toBe(true);
    }
    expect(content.places.find(p => p.id === 'b3')!.regionId).toBe('dong-4127356500');
    const visits = [{ id: 'legacy-visit', placeId: 'b3', date: '2026-11-08', method: 'self_report' as const }];
    expect(regionLevel('dong-4127356500', profile, visits, content.places)).toBe(1);
    expect(regionLevel('dong-4127354500', profile, visits, content.places)).toBe(0);
  });
  it('keeps records and current dong levels, archives ambiguous old levels, migrates idempotently', () => {
    const before = { ...emptyState(), profile: { ...profile, initialLevels: { 'region-a': 2 as const, 'region-b': 1 as const, 'dong-4127151000': 1 as const } },
      visits: [{ id: 'old', placeId: 'b3', date: '2026-11-08', method: 'self_report' as const }], search: ctx };
    const after = migrateState(before);
    expect(after.profile.initialLevels).toEqual({ 'dong-4127151000': 1 });
    expect(after.legacyInitialLevels).toEqual({ 'region-a': 2, 'region-b': 1 });
    expect(after.needsDongLevelReview).toBe(true);
    expect(after.visits).toEqual(before.visits);
    expect(after.search).toEqual(before.search);
    expect(migrateState(after)).toEqual(after);
    expect(parseRoute('#/region/region-a')).toEqual({ name: 'region', regionId: 'dong-4127353200' });
  });
  it('distinguishes unresearched dongs from zero score and closed or filtered venues', () => {
    const result = recommend(content, profile, [], ctx);
    expect(result.recommendations).toHaveLength(3);
    expect(result.excluded.filter(r => r.reason === 'no_data')).toHaveLength(19);
    expect(recommend(content, profile, [], { ...ctx, when: '2026-11-08T23:00' }).excluded.filter(r => r.reason === 'no_eligible_places')).toHaveLength(6);
  });
  it('contains source-backed real public venues; reviewed hours expire and admission cutoffs apply', () => {
    const real = content.places.filter(p => !p.isVirtual);
    expect(real).toHaveLength(3);
    for (const p of real) {
      expect(p.regionSource?.url).toMatch(/^https:/);
      expect(p.franchise.source?.url).toMatch(/^https:/);
      expect(p.source?.url).toMatch(/^https:/);
      expect(placeStatus(p, '2026-11-08T14:00').status).toBe('open');
      expect(placeStatus(p, '2026-11-09T14:00').status).toBe('closed');
      expect(placeStatus(p, '2026-11-08T17:30').status).toBe('closed');
      expect(placeStatus(p, '2026-11-14T14:00').status).toBe('unknown');
    }
  });
});

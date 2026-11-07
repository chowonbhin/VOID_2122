import { describe, expect, it } from 'vitest';
import { content, eventsOfPlace, placesOfRegion, validateContent, type Content } from '../data/content';
import { franchiseStatus, isNonFranchisePlace } from './placeEligibility';
import { recommend, regionLevel, scorePlaces } from './score';
import type { Place, Profile, SearchContext, Visit } from './types';

const profile: Profile = { initialLevels: {}, interests: [], experiencedEventIds: [] };
const ctx: SearchContext = { origin: { lat: 37.3219, lng: 126.8309, label: '시연 출발지' }, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 10 };
const allowed = content.places.find(p => p.id === 'a1')!;
const franchise = content.places.find(p => p.id === 'a6-franchise')!;
const unverified = content.places.find(p => p.id === 'b6-unverified')!;
const visit = (p: Place): Visit => ({ id: p.id, placeId: p.id, date: '2026-11-08', method: 'self_report' });

describe('franchise exclusion', () => {
  it('only admits explicitly sourced non-franchise places; absence never defaults to allowed', () => {
    expect(isNonFranchisePlace(allowed)).toBe(true);
    expect(franchiseStatus(franchise)).toBe('franchise');
    for (const classification of [undefined, null, { status: 'unexpected' }, { status: 'unknown' },
      { status: 'non_franchise', source: null },
      { status: 'non_franchise', source: { label: ' ', checkedAt: '2026-11-08' } },
      { status: 'non_franchise', source: { label: '출처', checkedAt: '2026-02-30' } },
    ]) {
      const place = { ...allowed, franchise: classification } as Place;
      expect(franchiseStatus(place)).toBe('unknown');
      expect(isNonFranchisePlace(place)).toBe(false);
      if (classification?.status !== 'unknown') expect(validateContent({ ...content, places: [place] }).some(p => p.includes('franchise classification'))).toBe(true);
    }
  });

  it('excluded high-value open places and their events cannot change scores, counts or reasons', () => {
    const baseline: Content = { ...content, places: content.places.filter(isNonFranchisePlace) };
    expect(recommend(content, profile, [], ctx)).toEqual(recommend(baseline, profile, [], ctx));
    expect(eventsOfPlace(franchise.id)).toEqual([]);
    expect(eventsOfPlace(unverified.id)).toEqual([]);
    for (const region of content.regions) {
      const ids = scorePlaces(region, content, profile, [], ctx).map(p => p.placeId);
      expect(ids).not.toContain(franchise.id);
      expect(ids).not.toContain(unverified.id);
      expect(placesOfRegion(region.id).every(isNonFranchisePlace)).toBe(true);
    }
  });

  it('excludes even when a legacy record would otherwise raise region Lv; records are preserved', () => {
    const visits = [visit(franchise), visit(unverified)];
    const original = structuredClone(visits);
    for (const region of content.regions) expect(regionLevel(region.id, profile, visits, content.places)).toBe(0);
    expect(recommend(content, profile, visits, ctx)).toEqual(recommend(content, profile, [], ctx));
    expect(visits).toEqual(original);
  });

  it('a region with only excluded places has no recommendation, discoverable places or event escape hatch', () => {
    const excludedOnly = { ...content, places: [franchise, unverified] };
    expect(recommend(excludedOnly, profile, [], ctx).recommendations).toEqual([]);
    expect(recommend(excludedOnly, profile, [], ctx).excluded.every(r => r.reason === 'no_eligible_places')).toBe(true);
    for (const region of content.regions) expect(placesOfRegion(region.id, excludedOnly)).toEqual([]);
  });

  it('an unsourced or unknown reclassification removes a formerly allowed place everywhere', () => {
    const revised = { ...content, places: content.places.map(p => p.id === allowed.id ? { ...p, franchise: { status: 'non_franchise' as const, source: null } } : p) };
    const result = recommend(revised, profile, [], ctx).recommendations.find(r => r.regionId === allowed.regionId)!;
    expect(result.placeIds).not.toContain(allowed.id);
    expect(result.openPlaceCount).toBe(2);
    expect(placesOfRegion(allowed.regionId, revised).map(p => p.id)).not.toContain(allowed.id);
    expect(eventsOfPlace(allowed.id, revised)).toEqual([]);
    expect(regionLevel(allowed.regionId, profile, [visit(allowed)], revised.places)).toBe(0);
  });
});

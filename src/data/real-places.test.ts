import { describe, expect, it } from 'vitest';
import { content, validateContent } from './content';
import { containsPoint } from '../features/map/geometry';
import { discoverPlaces, isDiscoverablePlace } from '../domain/discovery';
import { isNonFranchisePlace, isRecommendationCandidate } from '../domain/placeEligibility';
import { placeStatus, recommend, scorePlaces } from '../domain/score';
import { placePopularity } from '../domain/popularity';
import type { Profile, SearchContext } from '../domain/types';

const profile: Profile = { initialLevels: {}, interests: [], experiencedEventIds: [] };
const search: SearchContext = { origin: content.regions[0].start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 100 };

describe('production: real 20-place discovery', () => {
  it('has no simulated venues or events, every coordinate fits its administrative dong, no duplicate names at the same address', () => {
    expect(validateContent(content)).toEqual([]);
    expect(content.regions).toHaveLength(25);
    expect(content.events).toEqual([]);
    const identities = new Set<string>();
    for (const place of content.places) {
      expect(place.isVirtual, place.name).toBe(false);
      expect(place.popularity, place.name).toBeUndefined();
      expect(place.searchSource?.url, place.name).toMatch(/^https:\/\/map.naver.com\//);
      expect(place.location, place.name).not.toBeNull();
      const region = content.regions.find(r => r.id === place.regionId)!;
      expect(containsPoint({ geometry: region.geometry! }, place.location!), place.name).toBe(true);
      const identity = `${place.name.replace(/\s/g, '')}:${place.address?.replace(/\s/g, '')}`;
      expect(identities.has(identity), identity).toBe(false);
      identities.add(identity);
    }
  });
  it('shows 20 actual unique venues in all 25 dongs and keeps reserves after filtering chains', () => {
    for (const region of content.regions) {
      const { candidates, displayed } = discoverPlaces(region, content, profile, [], search);
      expect(candidates.length, region.name).toBeGreaterThan(20);
      expect(displayed, region.name).toHaveLength(20);
      const score = recommend(content, profile, [], search).recommendations.find(item => item.regionId === region.id)!;
      expect(score.placeIds, region.name).toEqual(displayed.map(place => place.id));
      expect(score.placeIds).toHaveLength(20);
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(new Set(displayed.map(p => p.id)).size).toBe(20);
      expect(displayed.every(isDiscoverablePlace)).toBe(true);
      expect(displayed.every(p => !p.discovery?.excludedReason)).toBe(true);
    }
  });
  it('scores all 20 displayed real candidates, labels unknown classification, and replaces visited low scorers', () => {
    const region = content.regions[0];
    const before = discoverPlaces(region, content, profile, [], search);
    const target = before.displayed.find(p => !isNonFranchisePlace(p))!;
    const visits = [{ id: 'real-visit', placeId: target.id, date: '2026-11-08', method: 'self_report' as const }];
    const after = discoverPlaces(region, content, profile, visits, search);
    expect(after.displayed).toHaveLength(20);
    expect(after.displayed.map(p => p.id)).not.toContain(target.id);
    expect(after.candidates.map(p => p.id)).toContain(target.id);
    expect(scorePlaces(region, content, profile, visits, search).find(p => p.placeId === target.id)).toMatchObject({ eligible: true, provisional: true, selected: false });
    expect(discoverPlaces(region, content, profile, [], search).displayed).toEqual(before.displayed);
  });
  it('uses actual individual review observations; all 20 candidates contribute and cards/map share identical selection', () => {
    const baba = content.places.find(p => p.name === '바바카멜')!;
    expect(baba.popularityEvidence).toMatchObject({ provider: 'naver_place', metric: 'visitor_reviews', count: 801 });
    expect(baba.popularityEvidence?.source.url).toMatch(/^https:\/\/hamgae.com\/place\//);
    expect(content.places.filter(p => p.popularityEvidence).length).toBeGreaterThan(250);
    const result = recommend(content, profile, [], search);
    for (const item of result.recommendations) {
      const region = content.regions.find(r => r.id === item.regionId)!;
      const discovery = discoverPlaces(region, content, profile, [], search);
      expect(discovery.displayed.filter(p => discovery.scores.some(s => s.placeId === p.id && s.selected)).map(p => p.id)).toEqual(item.placeIds);
      expect(item.placeIds.every(id => isRecommendationCandidate(content.places.find(p => p.id === id)!))).toBe(true);
      const visited = [{ id: 'visited', placeId: baba.id, date: '2026-11-08', method: 'self_report' as const }];
      if (item.regionId === baba.regionId) expect(recommend(content, profile, visited, search).recommendations.find(r => r.regionId === item.regionId)!.score).toBeLessThan(item.score);
    }
  });
  it('missing popularity remains unknown, and missing weekday hours are not closed', () => {
    const unknown = content.places.find(p => !p.popularityEvidence)!;
    expect(placePopularity(unknown, content.places).status).toBe('unknown');
    const nuave = content.places.find(p => p.name === '누아베')!;
    expect(placeStatus(nuave, '2026-11-08T14:00').status).toBe('unknown');
    expect(placeStatus(nuave, '2026-11-10T14:00').status).toBe('open');
    expect(placeStatus(nuave, '2026-11-10T18:00').status).toBe('closed');
  });
});

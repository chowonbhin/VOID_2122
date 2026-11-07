import { describe, expect, it } from 'vitest';
import { content } from './content';
import original from './research/real-places.json';
import reviewed from './naver-places.json';
import payload from './places.runtime.json';
import { isRecommendationCandidate } from '../domain/placeEligibility';
import { recommend } from '../domain/score';
import type { Category, Place, Profile, Visit } from '../domain/types';

const originalIds = new Set(original.map(place => place.id));
const originalPlaces = [...reviewed.filter(place => !originalIds.has(place.id)), ...original] as Place[];
const candidates = originalPlaces.filter(isRecommendationCandidate);
const search = { origin: content.regions[0].start, when: '2026-11-08T14:00', interests: [] as Category[], maxDistanceKm: 100 };

describe('minimal production place payload', () => {
  it('keeps every usable candidate and all functional fields, including reserves and exact source URLs', () => {
    expect(content.places).toHaveLength(candidates.length);
    expect(content.places.every(isRecommendationCandidate)).toBe(true);
    expect(content.places).toEqual(candidates.map(({ discovery: _rawCategory, ...place }) => place));
    expect(JSON.stringify(payload).length).toBeLessThan(JSON.stringify(originalPlaces).length * 0.35);
  });

  it.each([0, 1, 2] as const)('preserves all 25 region scores, footfall and selections at Lv.%i, including visits and interest filters', level => {
    const profile: Profile = { initialLevels: Object.fromEntries(content.regions.map(r => [r.id, level])), interests: [], experiencedEventIds: [] };
    const visited: Visit[] = content.regions.map((r, i) => ({ id: `visit-${i}`, placeId: candidates.find(p => p.regionId === r.id)!.id, date: '2026-11-08', method: 'self_report' }));
    for (const visits of [[], visited]) {
      for (const interests of [[], ['food'], ['nature', 'culture']] as Category[][]) {
        const ctx = { ...search, interests };
        expect(recommend(content, profile, visits, ctx)).toEqual(recommend({ ...content, places: originalPlaces }, profile, visits, ctx));
      }
    }
  });
});

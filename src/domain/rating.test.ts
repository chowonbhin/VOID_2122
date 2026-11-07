import { describe, expect, it } from 'vitest';
import type { Place } from './types';
import { placeRating, validRatingEvidence } from './rating';
import { content } from '../data/content';
import { recommend, scorePlaces } from './score';

const source = { label: 'External map average', url: 'https://example.com/place', checkedAt: '2026-11-08' };
const base = content.places.find(p => p.name === '레드지')!;
const rated = (id: string, value?: number): Place => ({ ...base, id, baseValue: 70,
  popularityEvidence: undefined, opening: { status: 'unknown' },
  ratingEvidence: value === undefined ? undefined : { provider: 'naver_place', value, scale: 5, source } });
const region = content.regions.find(r => r.id === base.regionId)!;
const profile = { initialLevels: {}, interests: [], experiencedEventIds: [] };
const search = { origin: region.start, when: '2026-11-08T14:00', interests: [], maxDistanceKm: 100 };

describe('external average-star bonus', () => {
  it('distinguishes stars at Lv.0, leaves original stars untouched, and retains the bonus after visits', () => {
    const data = { ...content, regions: [region], places: [rated('four', 4), rated('five', 5), rated('missing')], events: [] };
    expect(scorePlaces(region, data, profile, [], search).map(p => p.score)).toEqual([94, 100, 70]);
    const visits = [{ id: 'visited', placeId: 'five', date: '2026-11-08', method: 'self_report' as const }];
    expect(scorePlaces(region, data, profile, visits, search).map(p => p.score)).toEqual([84, 80, 60]);
    expect(data.places[1].ratingEvidence!.value).toBe(5);
  });

  it.each([undefined, 0, -1, 5.01, NaN, Infinity])('missing or invalid average %s has no fabricated bonus', value => {
    expect(placeRating(rated('invalid', value))).toEqual({ status: 'unknown', bonus: 0 });
  });

  it('rejects absent provenance or another rating scale and caps quality at 100', () => {
    const place = rated('rated', 5);
    expect(validRatingEvidence({ ...place.ratingEvidence!, source: { ...source, url: 'javascript:alert(1)' } })).toBe(false);
    expect(validRatingEvidence({ ...place.ratingEvidence!, scale: 10 as 5 })).toBe(false);
    expect(placeRating({ ...place, baseValue: 95 }).bonus).toBe(5);
  });

  it('changes the actual top 20 and region sum while preserving fixed normalization and traffic policy', () => {
    const places = [...Array.from({ length: 20 }, (_, i) => rated(`a${i}`)), rated('last', 4.5)];
    const data = { ...content, regions: [region], places, events: [] };
    const result = recommend(data, profile, [], search).recommendations[0];
    expect(result.placeIds).toHaveLength(20);
    expect(result.placeIds[0]).toBe('last');
    expect(result.placeScoreSum).toBe(19 * 70 + 97);
    expect(result.normalizedBaseScore).toBeCloseTo((19 * 70 + 97) / 2200 * 100);
    expect(result.footfall).toMatchObject({ penaltyRate: 0 });
    const lv1 = { ...profile, initialLevels: { [region.id]: 1 as const } };
    const withTraffic = recommend(data, lv1, [], search).recommendations[0];
    const withoutTraffic = recommend({ ...data, footfall: undefined }, lv1, [], search).recommendations[0];
    expect(withTraffic.score / withoutTraffic.score).toBeCloseTo(1 - 0.15 * 30423 / 150039);
  });

  it('production retains verified observations and has distinct Lv.0 scores without changing missing ratings', () => {
    expect(base.ratingEvidence).toMatchObject({ value: 4.28, provider: 'naver_place', scale: 5 });
    expect(base.ratingEvidence!.source.url).toMatch(/^https:\/\/hamgae.com\//);
    const scores = scorePlaces(region, content, profile, [], search);
    expect(scores.find(p => p.placeId === base.id)?.score).toBeCloseTo(95.68);
    expect(scores.some(p => p.eligible && p.rating.status === 'unknown' && p.score === 70)).toBe(true);
    expect(content.places.filter(p => p.ratingEvidence)).toHaveLength(75);
  });
});

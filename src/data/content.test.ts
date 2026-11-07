import { describe, expect, it } from 'vitest';
import { content, placesOfRegion, validateContent } from './content';
import type { Place } from '../domain/types';

describe('content', () => {
  it('has no integrity problems', () => {
    expect(validateContent(content)).toEqual([]);
  });

  it('has 25 administrative dongs and correct per-dong discovery content', () => {
    expect(content.regions).toHaveLength(25);
    expect(placesOfRegion('dong-4127353200')).toHaveLength(5);
    expect(placesOfRegion('dong-4127354500')).toHaveLength(4);
    expect(placesOfRegion('dong-4127356500').map(p => p.id)).toEqual(['b3']);
  });

  it('catches duplicate ids and dangling regionId', () => {
    const bad = { ...content, places: [...content.places, { ...content.places[0], regionId: 'nope' }] };
    const problems = validateContent(bad);
    expect(problems).toContain(`duplicate id: ${content.places[0].id}`);
    expect(problems.some((p) => p.includes('unknown regionId nope'))).toBe(true);
  });

  it('reports missing hours and invalid counts independently without throwing', () => {
    const bad = structuredClone(content);
    const place = bad.places[0];
    delete (place as Partial<Place>).opening;
    place.popularityEvidence = { provider: 'naver_place', metric: 'visitor_reviews', count: -1,
      period: 'cumulative', source: { label: '검증용 출처', url: 'https://example.com', checkedAt: '2026-11-08' } };
    expect(validateContent(bad)).toEqual(expect.arrayContaining([
      `place ${place.id}: missing opening`, `place ${place.id}: invalid popularity evidence`,
    ]));
  });
});

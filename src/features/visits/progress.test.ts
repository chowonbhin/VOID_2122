import { describe, expect, it } from 'vitest';
import { content } from '../../data/content';
import type { Profile, Visit } from '../../domain/types';
import { getVisitProgress } from './progress';

const places = content.places;
const regionAPlaces = places.filter((place) => place.regionId === 'region-a');
const a1 = regionAPlaces[0];
const a2 = regionAPlaces[1];

function profile(initialLevel: 0 | 1 | 2 = 0): Profile {
  return { initialLevels: { 'region-a': initialLevel }, interests: [], experiencedEventIds: [] };
}

function visits(placeIds: string[]): Visit[] {
  return placeIds.map((placeId, index) => ({
    id: `visit-${index}`,
    placeId,
    date: `2026-11-${String(8 + index).padStart(2, '0')}`,
    method: 'self_report',
  }));
}

describe('visit progress', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
  ] as const)('maps %i distinct visited places to region Lv.%i', (count, expectedLevel) => {
    const records = visits(regionAPlaces.slice(0, count).map((place) => place.id));
    const progress = getVisitProgress(a1, places, profile(), records);

    expect(progress.regionLevel).toBe(expectedLevel);
    expect(progress.distinctPlaceCount).toBe(count);
  });

  it('counts repeated visits to one place once, even across different dates', () => {
    expect(getVisitProgress(a1, places, profile(), visits([a1.id, a1.id, a1.id]))).toEqual({
      regionLevel: 1,
      placeLevel: 2,
      distinctPlaceCount: 1,
    });
  });

  it('ignores other-region and unknown place IDs when calculating regional progress', () => {
    const records = visits([a2.id, 'b1', 'b2', 'not-a-place']);

    expect(getVisitProgress(a1, places, profile(), records)).toEqual({
      regionLevel: 1,
      placeLevel: 1,
      distinctPlaceCount: 1,
    });
  });

  it.each([1, 2] as const)('retains initial region Lv.%i after all visit records are removed', (initialLevel) => {
    const beforeDeletion = getVisitProgress(a1, places, profile(initialLevel), visits([a1.id]));
    const afterDeletion = getVisitProgress(a1, places, profile(initialLevel), []);

    expect(beforeDeletion.regionLevel).toBe(initialLevel);
    expect(afterDeletion).toEqual({
      regionLevel: initialLevel,
      placeLevel: initialLevel,
      distinctPlaceCount: 0,
    });
  });

  it('adds the individual place level only to a place with a visit record', () => {
    const records = visits([a1.id]);

    expect(getVisitProgress(a1, places, profile(), records).placeLevel).toBe(2);
    expect(getVisitProgress(a2, places, profile(), records).placeLevel).toBe(1);
  });

  it('keeps a visited place at the maximum Lv.3 when its region is already familiar', () => {
    expect(getVisitProgress(a1, places, profile(2), visits([a1.id, a1.id, a1.id]))).toEqual({
      regionLevel: 2,
      placeLevel: 3,
      distinctPlaceCount: 1,
    });
  });
});

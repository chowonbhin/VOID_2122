import { distinctVisitedPlaces, placeLevel, regionLevel } from '../../domain/score';
import type { Level, Place, Profile, Visit } from '../../domain/types';

export interface VisitProgress {
  regionLevel: 0 | 1 | 2;
  placeLevel: Level;
  distinctPlaceCount: number;
}

/**
 * Visit UI adapter to the captain-owned shared engine. Keep all level rules in score.ts
 * so visits, region details and recommendations cannot disagree after a record changes.
 */
export function getVisitProgress(
  place: Place,
  places: readonly Place[],
  profile: Profile,
  visits: readonly Visit[],
): VisitProgress {
  const regionLv = regionLevel(place.regionId, profile, [...visits], [...places]);
  return {
    regionLevel: regionLv,
    placeLevel: placeLevel(place.id, regionLv, [...visits]),
    distinctPlaceCount: distinctVisitedPlaces(place.regionId, [...visits], [...places]).length,
  };
}

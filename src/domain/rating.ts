import type { Place } from './types';
import { hasClassificationSource } from './placeEligibility';
import { PLACE_BASE_MAX, RATING_BONUS_CAP } from './policy';

export const RATING_PROVIDERS = { naver_place: '네이버', kakao_map: '카카오맵', google_maps: 'Google 지도' } as const;
export type RatingResult =
  | { status: 'measured'; bonus: number; evidence: NonNullable<Place['ratingEvidence']> }
  | { status: 'unknown'; bonus: 0 };

const httpUrl = (url: string | undefined) => {
  try { return ['https:', 'http:'].includes(new URL(url ?? '').protocol); } catch { return false; }
};

export function validRatingEvidence(e: Place['ratingEvidence']): e is NonNullable<Place['ratingEvidence']> {
  return !!e && Object.hasOwn(RATING_PROVIDERS, e.provider) && e.scale === 5
    && Number.isFinite(e.value) && e.value >= 1 && e.value <= 5
    && hasClassificationSource(e.source) && httpUrl(e.source.url)
    && (!e.originalUrl || httpUrl(e.originalUrl));
}

/** Average stars add quality value at every Lv; review quantity remains a separate penalty.
 * Preserve the quality ceiling of 100, and the existing 110 ceiling with event bonuses.
 */
export function placeRating(place: Place): RatingResult {
  const evidence = place.ratingEvidence;
  if (!validRatingEvidence(evidence)) return { status: 'unknown', bonus: 0 };
  return { status: 'measured', evidence,
    bonus: Math.min(evidence.value / evidence.scale * RATING_BONUS_CAP, Math.max(0, PLACE_BASE_MAX - place.baseValue)) };
}

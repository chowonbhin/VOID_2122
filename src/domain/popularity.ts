import type { Place } from './types';
import { hasClassificationSource, isRecommendationCandidate } from './placeEligibility';

export const POPULARITY_LABELS = {
  visitor_reviews: '방문자 리뷰 수', blog_reviews: '블로그 리뷰 수', visits: '방문수',
} as const;

export type PopularityResult =
  | { status: 'measured'; value: number; evidence: NonNullable<Place['popularityEvidence']>; referenceMax: number }
  | { status: 'simulated'; value: number }
  | { status: 'unknown'; value: null };

export function validPopularityEvidence(e: Place['popularityEvidence']): e is NonNullable<Place['popularityEvidence']> {
  if (!e || !['naver_place', 'operator'].includes(e.provider)
    || !['visitor_reviews', 'blog_reviews', 'visits'].includes(e.metric)
    || !Number.isSafeInteger(e.count) || e.count < 0
    || !/^(cumulative|\d{4}-(0[1-9]|1[0-2]))$/.test(e.period)
    || !hasClassificationSource(e.source)) return false;
  try { return ['http:', 'https:'].includes(new URL(e.source.url ?? '').protocol); } catch { return false; }
}

/** Same snapshot/provider/metric/period, before time/interest/top-20 selection.
 * Log scaling limits outlier leverage; more counts always mean an equal or larger penalty.
 * This is an initial calibration, not a measured probability or a star rating.
 */
export function createPopularityResolver(allPlaces: Place[]): (place: Place) => PopularityResult {
  const maxima = new Map<string, number>();
  const key = (e: NonNullable<Place['popularityEvidence']>) => `${e.provider}:${e.metric}:${e.period}`;
  for (const place of allPlaces) {
    const e = place.popularityEvidence;
    if (isRecommendationCandidate(place) && validPopularityEvidence(e)) {
      maxima.set(key(e), Math.max(maxima.get(key(e)) ?? 0, e.count));
    }
  }
  // This index belongs to one calculation, never cached across mutable data updates.
  return place => popularityWithMax(place, evidence => maxima.get(key(evidence)) ?? 0);
}

function popularityWithMax(place: Place, reference: (e: NonNullable<Place['popularityEvidence']>) => number): PopularityResult {
  const evidence = place.popularityEvidence;
  if (validPopularityEvidence(evidence)) {
    const referenceMax = Math.max(evidence.count, reference(evidence));
    return { status: 'measured', value: referenceMax === 0 ? 0 : Math.log1p(evidence.count) / Math.log1p(referenceMax), evidence, referenceMax };
  }
  // Never disguise missing/invalid real counts as zero or fall back to a fabricated value.
  if (!evidence && place.isVirtual && typeof place.popularity === 'number'
    && Number.isFinite(place.popularity) && place.popularity >= 0 && place.popularity <= 1) {
    return { status: 'simulated', value: place.popularity };
  }
  return { status: 'unknown', value: null };
}

export function placePopularity(place: Place, allPlaces: Place[]): PopularityResult {
  return createPopularityResolver(allPlaces)(place);
}

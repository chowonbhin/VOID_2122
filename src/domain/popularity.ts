import type { Place } from './types';
import { hasClassificationSource, isNonFranchisePlace } from './placeEligibility';

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
export function placePopularity(place: Place, allPlaces: Place[]): PopularityResult {
  const evidence = place.popularityEvidence;
  if (validPopularityEvidence(evidence)) {
    const counts = allPlaces.filter(isNonFranchisePlace).flatMap(p => {
      const e = p.popularityEvidence;
      return validPopularityEvidence(e) && e.provider === evidence.provider
        && e.metric === evidence.metric && e.period === evidence.period ? [e.count] : [];
    });
    const referenceMax = Math.max(evidence.count, ...counts);
    return { status: 'measured', value: referenceMax === 0 ? 0 : Math.log1p(evidence.count) / Math.log1p(referenceMax), evidence, referenceMax };
  }
  // Never disguise missing/invalid real counts as zero or fall back to a fabricated value.
  if (!evidence && place.isVirtual && typeof place.popularity === 'number'
    && Number.isFinite(place.popularity) && place.popularity >= 0 && place.popularity <= 1) {
    return { status: 'simulated', value: place.popularity };
  }
  return { status: 'unknown', value: null };
}

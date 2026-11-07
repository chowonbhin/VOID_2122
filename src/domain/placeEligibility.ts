import type { Place, Source } from './types';

/** A recorded classification needs its own provenance, not just known opening hours. */
export function hasClassificationSource(source: Source | null | undefined): source is Source {
  if (typeof source?.label !== 'string' || !source.label.trim()
    || typeof source.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt)) return false;
  const date = Date.parse(`${source.checkedAt}T00:00:00Z`);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === source.checkedAt;
}

/** Missing, invalid or unsourced classifications are never assumed to be independent. */
export function franchiseStatus(place: Place): Place['franchise']['status'] {
  if (place.franchise?.status === 'franchise') return 'franchise';
  if (place.franchise?.status === 'non_franchise' && hasClassificationSource(place.franchise.source)) return 'non_franchise';
  return 'unknown';
}

/** Verified classification; pending real candidates must never be described as verified. */
export const isNonFranchisePlace = (place: Place): boolean => franchiseStatus(place) === 'non_franchise';

export const isRealSearchPlace = (place: Place): boolean =>
  !place.isVirtual && Boolean(place.searchSource?.url && place.location);

/** User's 20 displayed = 20 scored policy. Missing evidence stays labelled; known/suspected chains stay out. */
export const isRecommendationCandidate = (place: Place): boolean =>
  !place.discovery?.excludedReason && franchiseStatus(place) !== 'franchise'
  && (isNonFranchisePlace(place) || isRealSearchPlace(place));

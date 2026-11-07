import type { Content } from '../data/content';
import type { Place, Profile, Region, SearchContext, Visit } from './types';
import { isRecommendationCandidate } from './placeEligibility';
import { REGION_PLACE_LIMIT } from './policy';
import { scorePlaces } from './score';

/** Real score candidates; unknown evidence is visibly provisional. */
export const isDiscoverablePlace = (place: Place): boolean =>
  !place.isVirtual && isRecommendationCandidate(place);

export function discoverPlaces(region: Region, content: Content, profile: Profile, visits: Visit[], search: SearchContext | null) {
  const scores = search ? scorePlaces(region, content, profile, visits, search) : [];
  const byId = new Map(scores.map(score => [score.placeId, score]));
  const visited = new Set(visits.map(visit => visit.placeId));
  const candidates = content.places.filter(place => place.regionId === region.id && isDiscoverablePlace(place));
  candidates.sort((a, b) => {
    const left = byId.get(a.id), right = byId.get(b.id);
    return Number(right?.eligible ?? false) - Number(left?.eligible ?? false)
      || (right?.score ?? 0) - (left?.score ?? 0)
      || ((left?.rank ?? Infinity) === (right?.rank ?? Infinity) ? 0 : (left?.rank ?? Infinity) - (right?.rank ?? Infinity))
      // Pending results have no invented score; prefer new places only within this group.
      || (left?.eligible || right?.eligible ? 0 : Number(visited.has(a.id)) - Number(visited.has(b.id)))
      || a.id.localeCompare(b.id, 'en');
  });
  // With conditions, display exactly the places used by the regional score. Closed
  // or differently categorised places remain in candidates for remembered-place access.
  const displayed = search ? candidates.filter(place => byId.get(place.id)?.selected) : candidates.slice(0, REGION_PLACE_LIMIT);
  return { candidates, displayed, scores };
}

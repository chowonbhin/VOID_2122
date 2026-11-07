// Content loader. Owner: Byeunghee02. Edit the JSON files, not this module.
import type { Event, FootfallDataset, Place, Region } from '../domain/types';
import { validateFootfallDataset } from '../domain/footfall';
import { hasClassificationSource, isNonFranchisePlace, isRecommendationCandidate } from '../domain/placeEligibility';
import regionsJson from './regions.json';
import footfallJson from './footfall.json';
import geography from './geography/admin-dongs.json';
import { validPopularityEvidence } from '../domain/popularity';
import { validRatingEvidence } from '../domain/rating';
import realCollection from './real-collection.json';
import placePayload from './places.runtime.json';
import { expandPlacePayload, type PlacePayload } from './placePayload';

export interface Content {
  regions: Region[];
  places: Place[];
  events: Event[];
  footfall?: FootfallDataset;
}

export const naverCandidateStatus = realCollection;

const regions = regionsJson.map(region => ({ ...region,
  geometry: geography.dongs.find(dong => dong.id === region.id)?.geometry })) as Region[];

// Complete usable pool, including reserves below rank 20. Research/excluded records
// are not imported into the browser. Shared metadata is expanded once at startup.
const productionPlaces = expandPlacePayload(placePayload as PlacePayload, regions);
export const content: Content = {
  footfall: footfallJson,
  places: productionPlaces,
  events: [],
  regions: regions.map(region => ({ ...region,
    placeIds: productionPlaces.filter(place => place.regionId === region.id).map(place => place.id) })),
};

/** M01 checks: duplicate ids, dangling references, missing opening info. Returns problems found. */
export function validateContent(c: Content): string[] {
  const problems: string[] = [];
  if (c.footfall) problems.push(...validateFootfallDataset(c.footfall));
  const seen = new Set<string>();
  for (const item of [...c.regions, ...c.places, ...c.events]) {
    if (seen.has(item.id)) problems.push(`duplicate id: ${item.id}`);
    seen.add(item.id);
  }
  const regionIds = new Set(c.regions.map((r) => r.id));
  const placeIds = new Set(c.places.map((p) => p.id));
  const mappedMarkets = new Set<string>();
  for (const p of c.places) {
    if (!regionIds.has(p.regionId)) problems.push(`place ${p.id}: unknown regionId ${p.regionId}`);
    if (!p.franchise || !['non_franchise', 'franchise', 'unknown'].includes(p.franchise.status)) {
      problems.push(`place ${p.id}: missing or invalid franchise classification`);
    } else if (p.franchise.status !== 'unknown' && !hasClassificationSource(p.franchise.source)) {
      problems.push(`place ${p.id}: franchise classification without valid source`);
    }
    if (!p.opening) problems.push(`place ${p.id}: missing opening`);
    else if (p.opening.status === 'known' && !p.opening.weekly) problems.push(`place ${p.id}: known opening without weekly hours`);
    if (p.popularityEvidence && !validPopularityEvidence(p.popularityEvidence)) problems.push(`place ${p.id}: invalid popularity evidence`);
    if (p.ratingEvidence && !validRatingEvidence(p.ratingEvidence)) problems.push(`place ${p.id}: invalid rating evidence`);
    if (p.opening?.status === 'known' && !p.source) problems.push(`place ${p.id}: known opening without source`);
  }
  for (const r of c.regions) {
    const marketIds = r.footfallMarketIds ?? [];
    if (new Set(marketIds).size !== marketIds.length) problems.push(`region ${r.id}: duplicate footfall market`);
    for (const id of marketIds) {
      const market = c.footfall?.markets.find((market) => market.id === id);
      if (!market) problems.push(`region ${r.id}: unknown footfall market ${id}`);
      if (mappedMarkets.has(id)) problems.push(`region ${r.id}: footfall market mapped to multiple regions ${id}`);
      mappedMarkets.add(id);
      if (r.footfallMappingBasis === 'source_dong_label' && market?.sourceDong !== r.name) {
        problems.push(`region ${r.id}: footfall source dong mismatch ${id}`);
      }
    }
    for (const id of r.placeIds) {
      const p = c.places.find((x) => x.id === id);
      if (!p) problems.push(`region ${r.id}: unknown place ${id}`);
      else if (p.regionId !== r.id) problems.push(`region ${r.id}: place ${id} belongs to ${p.regionId}`);
    }
  }
  for (const e of c.events) {
    if (!placeIds.has(e.placeId)) problems.push(`event ${e.id}: unknown placeId ${e.placeId}`);
  }
  return problems;
}

export const regionById = (id: string) => content.regions.find((r) => r.id === id);
/** Discovery content: exclusion also applies to direct exploration without search conditions. */
export const placesOfRegion = (regionId: string, data: Content = content) =>
  data.places.filter((p) => p.regionId === regionId && isRecommendationCandidate(p));
export const eventsOfPlace = (placeId: string, data: Content = content) => {
  const place = data.places.find((p) => p.id === placeId);
  return place && isNonFranchisePlace(place) ? data.events.filter((e) => e.placeId === placeId) : [];
};

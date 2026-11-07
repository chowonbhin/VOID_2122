// Content loader. Owner: Byeunghee02. Edit the JSON files, not this module.
import type { Event, FootfallDataset, Place, Region } from '../domain/types';
import { validateFootfallDataset } from '../domain/footfall';
import { hasClassificationSource, isNonFranchisePlace } from '../domain/placeEligibility';
import regionsJson from './regions.json';
import placesJson from './places.json';
import eventsJson from './events.json';
import footfallJson from './footfall.json';

export interface Content {
  regions: Region[];
  places: Place[];
  events: Event[];
  footfall?: FootfallDataset;
}

export const content: Content = {
  regions: regionsJson as Region[],
  places: placesJson as Place[],
  events: eventsJson as Event[],
  footfall: footfallJson,
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
  for (const p of c.places) {
    if (!regionIds.has(p.regionId)) problems.push(`place ${p.id}: unknown regionId ${p.regionId}`);
    if (!p.franchise || !['non_franchise', 'franchise', 'unknown'].includes(p.franchise.status)) {
      problems.push(`place ${p.id}: missing or invalid franchise classification`);
    } else if (p.franchise.status !== 'unknown' && !hasClassificationSource(p.franchise.source)) {
      problems.push(`place ${p.id}: franchise classification without valid source`);
    }
    if (!p.opening) problems.push(`place ${p.id}: missing opening`);
    else if (p.opening.status === 'known' && !p.opening.weekly) problems.push(`place ${p.id}: known opening without weekly hours`);
    if (p.opening?.status === 'known' && !p.source) problems.push(`place ${p.id}: known opening without source`);
  }
  for (const r of c.regions) {
    const marketIds = r.footfallMarketIds ?? [];
    if (new Set(marketIds).size !== marketIds.length) problems.push(`region ${r.id}: duplicate footfall market`);
    for (const id of marketIds) {
      if (!c.footfall?.markets.some((market) => market.id === id)) problems.push(`region ${r.id}: unknown footfall market ${id}`);
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
  data.places.filter((p) => p.regionId === regionId && isNonFranchisePlace(p));
export const eventsOfPlace = (placeId: string, data: Content = content) => {
  const place = data.places.find((p) => p.id === placeId);
  return place && isNonFranchisePlace(place) ? data.events.filter((e) => e.placeId === placeId) : [];
};

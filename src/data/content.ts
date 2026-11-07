// Content loader. Owner: Byeunghee02. Edit the JSON files, not this module.
import type { Event, Place, Region } from '../domain/types';
import regionsJson from './regions.json';
import placesJson from './places.json';
import eventsJson from './events.json';

export interface Content {
  regions: Region[];
  places: Place[];
  events: Event[];
}

export const content: Content = {
  regions: regionsJson as Region[],
  places: placesJson as Place[],
  events: eventsJson as Event[],
};

/** M01 checks: duplicate ids, dangling references, missing opening info. Returns problems found. */
export function validateContent(c: Content): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const item of [...c.regions, ...c.places, ...c.events]) {
    if (seen.has(item.id)) problems.push(`duplicate id: ${item.id}`);
    seen.add(item.id);
  }
  const regionIds = new Set(c.regions.map((r) => r.id));
  const placeIds = new Set(c.places.map((p) => p.id));
  for (const p of c.places) {
    if (!regionIds.has(p.regionId)) problems.push(`place ${p.id}: unknown regionId ${p.regionId}`);
    if (!p.opening) problems.push(`place ${p.id}: missing opening`);
    else if (p.opening.status === 'known' && !p.opening.weekly) problems.push(`place ${p.id}: known opening without weekly hours`);
    if (p.opening?.status === 'known' && !p.source) problems.push(`place ${p.id}: known opening without source`);
  }
  for (const r of c.regions) {
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
export const placesOfRegion = (regionId: string) => content.places.filter((p) => p.regionId === regionId);
export const eventsOfPlace = (placeId: string) => content.events.filter((e) => e.placeId === placeId);

import type { Place, Region, Source } from '../domain/types';

export interface PlacePayload {
  defaults: Partial<Place>;
  searchSource: Omit<Source, 'url'>;
  places: (Pick<Place, 'id' | 'regionId' | 'name'> & Partial<Place>)[];
}

/** Expand shared metadata without changing IDs, source URLs, hours or measured counts. */
export function expandPlacePayload(payload: PlacePayload, regions: Pick<Region, 'id' | 'name'>[]): Place[] {
  const names = new Map(regions.map(region => [region.id, region.name]));
  return payload.places.map(place => ({
    ...payload.defaults,
    ...place,
    searchSource: place.searchSource ?? {
      ...payload.searchSource,
      url: `https://map.naver.com/p/search/${encodeURIComponent(`${names.get(place.regionId)} ${place.name}`)}`,
    },
  }) as Place);
}

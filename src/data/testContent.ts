// Synthetic mathematical regression fixtures; never imported by the application.
import type { Content } from './content';
import type { Place, Region, Event } from '../domain/types';
import regionsJson from './regions.json';
import placesJson from './places.json';
import eventsJson from './events.json';
import footfallJson from './footfall.json';
import geography from './geography/admin-dongs.json';
import naverPlacesJson from './naver-places.json';
const reviewed = naverPlacesJson as Place[];
const ids = new Set(reviewed.map(p => p.id));
const places = [...placesJson.filter(p => !ids.has(p.id)), ...reviewed] as Place[];
export const baseContent: Content = {
  regions: regionsJson.map(region => ({ ...region,
    placeIds: places.filter(p => p.regionId === region.id).map(p => p.id),
    geometry: geography.dongs.find(d => d.id === region.id)?.geometry })) as Region[],
  places, events: eventsJson as Event[], footfall: footfallJson,
};

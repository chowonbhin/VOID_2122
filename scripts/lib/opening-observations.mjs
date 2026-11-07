import { distanceMeters } from './real-place-import.mjs';
import { openingFromWeeklyText, openingFromTabling } from './opening-hours.mjs';

const normalize = value => value.normalize('NFKC').replace(/\([^)]*\)/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const road = value => value.match(/안산시\s*(?:상록|단원)구\s*\S+(?:로|길)(?:\d+번길)?\s+\d+(?:-\d+)?(?=\s|$)/)?.[0].replace(/\s+/g, '');

/** Enrich existing identities only: cannot add, replace, move or remove a venue. */
export function applyOpeningObservations(places, observations) {
  const byId = new Map(observations.map(e => [e.placeId, e]));
  if (byId.size !== observations.length) throw new Error('Duplicate opening observation');
  const ids = new Set(places.map(p => p.id));
  if (observations.some(e => !ids.has(e.placeId))) throw new Error('Opening observation has no existing venue');
  return places.map(place => {
    const e = byId.get(place.id);
    if (!e) return place;
    if (place.name !== e.placeName || normalize(place.name) !== normalize(e.name)
      || !road(place.address) || road(place.address) !== road(e.address)
      || !e.location || !Number.isFinite(e.location.lat) || !Number.isFinite(e.location.lng)
      || distanceMeters(place.location, e.location) > 60
      || !e.source?.url?.startsWith('https://') || !/^\d{4}-\d{2}-\d{2}$/.test(e.source.checkedAt)) {
      throw new Error(`Opening evidence identity/provenance mismatch: ${place.id}`);
    }
    if (place.source?.checkedAt > e.source.checkedAt) return place;
    const opening = e.provider === 'tabling' ? openingFromTabling(e) : openingFromWeeklyText(e.hoursWeekly);
    if (opening.status !== 'known') throw new Error(`No usable opening evidence: ${place.id}`);
    return { ...place, opening, source: e.source };
  });
}

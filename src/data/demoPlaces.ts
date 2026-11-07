import type { Content } from './content';
import type { Category, Place, Region, SearchContext } from '../domain/types';
import { containsPoint } from '../features/map/geometry';

export const DEMO_MODE_KEY = 'ansan-explore/demo-fill';
export const DEMO_CANDIDATES_PER_DONG = 25;
export function readDemoMode(): boolean {
  try { return localStorage.getItem(DEMO_MODE_KEY) !== 'off'; }
  catch { return true; }
}

const kinds: [Category, string][] = [['nature', '산책'], ['culture', '문화'], ['food', '먹거리'], ['market', '시장'], ['activity', '체험']];
const source = { label: '20개 추천 흐름 검증용 가상 데이터 · 실제 장소·운영·리뷰 정보 아님', checkedAt: '2026-11-08' };

/** Stable points inside each real boundary. They do not locate actual businesses. */
function demoLocations(region: Region) {
  const points = region.geometry?.coordinates.flat(2) ?? [];
  const west = Math.min(...points.map(p => p[0])), east = Math.max(...points.map(p => p[0]));
  const south = Math.min(...points.map(p => p[1])), north = Math.max(...points.map(p => p[1]));
  let seed = Number(region.adminCode) >>> 0;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const locations: { lat: number; lng: number }[] = [];
  for (let attempts = 0; locations.length < DEMO_CANDIDATES_PER_DONG && attempts < 20_000; attempts++) {
    const point = { lat: south + next() * (north - south), lng: west + next() * (east - west) };
    if (containsPoint(region, point)) locations.push(point);
  }
  if (locations.length !== DEMO_CANDIDATES_PER_DONG) throw new Error(`Cannot place demo candidates inside ${region.id}`);
  return locations;
}

/** Add independent demo candidates; never overwrite reviewed records or their missing evidence. */
export function withDemoPlaces(base: Content): Content {
  const simulated: Place[] = base.regions.flatMap(region => {
    const bias = (Number(region.adminCode?.slice(-4, -2)) % 5) - 2;
    return demoLocations(region).map((location, index): Place => {
      const [category, label] = kinds[index % kinds.length];
      const serial = String(index + 1).padStart(2, '0');
      return {
        id: `demo-${region.adminCode}-${serial}`, regionId: region.id,
        name: `시연 ${region.name} ${label} ${serial}`, category, location,
        baseValue: (index < 19 ? 94 - index * .5 : 84 - (index - 19) * .5) + bias,
        // The twentieth place is popular: visiting it demonstrates replacement from the reserve.
        popularity: index === 19 ? 1 : index < 19 ? .2 + (index % 5) * .05 : .05,
        opening: { status: 'known', weekly: Object.fromEntries(Array.from({ length: 7 }, (_, day) => [day, [{ open: '00:00', close: '24:00' }]])),
          entryCondition: '시연에서만 상시 이용 가능으로 설정 · 실제 방문 대상이 아닙니다' },
        franchise: { status: 'non_franchise', source }, source, isVirtual: true,
      };
    });
  });
  const places = [...base.places, ...simulated];
  return { ...base, places, regions: base.regions.map(region => ({ ...region, placeIds: places.filter(place => place.regionId === region.id).map(place => place.id) })) };
}

/** All 25 dongs, including Daebu. Keep familiarity and visit records outside this preset. */
export function demoSearch(origin: SearchContext['origin'], when?: string): SearchContext {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return { origin, when: when ?? kst, interests: [], maxDistanceKm: 100 };
}

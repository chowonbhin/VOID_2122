// Real Ansan outline (KOSTAT 2013 simplified 행정동) projected to SVG coordinates.
import data from '../../data/ansan-dongs.json';
import type { Region } from '../../domain/types';

export interface Dong { code: string; name: string; ring: [number, number][] }
export const dongs = data.dongs as Dong[];
export const geoSource = data.source;
export const ISLAND_CODE = '3109272'; // 대부동 (대부도)

const LAT0 = 37.3;
const SCALE = 4000; // SVG units per degree of latitude
const COS = Math.cos((LAT0 * Math.PI) / 180);
const MIN_LNG = Math.min(...dongs.flatMap(d => d.ring.map(p => p[0])));
const MAX_LAT = Math.max(...dongs.flatMap(d => d.ring.map(p => p[1])));

export function project([lng, lat]: [number, number]): [number, number] {
  return [(lng - MIN_LNG) * COS * SCALE, (MAX_LAT - lat) * SCALE];
}

export function pathOf(ring: [number, number][]): string {
  return ring.map((point, i) => {
    const [x, y] = project(point);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('') + 'Z';
}

export type Box = [number, number, number, number];
export function boxOf(rings: [number, number][][], pad = 0): Box {
  const points = rings.flat().map(project);
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return [x, y, Math.max(...xs) + pad - x, Math.max(...ys) + pad - y];
}

/** Visual centre of a ring (vertex average is enough for these simplified convex-ish shapes). */
export function centreOf(ring: [number, number][]): [number, number] {
  const points = ring.slice(0, -1).map(project);
  return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
}

export const dongsOfRegion = (region: Region) => dongs.filter(d => region.dongCodes?.includes(d.code));

/** Two slides: 안산 도심 and 대부도, each with its own zoom. */
export const mapAreas = [
  { id: 'urban', label: '안산 도심', dongs: dongs.filter(d => d.code !== ISLAND_CODE) },
  { id: 'island', label: '대부도', dongs: dongs.filter(d => d.code === ISLAND_CODE) },
].map(area => ({ ...area, box: boxOf(area.dongs.map(d => d.ring), 40) }));
export const wholeBox = boxOf(dongs.map(d => d.ring), 30);

export const dongByCode = (code: string) => dongs.find(d => d.code === code);

function inside([x, y]: [number, number], ring: [number, number][]) {
  let hit = false;
  for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
    const [xi, yi] = ring[i];
    const [xk, yk] = ring[k];
    if ((yi > y) !== (yk > y) && x < ((xk - xi) * (y - yi)) / (yk - yi) + xi) hit = !hit;
  }
  return hit;
}
export const dongAt = (lat: number, lng: number) => dongs.find(d => inside([lng, lat], d.ring));

/** Vertex average as [lat, lng]; used for distances and the home pin. */
export function centreLatLng(dong: Dong): { lat: number; lng: number } {
  const ring = dong.ring.slice(0, -1);
  return { lng: ring.reduce((s, p) => s + p[0], 0) / ring.length, lat: ring.reduce((s, p) => s + p[1], 0) / ring.length };
}

/** Box around the given dongs, widened to at least 4:3 so tall shapes stay phone-sized. */
export function fitBox(target: Dong[], pad: number): Box {
  const [x, y, w, h] = boxOf(target.map(d => d.ring), pad);
  const width = Math.max(w, (h * 4) / 3);
  const height = Math.max(h, (width * 3) / 4);
  return [x - (width - w) / 2, y - (height - h) / 2, width, height];
}

// Current 25 administrative-dong boundaries; retain the team's urban/island slide design.
import data from '../../data/geography/admin-dongs.json';
import legacy from '../../data/ansan-dongs.json';
import { containsPoint } from './geometry';
import type { Region } from '../../domain/types';
export const dongs = data.dongs.map(dong => ({ ...dong, code: dong.adminCode }));
export const geoSource = { label: 'SGIS · vuski/admdongkor · 2026-10-01', url: 'https://github.com/vuski/admdongkor' };
export const ISLAND_CODE = '4127361000';
const points = dongs.flatMap(dong => dong.geometry.coordinates.flat(2));
const COS = Math.cos(37.3 * Math.PI / 180), SCALE = 4000;
const MIN_LNG = Math.min(...points.map(p => p[0])), MAX_LAT = Math.max(...points.map(p => p[1]));
export const project = ([lng, lat]: number[]): [number, number] => [(lng - MIN_LNG) * COS * SCALE, (MAX_LAT - lat) * SCALE];
export function pathOf(ring: number[][]) {
  return ring.map((point, i) => `${i ? 'L' : 'M'}${project(point).map(n => n.toFixed(2)).join(',')}`).join('') + 'Z';
}
export const pathOfDong = (dong: typeof dongs[number]) => dong.geometry.coordinates.map(polygon => polygon.map(pathOf).join('')).join('');
export type Box = [number, number, number, number];
function boxOf(selected: typeof dongs, pad: number): Box {
  const xy = selected.flatMap(dong => dong.geometry.coordinates.flat(2)).map(project);
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  return [x, y, Math.max(...xs) + pad - x, Math.max(...ys) + pad - y];
}
export const dongsOfRegion = (region: Region) => dongs.filter(d => d.id === region.id || d.code === region.adminCode);
export const mapAreas = [
  { id: 'urban', label: '안산 도심', dongs: dongs.filter(d => d.code !== ISLAND_CODE) },
  { id: 'island', label: '대부도', dongs: dongs.filter(d => d.code === ISLAND_CODE) },
].map(area => ({ ...area, box: boxOf(area.dongs, 25) }));
export const wholeBox = boxOf(dongs, 30);

export type Dong = typeof dongs[number];
// Preserve unambiguous old links. Split 원곡본동/원곡1동 codes need a fresh choice.
const renamed: Record<string, string> = { '고잔1동': '고잔동', '고잔2동': '중앙동', '사1동': '사동', '사2동': '사이동', '사3동': '해양동', '원곡2동': '백운동' };
export const dongByCode = (code: string) => {
  const current = dongs.find(d => d.code === code);
  if (current) return current;
  const previous = legacy.dongs.find(d => d.code === code);
  return previous ? dongs.find(d => d.name === (renamed[previous.name] ?? previous.name)) : undefined;
};
export const dongAt = (lat: number, lng: number) => dongs.find(d => containsPoint(d, { lat, lng }));
export const centreLatLng = (dong: Dong) => dong.labelPoint;
export function fitBox(target: Dong[], pad: number): Box {
  const [x, y, w, h] = boxOf(target, pad);
  const width = Math.max(w, h * 4 / 3), height = Math.max(h, width * 3 / 4);
  return [x - (width - w) / 2, y - (height - h) / 2, width, height];
}

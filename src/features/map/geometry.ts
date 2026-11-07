import type { LatLng, Region } from '../../domain/types';

export function containsPoint(region: { geometry?: { coordinates: number[][][][] } }, point: LatLng): boolean {
  const inRing = (ring: number[][]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > point.lat) !== (b[1] > point.lat) && point.lng < (b[0] - a[0]) * (point.lat - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  };
  return region.geometry?.coordinates.some(rings => inRing(rings[0]) && !rings.slice(1).some(inRing)) ?? false;
}

export function projection(regions: Region[], box = { x: 24, y: 24, width: 752, height: 452 }) {
  const points = regions.flatMap(region => region.geometry?.coordinates.flat(2) ?? []);
  const xs = points.map(p => p[0] * .795), ys = points.map(p => -p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), dx = Math.max(...xs) - x0, dy = Math.max(...ys) - y0;
  const scale = Math.min(box.width / dx, box.height / dy);
  return (point: LatLng): [number, number] => [
    box.x + (box.width - dx * scale) / 2 + (point.lng * .795 - x0) * scale,
    box.y + (box.height - dy * scale) / 2 + (-point.lat - y0) * scale,
  ];
}
export function regionPath(region: Region, project: ReturnType<typeof projection>) {
  return region.geometry?.coordinates.map(polygon => polygon.map(ring => ring.map(([lng, lat], i) => {
    const [x, y] = project({ lat, lng });
    return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z').join(' ')).join(' ') ?? '';
}

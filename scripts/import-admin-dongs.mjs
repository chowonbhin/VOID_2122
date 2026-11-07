// node scripts/import-admin-dongs.mjs /path/to/HangJeongDong_ver20261001.geojson
// Source/license: src/data/geography/README.md. Never fetch silently during a build.
import fs from 'node:fs';
import crypto from 'node:crypto';
const raw = fs.readFileSync(process.argv[2]);
const features = JSON.parse(raw).features.filter(f => ['41271', '41273'].includes(f.properties.sgg));
if (features.length !== 25) throw new Error('Expected 25 Ansan administrative dongs; review changes before import');
const insideRing = ([x, y], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};
const inside = (p, polygons) => polygons.some(rings => insideRing(p, rings[0]) && !rings.slice(1).some(r => insideRing(p, r)));
function labelPoint(polygons) {
  // Search interior points for clearance from every edge. Labels stay inside concave shapes.
  const points = polygons.flat(2), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), dx = Math.max(...xs) - minX, dy = Math.max(...ys) - minY;
  let best = points[0], clearance = -1;
  const segments = polygons.flat().flatMap(r => r.slice(1).map((p, i) => [r[i], p]));
  for (let x = 0; x < 65; x++) for (let y = 0; y < 65; y++) {
    const p = [minX + dx * (x + .5) / 65, minY + dy * (y + .5) / 65];
    if (!inside(p, polygons)) continue;
    const distance = Math.min(...segments.map(([a, b]) => {
      const vx = (b[0] - a[0]) * .795, vy = b[1] - a[1];
      const px = (p[0] - a[0]) * .795, py = p[1] - a[1];
      const t = Math.max(0, Math.min(1, (px * vx + py * vy) / (vx * vx + vy * vy || 1)));
      return Math.hypot(px - t * vx, py - t * vy);
    }));
    if (distance > clearance) { clearance = distance; best = p; }
  }
  return { lat: +best[1].toFixed(6), lng: +best[0].toFixed(6) };
}
const dongs = features.map(f => ({
  id: `dong-${f.properties.adm_cd2}`, adminCode: f.properties.adm_cd2,
  name: f.properties.adm_nm.split(' ').at(-1), district: f.properties.sgg === '41271' ? '상록구' : '단원구',
  labelPoint: labelPoint(f.geometry.coordinates), geometry: f.geometry,
}));
fs.writeFileSync('src/data/geography/admin-dongs.json', JSON.stringify({
  version: '2026-10-01', sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'), dongs,
}) + '\n');
console.log(`Imported ${dongs.length} administrative dongs`);

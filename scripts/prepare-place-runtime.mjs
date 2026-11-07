// Research records stay auditable; only candidate data used by the app is shipped.
import fs from 'node:fs';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const raw = read('../src/data/research/real-places.json');
const reviewed = read('../src/data/naver-places.json');
const regions = new Map(read('../src/data/regions.json').map(r => [r.id, r.name]));
const ids = new Set(raw.map(p => p.id));
const all = [...reviewed.filter(p => !ids.has(p.id)), ...raw];
const places = all.filter(p => !p.discovery?.excludedReason && p.franchise.status !== 'franchise');
if (places.some(p => p.isVirtual || !p.location || !p.searchSource?.url || !regions.has(p.regionId))) {
  throw new Error('Runtime candidates require actual coordinates, search provenance and a known dong');
}

// Store repeated policy values and provenance once, retaining overrides exactly.
const defaults = {};
for (const key of ['franchise', 'regionSource', 'baseValue', 'opening', 'source', 'isVirtual']) {
  if (!places.every(p => Object.hasOwn(p, key))) continue;
  const frequencies = new Map();
  for (const place of places) {
    const value = JSON.stringify(place[key]);
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  }
  const [value] = [...frequencies].sort((a, b) => b[1] - a[1])[0];
  defaults[key] = JSON.parse(value);
}
const { url: unusedUrl, ...searchSource } = places[0].searchSource;
const runtimeFields = ['id', 'regionId', 'name', 'category', 'location', 'address', 'franchise',
  'regionSource', 'searchSource', 'baseValue', 'popularityEvidence', 'opening', 'source', 'isVirtual'];
const records = places.map(place => {
  const record = Object.fromEntries(runtimeFields.filter(key => Object.hasOwn(place, key)).map(key => [key, place[key]]));
  for (const key of Object.keys(defaults)) {
    if (JSON.stringify(record[key]) === JSON.stringify(defaults[key])) delete record[key];
  }
  const expectedSearch = { ...searchSource, url: `https://map.naver.com/p/search/${encodeURIComponent(`${regions.get(place.regionId)} ${place.name}`)}` };
  if (place.searchSource.label === expectedSearch.label && place.searchSource.checkedAt === expectedSearch.checkedAt
    && place.searchSource.url === expectedSearch.url) delete record.searchSource;
  // Raw NAVER categories and other collection-only fields are not in runtimeFields.
  return record;
});
const payload = { defaults, searchSource, places: records };
fs.writeFileSync(new URL('../src/data/places.runtime.json', import.meta.url), JSON.stringify(payload, null, 2) + '\n');
console.log(`Place runtime: ${places.length} candidates; ${all.length - places.length} excluded records kept in research only`);

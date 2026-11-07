// Numeric facts only from saved public pages; never copies review text or photos.
// Usage: node scripts/extract-hamgae-ratings.mjs HTML_CACHE observations.json
import fs from 'node:fs';
import path from 'node:path';
import { extractNaverAverageRating } from './lib/real-place-import.mjs';

const [cache, file] = process.argv.slice(2);
if (!cache || !file) throw new Error('Usage: node scripts/extract-hamgae-ratings.mjs HTML_CACHE observations.json');
const observations = JSON.parse(fs.readFileSync(file, 'utf8'));
let recovered = 0;
for (const observation of observations) {
  const id = /\/place\/(\d+)/.exec(observation.sourceUrl)?.[1];
  if (!id) throw new Error('Unrecognized observation URL');
  const html = fs.readFileSync(path.join(cache, `hamgae-${id}.html`), 'utf8');
  delete observation.naverRating;
  const value = extractNaverAverageRating(html);
  if (value !== undefined) { observation.naverRating = value; recovered++; }
}
fs.writeFileSync(file, JSON.stringify(observations, null, 2) + '\n');
console.log(JSON.stringify({ observations: observations.length, naverRatings: recovered }));

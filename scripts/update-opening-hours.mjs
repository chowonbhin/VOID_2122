import fs from 'node:fs';
import { applyOpeningObservations } from './lib/opening-observations.mjs';

const path = new URL('../src/data/research/real-places.json', import.meta.url);
const observations = JSON.parse(fs.readFileSync(new URL('../src/data/research/opening-observations.json', import.meta.url), 'utf8'));
const places = JSON.parse(fs.readFileSync(path, 'utf8'));
fs.writeFileSync(path, JSON.stringify(applyOpeningObservations(places, observations), null, 2) + '\n');
await import('./prepare-place-runtime.mjs');

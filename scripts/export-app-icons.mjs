// Raster exports of the existing SVG compass; no separate artwork or palette.
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const css = await fs.readFile('src/colors.css', 'utf8');
const surface = css.match(/--color-surface:\s*(#[\da-f]+)/i)?.[1];
if (!surface) throw new Error('The paper surface token is missing.');
let svg = await fs.readFile('public/icon.svg', 'utf8');
for (const name of ['surface', 'primary', 'accent']) {
  const value = css.match(new RegExp(`--color-${name}:\\s*(#[\\da-f]+)`, 'i'))?.[1];
  if (!value) throw new Error(`Missing colour role: ${name}`);
  svg = svg.replace(new RegExp(`--color-${name}:\\s*#[\\da-f]+`, 'i'), `--color-${name}: ${value}`);
}
await fs.writeFile('public/icon.svg', svg);
const browser = await chromium.launch();
try {
  for (const [file, size, maskable] of [
    ['icon-192.png', 192, false], ['icon-512.png', 512, false],
    ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false],
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>body{margin:0;background:${maskable ? surface : 'transparent'}}svg{display:block;width:100%;height:100%}</style>${svg}`);
    await page.screenshot({ path: `public/${file}`, omitBackground: !maskable });
    await page.close();
  }
} finally { await browser.close(); }

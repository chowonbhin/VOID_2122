import { test, expect, type Page } from './baseline';
import fs from 'node:fs';
import { MEMORY_PHOTOS } from '../../src/data/memoryPhotos';
import { PLACE_PHOTOS } from '../../src/data/placePhotos';
import { base, setup, list } from './real';

const map = (page: Page) => page.getByRole('region', { name: '안산 탐험 지도' });
// Place pins only (사동 also shows two '추억 예시' hearts, which are separate markers).
const pins = (page: Page) => map(page).locator('.dong-pin.kind-place');

test('the map icon pins only that place, as the store photo; other places stay unpinned', async ({ page }) => {
  const photo = MEMORY_PHOTOS[1];
  const raw = JSON.parse(fs.readFileSync('src/data/places.runtime.json', 'utf8'));
  const places: { id: string; regionId: string; name: string }[] = Array.isArray(raw) ? raw : raw.places ?? Object.values(raw);
  const place = places.find(item => item.id === photo.placeId)!;
  await setup(page);
  await page.goto(`${base}/#/region/${place.regionId}`);
  await expect(pins(page)).toHaveCount(0);
  await list(page).getByRole('button', { name: `${place.name} 카드에서 선택`, exact: true }).click();
  const chosen = map(page).locator('.dong-pin.selected');
  await expect(chosen).toHaveCount(1);
  await expect(chosen.locator('img')).toHaveAttribute('src', photo.src);
  await expect(chosen.locator('.pin-heart')).toHaveCount(1);
  // A store without a photo keeps the round numbered pin.
  const photoNames = new Set([...MEMORY_PHOTOS, ...PLACE_PHOTOS].map(item => places.find(p => p.id === item.placeId)?.name));
  const names = await list(page).locator(':scope > li h2').allTextContents();
  const plain = names.map(name => name.replace(/^\d+\. /, '')).find(name => !photoNames.has(name))!;
  await list(page).getByRole('button', { name: `${plain} 카드에서 선택`, exact: true }).click();
  await expect(pins(page)).toHaveCount(1);
  await expect(pins(page).first().locator('img')).toHaveCount(0);
});

test('사동 store main photos appear in the chosen-place pin', async ({ page }) => {
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127152500`);
  await list(page).getByRole('button', { name: '레드지 카드에서 선택', exact: true }).click();
  await expect(map(page).locator('.dong-pin.selected img')).toHaveAttribute('src', '/places/redji.jpg');
});

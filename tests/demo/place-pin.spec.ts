import { test, expect, type Page } from './baseline';
import fs from 'node:fs';
import { MEMORY_PHOTOS } from '../../src/data/memoryPhotos';
import { base, setup, list } from './real';

const map = (page: Page) => page.getByRole('region', { name: '안산 탐험 지도' });
// Place pins only (사동 also shows two '추억 예시' hearts, which are separate markers).
const pins = (page: Page) => map(page).locator('.dong-pin.kind-place');

test('a place is pinned only after its photo is chosen, and the pin shows the store image', async ({ page }) => {
  const photo = MEMORY_PHOTOS[1];
  const raw = JSON.parse(fs.readFileSync('src/data/places.runtime.json', 'utf8'));
  const places: { id: string; regionId: string; name: string }[] = Array.isArray(raw) ? raw : raw.places ?? Object.values(raw);
  const place = places.find(item => item.id === photo.placeId)!;
  await setup(page);
  await page.goto(`${base}/#/region/${place.regionId}`);
  await page.getByRole('button', { name: '전체 후보' }).click();
  await expect(pins(page)).toHaveCount(0);
  await list(page).getByRole('button', { name: `${place.name} 카드에서 선택`, exact: true }).click();
  // In 사동 this store is a '추억 예시': once chosen, its marker shows the store photo with a small heart badge.
  const chosen = map(page).locator('.dong-pin.selected');
  await expect(chosen).toHaveCount(1);
  await expect(chosen.locator('img')).toHaveAttribute('src', photo.src);
  await expect(chosen.locator('.pin-heart')).toHaveCount(1);
  // The card's photo slot carries the same small heart.
  await expect(list(page).getByRole('button', { name: `${place.name} 카드에서 선택`, exact: true }).locator('.photo-heart')).toHaveCount(1);
  // Choosing a place without a photo moves the single pin there as a numbered pin.
  const other = list(page).locator(':scope > li').filter({ has: page.locator('.place-photo.empty') }).first();
  await other.locator('.place-photo').click();
  await expect(pins(page)).toHaveCount(1);
  await expect(pins(page).first().locator('img')).toHaveCount(0);
});

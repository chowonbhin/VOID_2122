import { test, expect, type Page } from './baseline';
import fs from 'node:fs';
import { MEMORY_PHOTOS } from '../../src/data/memoryPhotos';
import { PLACE_PHOTOS } from '../../src/data/placePhotos';
import { base, setup, list } from './real';
import { changeState } from './setupSteps';

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
  await list(page).getByRole('button', { name: `${place.name} 지도에서 위치 보기`, exact: true }).click();
  const chosen = map(page).locator('.dong-pin.selected');
  await expect(chosen).toHaveCount(1);
  await expect(chosen.locator('img')).toHaveAttribute('src', photo.src);
  await expect(chosen.locator('.pin-heart')).toHaveCount(1);
  // A store without a photo keeps the round numbered pin.
  const photoNames = new Set([...MEMORY_PHOTOS, ...PLACE_PHOTOS].map(item => places.find(p => p.id === item.placeId)?.name));
  const names = await list(page).locator(':scope > li h2').allTextContents();
  const plain = names.map(name => name.replace(/^\d+\. /, '')).find(name => !photoNames.has(name))!;
  await list(page).getByRole('button', { name: `${plain} 지도에서 위치 보기`, exact: true }).click();
  await expect(pins(page)).toHaveCount(1);
  await expect(pins(page).first().locator('img')).toHaveCount(0);
});

test('사동 store main photos appear in the chosen-place pin', async ({ page }) => {
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127152500`);
  fs.mkdirSync('.claude/state/evidence/photo-pin-integration', { recursive: true });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await list(page).getByRole('button', { name: '레드지 지도에서 위치 보기', exact: true }).click();
    const chosen = map(page).getByRole('link', { name: '레드지 네이버지도에서 보기 (새 탭)', exact: true });
    await expect(chosen.locator('img')).toHaveAttribute('src', '/places/redji.jpg');
    await expect(chosen).toBeInViewport({ ratio: 1 });
    await expect(chosen).toBeFocused();
    await expect(chosen).toHaveAttribute('target', '_blank');
    await expect(pins(page)).toHaveCount(1);
    const picture = await chosen.boundingBox();
    const frame = await map(page).boundingBox();
    expect(picture!.x).toBeGreaterThanOrEqual(frame!.x);
    expect(picture!.y).toBeGreaterThanOrEqual(frame!.y);
    expect(picture!.x + picture!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
    expect(picture!.y + picture!.height).toBeLessThanOrEqual(frame!.y + frame!.height);
    const others = await map(page).locator('.dong-pin:not(.selected)').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    for (const other of others) {
      // Circle hit areas and their heart badges remain separately tappable.
      expect(Math.hypot(other.x + other.width / 2 - picture!.x - picture!.width / 2,
        other.y + other.height / 2 - picture!.y - picture!.height / 2))
        .toBeGreaterThanOrEqual((other.width + picture!.width) / 2);
    }
    await chosen.locator('img').evaluate((img: HTMLImageElement) => img.decode());
    const image = await chosen.locator('img').boundingBox();
    expect(image!.width).toBeCloseTo(picture!.width - 6, 0);
    expect(image!.height).toBeCloseTo(image!.width, 0);
    await page.screenshot({ path: `.claude/state/evidence/photo-pin-integration/selected-${width}.png` });
  }
});

test('mobile photo pins and home stay inside the map by zooming the whole map out', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  await changeState(page, { profile: { homeDongCode: '4127152500' } });
  await page.goto(`${base}/#/region/dong-4127152500`);
  const drawing = map(page).locator('.dong-map-svg');
  const initialWidth = await drawing.evaluate(node => (node as SVGSVGElement).viewBox.baseVal.width);
  const initialHeight = await map(page).evaluate(node => node.getBoundingClientRect().height);
  await list(page).getByRole('button', { name: '도니스커피 지도에서 위치 보기', exact: true }).click();
  await expect(map(page).locator('.dong-pin.selected img')).toBeVisible();
  for (const width of [320, 390, 768, 1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => map(page).evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll('.dong-pin, .pin-heart')].every(pin => {
        const rect = pin.getBoundingClientRect();
        return rect.left >= bounds.left + 4 && rect.right <= bounds.right - 4
          && rect.top >= bounds.top + 4 && rect.bottom <= bounds.bottom - 4;
      });
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(await drawing.evaluate(node => (node as SVGSVGElement).viewBox.baseVal.width)).toBeGreaterThan(initialWidth);
  expect(await map(page).evaluate(node => node.getBoundingClientRect().height)).toBeCloseTo(initialHeight, 0);
  const home = map(page).getByRole('img', { name: '내 동네 · 사동', exact: true });
  await expect(home).toBeVisible();
  const size = await home.boundingBox();
  expect(size!.width).toBe(size!.height);
  for (const name of ['초지참숯불갈비', '레드지', '레몬도커피']) {
    await list(page).getByRole('button', { name: `${name} 지도에서 위치 보기`, exact: true }).click();
    await expect.poll(() => map(page).evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const rects = [...element.querySelectorAll('.dong-pin')].map(pin => pin.getBoundingClientRect());
      return rects.every((rect, index) => rect.left >= bounds.left + 4 && rect.right <= bounds.right - 4
        && rect.top >= bounds.top + 4 && rect.bottom <= bounds.bottom - 4
        && rects.every((other, j) => index === j || rect.right <= other.left || other.right <= rect.left
          || rect.bottom <= other.top || other.bottom <= rect.top));
    })).toBe(true);
  }
});

import { test, expect, type Locator } from '@playwright/test';
import { setup } from './real';

async function whiteAction(button: Locator) {
  const colors = await button.evaluate(element => {
    const style = getComputedStyle(element);
    const rgb = style.backgroundColor.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const linear = rgb.map(n => n / 255 <= .04045 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4);
    return { text: style.color, contrast: 1.05 / (linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 + .05) };
  });
  expect(colors.text).toBe('rgb(255, 255, 255)');
  expect(colors.contrast).toBeGreaterThanOrEqual(4.5);
}

test('desktop header aligns to the main content and search uses a clear solid outline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  const frame = (await map.boundingBox())!;
  const brand = (await page.getByRole('link', { name: '안산에 스며들다' }).boundingBox())!;
  const menu = page.getByRole('button', { name: '메뉴', exact: true });
  const menuBox = (await menu.boundingBox())!;
  expect(Math.abs(brand.x - frame.x)).toBeLessThan(1);
  expect(Math.abs(menuBox.x + menuBox.width - frame.x - frame.width)).toBeLessThan(1);
  await whiteAction(menu);
  await whiteAction(page.getByRole('button', { name: '지역 찾기', exact: true }));
  const search = page.getByRole('searchbox', { name: '지역 검색', exact: true });
  await search.fill('월피동');
  await search.press('Enter');
  await expect(page.locator('.map-search-outline')).toBeVisible();
  await expect(page.locator('.map-search-outline')).toHaveCSS('stroke-dasharray', 'none');
  await expect(page.locator('.search-selected .ansan-region-fill')).toHaveCSS('stroke-dasharray', 'none');
  await search.fill('');
  await expect(page.locator('.map-search-highlight')).toHaveCount(0);
});

test('selecting a dong zooms in and the back button above its name fades back to the main map', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: /^지도 월피동/ }).click();
  await expect(page.locator('.ansan-map-stage')).toHaveAttribute('aria-busy', 'true');
  const heading = page.getByRole('heading', { level: 1, name: '월피동', exact: true });
  await expect(heading).toBeVisible();
  const back = page.getByRole('button', { name: '전체 지도로 돌아가기', exact: true });
  expect((await back.boundingBox())!.y).toBeLessThan((await heading.boundingBox())!.y);
  await whiteAction(back);
  await whiteAction(page.locator('.region-visit-trigger').first());
  await back.click();
  await expect(page.locator('.region-detail')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('추천 행정동');
  await expect(page.locator('.ansan-map-stage')).toHaveAttribute('aria-busy', 'false');
});

test('mobile keyboard and reduced-motion navigation preserve back and forward history', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.getByRole('button', { name: /^지도 본오1동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
  await page.getByRole('button', { name: '전체 지도로 돌아가기', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('추천 행정동');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('추천 행정동');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('another navigation during zoom cancels the old destination', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: /^지도 월피동/ }).click();
  await page.getByRole('link', { name: '안산에 스며들다' }).click();
  await page.waitForTimeout(400);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('추천 행정동');
  await expect(page.locator('.ansan-map-stage')).toHaveAttribute('aria-busy', 'false');
  await page.locator('.map-rank-pin').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '전체 지도로 돌아가기', exact: true })).toBeVisible();
});

import { test, expect } from '@playwright/test';
import { setup } from './real';
import { changeState } from './setupSteps';

test('search finds partial dong/district names and selects a dong without leaving the map', async ({ page }) => {
  await setup(page);
  const input = page.getByRole('searchbox', { name: '지역 검색', exact: true });
  await input.fill('상록구');
  const results = page.getByRole('list', { name: '지역 검색 결과' });
  expect(await results.getByRole('button').count()).toBeGreaterThan(1);
  await input.fill('본오');
  await expect(results.getByRole('button')).toHaveCount(3);
  await results.getByRole('button', { name: '본오1동 상록구' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('추천 행정동');
  const region = page.getByRole('button', { name: /^지도 본오1동/ });
  await expect(region).toBeFocused();
  await expect(region).toHaveClass(/search-selected/);
  await expect(page.locator('.map-hover')).toContainText('본오1동');
  await expect(page.locator('.map-hover')).not.toContainText('순위');
  await expect(results).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
});

test('mobile search switches island/urban maps, supports Enter and handles no matches', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  await page.getByRole('button', { name: '다음 지도', exact: true }).click();
  await expect(page.getByRole('button', { name: /^지도 대부동/ })).toBeVisible();
  await page.getByRole('button', { name: '이전 지도', exact: true }).click();
  await expect(page.getByRole('button', { name: /^지도 중앙동/ })).toBeVisible();
  const input = page.getByRole('searchbox', { name: '지역 검색', exact: true });
  await input.fill('대부도');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: '다음 지도', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^지도 대부동/ })).toBeFocused();
  await expect(page.locator('.map-hover')).toContainText('대부동');
  await input.fill('없는동네');
  await expect(page.getByRole('status')).toHaveText('일치하는 동네가 없어요.');
  await input.press('Escape');
  await expect(page.getByRole('status')).toHaveCount(0);
  await input.fill('본오2동');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: '이전 지도', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^지도 본오2동/ })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('only the top three recommendations have readable, separated pins; empty results have none', async ({ page }) => {
  await setup(page);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  const pins = map.locator('.map-rank-pin');
  await expect(pins).toHaveCount(3);
  await expect(pins.locator('text')).toHaveText(['1', '2', '3']);
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => {
      const boxes = await pins.evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
      }));
      return boxes.every((a, i) => a.w >= 43 && a.h >= 43 && boxes.every((b, j) =>
        i === j || a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y));
    }).toBe(true);
  }
  const label = await pins.first().getAttribute('aria-label');
  const dong = label!.match(/^추천 1위 (.+) 동네로 들어가기$/)![1];
  await pins.first().focus();
  await expect(page.locator('.map-hover')).toContainText(dong);
  await expect(page.locator('.map-hover')).not.toContainText('순위');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(dong);
  await page.getByRole('link', { name: '안산에 스며들다' }).click();
  await changeState(page, { search: { origin: { label: '먼 출발지', lat: 0, lng: 0 }, maxDistanceKm: .001 } });
  await expect(pins).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: '지역 검색' })).toBeVisible();
});

test('editing or clearing a selected search removes its marking and caption', async ({ page }) => {
  await setup(page);
  const input = page.getByRole('searchbox', { name: '지역 검색', exact: true });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const replacement of ['', '대부', '   ']) {
      await input.fill('본오1동');
      await input.press('Enter');
      await expect(page.locator('.search-selected')).toHaveCount(1);
      await input.fill(replacement);
      await expect(page.locator('.search-selected')).toHaveCount(0);
      await expect(page.locator('.map-hover')).toBeEmpty();
      await expect(page.locator('.map-rank-pin')).toHaveCount(3);
    }
  }
});

test('dong and pin captions clear when the pointer leaves or keyboard focus moves away', async ({ page }) => {
  await setup(page);
  const caption = page.locator('.map-hover');
  const pin = page.locator('.map-rank-pin').first();
  const region = page.getByRole('button', { name: /^지도 본오1동/ });
  const input = page.getByRole('searchbox', { name: '지역 검색', exact: true });
  for (const target of [region, pin]) {
    await target.hover();
    await expect(caption).not.toBeEmpty();
    await input.hover();
    await expect(caption).toBeEmpty();
    await target.focus();
    await expect(caption).not.toBeEmpty();
    await input.focus();
    await expect(caption).toBeEmpty();
  }
});

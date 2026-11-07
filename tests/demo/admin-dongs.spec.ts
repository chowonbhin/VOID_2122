import { test, expect } from './baseline';
import regions from '../../src/data/regions.json' with { type: 'json' };
import { base, setup, list } from './real';
import { changeState, DEFAULT_ORIGIN, openWithSearch, writeSearch } from './setupSteps';

test('every one of 25 administrative dongs displays 20 unique actual search venues, without synthetic examples', async ({ page }) => {
  await setup(page);
  await expect(page.locator('[data-region-id]')).toHaveCount(25);
  for (const region of regions) {
    await page.goto(`${base}/#/region/${region.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(region.name);
    const cards = list(page).locator(':scope > li');
    await expect(cards).toHaveCount(20);
    await expect(page.getByText(/지역 점수 반영 20\/20개/)).toBeVisible();
    await expect(list(page).getByText(/상위 20개 · 지역 점수에 포함/)).toHaveCount(20);
    expect(new Set(await cards.locator('h2').allTextContents()).size).toBe(20);
    await expect(list(page).getByRole('link', { name: '네이버에서 장소 보기', exact: true })).toHaveCount(20);
    await expect(list(page)).not.toContainText('시연용 가상');
    await expect(list(page)).not.toContainText('시연 산책');
    await expect(page.getByRole('heading', { name: '이 동네의 추억 0' })).toBeVisible();
  }
});

test('urban/island slides, keyboard selection and legacy dong links remain available', async ({ page }) => {
  await setup(page);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('button', { name: /^지도 대부동/ })).toHaveCount(0);
  await map.getByRole('button', { name: '대부도 →', exact: true }).click();
  await expect(map.getByRole('button', { name: /^지도 대부동/ })).toBeVisible();
  await map.getByRole('button', { name: /^지도 대부동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await page.goto(`${base}/#/dong/3109273`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('호수동');
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
});

test('home island and records survive reload, and no seeded memories appear', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openWithSearch(page, base, { origin: DEFAULT_ORIGIN, maxDistanceKm: 10 });
  await changeState(page, { profile: { homeDongCode: '4127361000' } });
  await page.reload();
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('img', { name: '내 동네 · 대부동' })).toBeVisible();
  await map.getByRole('button', { name: /^지도 대부동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '이 동네의 추억 0' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
});

test('legacy synthetic visits remain stored but never revive phantom venues or scores', async ({ page }) => {
  await page.goto(base);
  await page.evaluate(() => localStorage.setItem('ansan-explore/v1', JSON.stringify({
    profile: { initialLevels: { 'region-a': 2 }, interests: [], experiencedEventIds: ['legacy-event'] },
    visits: [{ id: 'legacy', placeId: 'a1', date: '2026-11-07', method: 'self_report' }], search: null,
  })));
  await writeSearch(page, { origin: DEFAULT_ORIGIN, maxDistanceKm: 10 });
  await page.goto(`${base}/#/recommend`);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('방문 기록은 유지');
  await page.goto(`${base}/#/region/region-a`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('중앙동');
  await expect(list(page)).not.toContainText('시연 산책 공간');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.visits[0].id).toBe('legacy');
  // Nothing re-saves the profile now, so the archived A·B level is still either migrated or raw.
  expect(stored.legacyInitialLevels?.['region-a'] ?? stored.profile.initialLevels['region-a']).toBe(2);
});

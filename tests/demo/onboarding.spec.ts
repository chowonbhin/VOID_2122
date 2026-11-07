import { test, expect, type Page } from '@playwright/test';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const stored = (page: Page, key: string) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test.beforeEach(async ({ page }) => {
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.goto(base);
});

test('a resident under 6 months skips Q2/Q3 and lands on the main map as 초심자', async ({ page }) => {
  await page.getByRole('radio', { name: /6개월이 안 됐어요/ }).click();
  await page.getByRole('button', { name: '탐험 시작' }).click();
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
  const state = await stored(page, 'ansan-explore/v1');
  expect(state.profile.onboarding).toMatchObject({ residence: 'under_6m', visitedDongCodes: [], visitedPlaceIds: [] });
  expect(state.visits).toEqual([]);
  // Reopening the app goes straight to the main map.
  await page.goto(base);
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /6개월이 안 됐어요/ })).toHaveCount(0);
});

test('long-term resident answers card-news Q2/Q3; answers set initial Lv and queue the backend payload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('radio', { name: /2년 이상/ }).click();
  await page.getByLabel(/지금 사는 동네/).selectOption({ label: '원곡동' });
  await page.getByRole('button', { name: '다음', exact: true }).click();

  const dongs = page.getByRole('group', { name: '가본 동네 카드' });
  await expect(dongs.getByRole('heading', { name: '원곡동 · 내 동네' })).toBeVisible();
  await dongs.getByRole('button', { name: /여기 가봤어요/ }).first().click();
  await expect(dongs.getByText('1 / 25 · 체크 1')).toBeVisible();
  // Tapping the card body turns the page without toggling it.
  await dongs.locator('article').first().click({ position: { x: 20, y: 20 } });
  await expect(dongs.getByText('2 / 25 · 체크 1')).toBeVisible();
  await page.getByRole('button', { name: '다음 질문' }).click();

  const places = page.getByRole('group', { name: '가본 장소 카드' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('지금 동네에서 가본 곳이 있나요?');
  for (let i = 0; i < 3; i++) {
    await places.locator('article').nth(i).getByRole('button', { name: /여기 가봤어요/ }).click();
    if (i < 2) await places.getByRole('button', { name: '다음 카드' }).click();
  }
  await page.getByRole('button', { name: '완료하고 지도 보기' }).click();
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();

  const state = await stored(page, 'ansan-explore/v1');
  expect(state.profile.homeDongCode).toBe('4127354500');
  expect(state.profile.initialLevels['dong-4127354500']).toBe(2);
  expect(state.profile.onboarding.visitedPlaceIds).toHaveLength(3);
  expect(state.visits).toEqual([]);
  const outbox = await stored(page, 'ansan-explore/outbox');
  expect(outbox[0]).toMatchObject({ type: 'onboarding', payload: { version: 1, beginner: false, initialLevels: { 'dong-4127354500': 2 } } });
  await expect(page.getByRole('img', { name: '내 동네 · 원곡동' })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

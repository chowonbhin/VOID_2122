import { test, expect, type Page } from '@playwright/test';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const stored = (page: Page, key: string) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test.beforeEach(async ({ page }) => {
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.goto(base);
});

test('a resident under 6 months skips Q2/Q3 and lands on the main map as 초심자', async ({ page }) => {
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await page.getByRole('radio', { name: /6개월이 안 됐어요/ }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('어떤 활동을 좋아하나요?');
  await expect(page.getByRole('list', { name: '온보딩 단계' }).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('checkbox', { name: '자연·산책' }).check();
  await page.getByRole('button', { name: '탐험 시작' }).click();
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
  // No setup page and no bottom tab bar.
  await expect(page.getByRole('navigation', { name: '주요 화면' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '내 동네 설정' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '나의 동네 수첩' })).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
  const state = await stored(page, 'ansan-explore/v1');
  expect(state.profile.onboarding).toMatchObject({ residence: 'under_6m', visitedDongCodes: [], visitedPlaceIds: [] });
  expect(state.search).toMatchObject({ interests: ['nature'], maxDistanceKm: 10 });
  expect(state.search.when).toMatch(/T14:00$/);
  expect(state.visits).toEqual([]);
  // Reopening the app goes straight to the main map.
  await page.goto(base);
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /6개월이 안 됐어요/ })).toHaveCount(0);
});

test('long-term resident answers card-news Q2/Q3; answers set initial Lv and queue the backend payload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('radio', { name: /2년 이상/ }).click();
  await page.getByLabel(/지금 사는 동네/).selectOption({ label: '본오1동' });
  await page.getByRole('button', { name: '다음', exact: true }).click();

  const dongs = page.getByRole('group', { name: '가본 동네 카드' });
  await expect(dongs.getByRole('heading', { name: '본오1동 · 내 동네' })).toBeVisible();
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
  await page.getByRole('button', { name: '다음 질문' }).click();
  await expect(page.getByRole('group', { name: '관심 활동' })).toBeVisible();
  await page.getByRole('button', { name: '탐험 시작' }).click();
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();

  const state = await stored(page, 'ansan-explore/v1');
  expect(state.profile.homeDongCode).toBe('4127154000');
  expect(state.profile.initialLevels['dong-4127154000']).toBe(2);
  expect(state.profile.onboarding.visitedPlaceIds).toHaveLength(3);
  // The trip starts from 내 동네 (본오1동), with no interests chosen = all activities.
  expect(state.search.interests).toEqual([]);
  expect(state.search.origin.lat).not.toBe(37.3160302);
  expect(state.visits).toEqual([]);
  const outbox = await stored(page, 'ansan-explore/outbox');
  expect(outbox[0]).toMatchObject({ type: 'onboarding', payload: { version: 1, beginner: false, initialLevels: { 'dong-4127154000': 2 } } });
  await expect(page.getByRole('img', { name: '내 동네 · 본오1동' })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('다시 설정하기 reruns onboarding, replaces familiarity and interests, and keeps visits', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('ansan-explore/v1', JSON.stringify({
    profile: { initialLevels: { 'dong-4127154000': 2 }, interests: ['food'], experiencedEventIds: [] },
    visits: [{ id: 'kept', placeId: 'a1', date: '2026-11-07', method: 'self_report' }],
    search: { origin: { label: '예전 출발지', lat: 37.3219, lng: 126.8309 }, when: '2026-11-01T09:00', interests: ['food'], maxDistanceKm: 3 },
  })));
  await page.goto(`${base}/#/recommend`);
  await page.reload();
  await page.getByRole('button', { name: '다시 설정하기' }).click();
  await expect(page.getByRole('radio', { name: /6개월이 안 됐어요/ })).toBeVisible();
  await page.getByRole('radio', { name: /6개월이 안 됐어요/ }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '음식' })).toBeChecked();
  await page.getByRole('checkbox', { name: '음식' }).uncheck();
  await page.getByRole('button', { name: '탐험 시작' }).click();
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
  const state = await stored(page, 'ansan-explore/v1');
  expect(state.visits.map((visit: { id: string }) => visit.id)).toEqual(['kept']);
  expect(state.profile.initialLevels['dong-4127154000'] ?? 0).toBe(0);
  expect(state.search).toMatchObject({ interests: [], maxDistanceKm: 10 });
  expect(state.search.when).toMatch(/T14:00$/);
});

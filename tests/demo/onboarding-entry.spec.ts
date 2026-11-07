import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const key = 'ansan-explore/v1';

for (const route of ['', '#/recommend', '#/region/dong-4127154000', '#/dong/4127154000', '#/notebook', '#/setup']) {
  test(`first visit ${route || '/'} shows only onboarding after the splash`, async ({ page }) => {
    await page.goto(`${base}/${route}`);
    await expect(page.getByRole('status', { name: '안산에 스며들다를 여는 중' })).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('안산에 산 지 얼마나 됐나요?');
    await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toHaveCount(0);
    await expect(page.locator('.notebook')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '데이터 안내', exact: true })).toHaveCount(0);
  });
}

for (const partial of [false, true]) {
  test(`legacy records without completed onboarding are preserved (partial=${partial})`, async ({ page }) => {
    const previous = {
      profile: { initialLevels: {}, interests: ['food'], experiencedEventIds: [],
        ...(partial ? { onboarding: { residence: 'under_6m', visitedDongCodes: [], visitedPlaceIds: [], completedAt: '' } } : {}) },
      visits: [{ id: 'kept', placeId: 'a1', date: '2026-11-07', method: 'self_report' }],
      search: { origin: { label: '이전 출발지', lat: 37.3219, lng: 126.8309 }, when: '2026-11-08T14:00', interests: ['food'], maxDistanceKm: 10 },
    };
    await page.addInitScript(({ key, previous }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(previous));
    }, { key, previous });
    await page.goto(base);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('안산에 산 지 얼마나 됐나요?');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).toEqual(previous);
    // A navigation link must not bypass unfinished onboarding.
    await page.goto(`${base}/#/notebook`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('안산에 산 지 얼마나 됐나요?');
    await page.getByRole('radio', { name: /6개월이 안 됐어요/ }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: '음식', exact: true })).toBeChecked();
    await page.getByRole('button', { name: '탐험 시작' }).click();
    await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
    expect(saved.visits).toEqual(previous.visits);
    expect(saved.profile.onboarding.completedAt).toBeTruthy();
    // Completion persists and permits both the landing and deep links.
    await page.goto(base);
    await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
    await page.goto(`${base}/#/region/dong-4127154000`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
  });
}

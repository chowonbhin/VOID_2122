import { expect, type Page } from '@playwright/test';
import { DEFAULT_ORIGIN, openSetup, submitSetup } from './setupSteps';
export const base = process.env.BASE_URL ?? 'http://127.0.0.1:3002';
export async function setup(page: Page, when = '2026-11-08T14:00', distance = '100') {
  // 날짜·최대 거리 are not setup inputs any more; seed them as saved conditions.
  await openSetup(page, base, { origin: DEFAULT_ORIGIN, when, maxDistanceKm: Number(distance) });
  await submitSetup(page);
  await expect(page.getByRole('heading', { name: '추천 행정동', exact: true })).toBeVisible();
}
export const list = (page: Page) => page.getByRole('list', { name: '행정동 장소 추천' });
export const mapScore = (page: Page) => page.locator('[data-region-id="dong-4127154000"]');
export async function openBono(page: Page) {
  await page.goto(`${base}/#/region/dong-4127154000`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
}

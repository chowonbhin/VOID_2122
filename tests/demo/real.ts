import { expect, type Page } from '@playwright/test';
export const base = process.env.BASE_URL ?? 'http://127.0.0.1:3002';
export async function setup(page: Page, when = '2026-11-08T14:00', distance = '100') {
  await page.goto(`${base}/#/setup`);
  await page.getByLabel('날짜·시각 (한국 시간)').fill(when);
  await page.getByLabel('최대 거리 (km)').fill(distance);
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('heading', { name: '추천 행정동', exact: true })).toBeVisible();
}
export const list = (page: Page) => page.getByRole('list', { name: '행정동 장소 추천' });
export const mapScore = (page: Page) => page.locator('[data-region-id="dong-4127154000"]');
export async function openBono(page: Page) {
  await page.goto(`${base}/#/region/dong-4127154000`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
}

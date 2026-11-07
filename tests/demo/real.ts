import { expect, type Page } from '@playwright/test';
import { DEFAULT_ORIGIN, writeState } from './setupSteps';
export const base = process.env.BASE_URL ?? 'http://127.0.0.1:3002';
export async function setup(page: Page, when = '2026-11-08T14:00', distance = '100') {
  // There is no setup page; seed what onboarding writes (내 동네 중앙동 → start at 중앙역).
  await page.goto(base);
  await writeState(page, { search: { origin: DEFAULT_ORIGIN, when, interests: [], maxDistanceKm: Number(distance) }, profile: { homeDongCode: '4127353200' } });
  await page.goto(`${base}/#/recommend`);
  await page.reload();
  await expect(page.getByRole('heading', { name: '추천 행정동', exact: true })).toBeVisible();
}
export const list = (page: Page) => page.getByRole('list', { name: '행정동 장소 추천' });
export const mapScore = (page: Page) => page.locator('[data-region-id="dong-4127154000"]');
export async function openBono(page: Page) {
  await page.goto(`${base}/#/region/dong-4127154000`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오1동');
}
export async function closeVisit(page: Page) {
  const close = page.getByRole('button', { name: '방문 날짜 설정 닫기', exact: true });
  if (await close.isVisible()) await close.click();
}
export async function openVisit(page: Page, name: string) {
  if (!await page.getByRole('dialog', { name: `${name} 방문 날짜 설정`, exact: true }).isVisible()) {
    await closeVisit(page);
    const trigger = page.getByRole('button', { name: `${name} 방문 날짜 설정`, exact: true });
    if (!await trigger.isVisible()) {
      await page.getByRole('region', { name: '이 동네의 추억' }).getByRole('button')
        .filter({ has: page.getByText(name, { exact: true }) }).click();
    }
    await trigger.click();
  }
  return page.getByRole('region', { name: `${name} 방문 기록`, exact: true });
}

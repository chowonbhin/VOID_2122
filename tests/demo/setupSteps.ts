// The setup page shows one condition per step; tests jump with the step bar.
import type { Page } from '@playwright/test';

export type SetupStep = '내 동네' | '지역별 익숙함' | '관심 활동' | '출발지' | '외출 조건';

export async function setupStep(page: Page, name: SetupStep) {
  await page.getByRole('navigation', { name: '탐험 조건 단계' }).getByRole('button', { name, exact: true }).click();
}

export async function submitSetup(page: Page) {
  await setupStep(page, '외출 조건');
  await page.getByRole('button', { name: '추천 받기' }).click();
}

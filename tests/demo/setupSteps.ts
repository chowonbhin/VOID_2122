// The setup page shows one condition per step; tests jump with the step bar.
// 출발지·날짜·최대 거리 are no longer inputs, so tests seed them into storage.
import type { Page } from '@playwright/test';
import type { SearchContext } from '../../src/domain/types';

export type SetupStep = '내 동네' | '지역별 익숙함' | '관심 활동';

/** The app's first-run origin (regions.json first start point). */
export const DEFAULT_ORIGIN = { label: '중앙역 (역 위치 기준)', lat: 37.3160302, lng: 126.8385294 };

export const DEMO_SEARCH: SearchContext = {
  origin: { label: '시연 출발지', lat: 37.3219, lng: 126.8309 },
  when: '2026-11-08T14:00', interests: [], maxDistanceKm: 10,
};

export async function setupStep(page: Page, name: SetupStep) {
  await page.getByRole('navigation', { name: '탐험 조건 단계' }).getByRole('button', { name, exact: true }).click();
}

export async function submitSetup(page: Page) {
  await setupStep(page, '관심 활동');
  await page.getByRole('button', { name: '추천 받기' }).click();
}

/** Merge into the saved search. The page must already be on the app origin. */
export async function writeSearch(page: Page, search: Partial<SearchContext>) {
  await page.evaluate(({ search, fallback }) => {
    const key = 'ansan-explore/v1';
    const state = JSON.parse(localStorage.getItem(key) ?? 'null') ??
      { profile: { initialLevels: {}, interests: [], experiencedEventIds: [] }, visits: [], search: null };
    state.search = { ...fallback, ...state.search, ...search };
    localStorage.setItem(key, JSON.stringify(state));
  }, { search, fallback: DEMO_SEARCH });
}

/** Open the setup page with a saved search (defaults to DEMO_SEARCH). */
export async function openSetup(page: Page, base: string, search: Partial<SearchContext> = {}) {
  await page.goto(base);
  await writeSearch(page, { ...DEMO_SEARCH, ...search });
  await page.goto(`${base}/#/setup`);
  await page.reload();
}

/** Change saved search conditions and reload the current screen. */
export async function changeSearch(page: Page, search: Partial<SearchContext>) {
  await writeSearch(page, search);
  await page.reload();
}

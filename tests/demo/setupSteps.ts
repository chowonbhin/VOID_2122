// There is no setup page any more: onboarding saves the search. Tests that skip onboarding
// seed the saved state directly and open the main screen.
import type { Page } from '@playwright/test';
import type { Profile, SearchContext } from '../../src/domain/types';

/** The app's default origin (regions.json first start point). */
export const DEFAULT_ORIGIN = { label: '중앙역 (역 위치 기준)', lat: 37.3160302, lng: 126.8385294 };

export const DEMO_SEARCH: SearchContext = {
  origin: { label: '시연 출발지', lat: 37.3219, lng: 126.8309 },
  when: '2026-11-08T14:00', interests: [], maxDistanceKm: 10,
};

/** Merge into the saved search and profile. The page must already be on the app origin. */
export async function writeState(page: Page, patch: { search?: Partial<SearchContext>; profile?: Partial<Profile> }) {
  await page.evaluate(({ patch, fallback }) => {
    const key = 'ansan-explore/v1';
    const state = JSON.parse(localStorage.getItem(key) ?? 'null') ??
      { profile: { initialLevels: {}, interests: [], experiencedEventIds: [] }, visits: [], search: null };
    if (patch.search) state.search = { ...fallback, ...state.search, ...patch.search };
    if (patch.profile) state.profile = { ...state.profile, ...patch.profile };
    // These fixtures intentionally bypass onboarding to test later screens.
    state.profile.onboarding ??= { residence: 'under_6m', visitedDongCodes: [], visitedPlaceIds: [], completedAt: '2026-11-08T00:00:00+09:00' };
    localStorage.setItem(key, JSON.stringify(state));
  }, { patch, fallback: DEMO_SEARCH });
}

export const writeSearch = (page: Page, search: Partial<SearchContext>) => writeState(page, { search });

/** Open the main screen with a saved search (defaults to DEMO_SEARCH). */
export async function openWithSearch(page: Page, base: string, search: Partial<SearchContext> = {}) {
  await page.goto(base);
  await writeSearch(page, { ...DEMO_SEARCH, ...search });
  await page.goto(`${base}/#/recommend`);
  await page.reload();
}

/** Change saved conditions and reload the current screen. */
export async function changeState(page: Page, patch: Parameters<typeof writeState>[1]) {
  await writeState(page, patch);
  await page.reload();
}

import { test, expect, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { UserState } from '../../src/storage';

// Isolated coverage for zT4ek's visit feature while the other demo screens are pending.
// The happy path uses the actual VisitPanel and shared persistence, without mocked results.
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const KEY = 'ansan-explore/v1';
const PLACE = '시연 산책 공간';
const EVIDENCE_DIR = process.env.VISIT_EVIDENCE_DIR ?? path.join(
  '.claude', 'state', 'evidence', `visits-${new Date().toISOString().replace(/[:.]/g, '-')}`,
);

const initialState = (): UserState => ({
  profile: {
    initialLevels: { 'dong-4127354500': 2 },
    interests: ['nature', 'culture'],
    experiencedEventIds: ['e-b3-workshop'],
  },
  visits: [],
  search: {
    origin: { lat: 37.3219, lng: 126.8309, label: '테스트 출발지' },
    when: '2026-11-08T14:00',
    interests: ['nature', 'culture'],
    maxDistanceKm: 9,
  },
});

async function openRegion(page: Page, state = initialState()): Promise<Locator> {
  // Seed only profile/search, which belong to another screen. Never overwrite persisted
  // state on reload: the test must prove real visit persistence.
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: KEY, state });
  await page.goto(`${BASE_URL}/#/region/dong-4127353200`);
  return page.getByRole('region', { name: `${PLACE} 방문 기록`, exact: true });
}

async function addVisit(panel: Locator, date: string): Promise<void> {
  await panel.getByLabel('방문일', { exact: true }).fill(date);
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('방문 기록을 저장했어요');
}

async function expectProgress(panel: Locator, regionLevel: number, placeLevel: number, count: number): Promise<void> {
  await expect(panel.getByText(`지역 Lv.${regionLevel}`, { exact: true })).toBeVisible();
  await expect(panel.getByText(`장소 Lv.${placeLevel}`, { exact: true })).toBeVisible();
  await expect(panel.getByText(`이 권역에서 기록한 장소 ${count}곳`, { exact: true })).toBeVisible();
}

async function persisted(page: Page): Promise<UserState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
}

async function screenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const file = path.join(EVIDENCE_DIR, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`visits evidence: ${file}`);
}

test('records persist, can be edited and revisited, reject duplicate days, and delete individually', async ({ page }) => {
  const seed = initialState();
  const panel = await openRegion(page, seed);
  await expectProgress(panel, 0, 0, 0);
  await addVisit(panel, '2026-11-08');
  await expectProgress(panel, 1, 2, 1);
  await expect(panel.getByText('2026-11-08', { exact: true })).toBeVisible();
  await expect(panel.getByText('자기 신고', { exact: true })).toHaveCount(1);
  await expect(panel.getByRole('button', { name: '방문 기록', exact: true })).toBeDisabled();
  expect((await persisted(page)).profile).toEqual(seed.profile);
  expect((await persisted(page)).search).toEqual(seed.search);

  await page.reload();
  await expectProgress(panel, 1, 2, 1);
  await expect(panel.getByText('2026-11-08', { exact: true })).toBeVisible();
  await expect(panel.getByText('자기 신고', { exact: true })).toHaveCount(1);
  await panel.getByRole('button', { name: '2026-11-08 방문일 수정', exact: true }).click();
  await panel.getByLabel('수정할 방문일', { exact: true }).fill('2026-11-07');
  await panel.getByRole('button', { name: '수정 저장', exact: true }).click();
  await expect(panel.getByText('2026-11-07', { exact: true })).toBeVisible();
  await expect(panel.getByText('2026-11-08', { exact: true })).toHaveCount(0);

  await addVisit(panel, '2026-11-09');
  await expectProgress(panel, 1, 2, 1);
  await expect(panel.getByText('자기 신고', { exact: true })).toHaveCount(2);
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-07');
  await expect(panel.getByRole('button', { name: '방문 기록', exact: true })).toBeDisabled();
  await expect(panel.getByText(/이 날짜의 방문 기록이 있어요/)).toBeVisible();

  await panel.getByRole('button', { name: '2026-11-09 방문일 수정', exact: true }).click();
  await panel.getByLabel('수정할 방문일', { exact: true }).fill('2026-11-07');
  await panel.getByRole('button', { name: '수정 저장', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('같은 날짜 방문 기록이 이미 있어요');
  await expect(panel.getByText('자기 신고', { exact: true })).toHaveCount(2);
  await panel.getByRole('button', { name: '취소', exact: true }).click();
  await screenshot(page, 'visits-desktop.png');

  await panel.getByRole('button', { name: '2026-11-09 방문 기록 삭제', exact: true }).click();
  await expect(panel.getByText('2026-11-09', { exact: true })).toHaveCount(0);
  await expect(panel.getByText('2026-11-07', { exact: true })).toBeVisible();
  await expectProgress(panel, 1, 2, 1);
  await panel.getByRole('button', { name: '2026-11-07 방문 기록 삭제', exact: true }).click();
  await expect(panel.getByText('아직 남긴 방문 기록이 없어요.', { exact: true })).toBeVisible();
  await expectProgress(panel, 0, 0, 0);
  await page.reload();
  await expect(panel.getByText('아직 남긴 방문 기록이 없어요.', { exact: true })).toBeVisible();
  await expectProgress(panel, 0, 0, 0);
  const afterDelete = await persisted(page);
  expect(afterDelete.visits).toEqual([]);
  expect(afterDelete.profile).toEqual(seed.profile);
  expect(afterDelete.search).toEqual(seed.search);
});

test('three distinct places raise regional Lv and removing the last record for each place recalculates it', async ({ page }) => {
  const first = await openRegion(page);
  const second = page.getByRole('region', { name: '시연 작은 전시관 방문 기록', exact: true });
  const third = page.getByRole('region', { name: '시연 국수집 방문 기록', exact: true });

  await addVisit(first, '2026-11-08');
  await expectProgress(first, 1, 2, 1);
  await expectProgress(second, 1, 1, 1);
  await addVisit(second, '2026-11-08');
  await expectProgress(second, 1, 2, 2);
  await expectProgress(third, 1, 1, 2);
  await addVisit(third, '2026-11-08');
  await expectProgress(first, 2, 3, 3);
  await expectProgress(second, 2, 3, 3);
  await expectProgress(third, 2, 3, 3);
  await page.reload();
  await expectProgress(first, 2, 3, 3);

  await third.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true }).click();
  await expectProgress(third, 1, 1, 2);
  await expectProgress(first, 1, 2, 2);
  await second.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true }).click();
  await expectProgress(second, 1, 1, 1);
  await first.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true }).click();
  await expectProgress(first, 0, 0, 0);
  await expectProgress(second, 0, 0, 0);
});

test('deleting visits preserves initial regional familiarity and unvisited places inherit its Lv', async ({ page }) => {
  const seed = initialState();
  seed.profile.initialLevels['dong-4127353200'] = 2;
  seed.visits = [{ id: 'familiar-a1', placeId: 'a1', date: '2026-11-08', method: 'self_report' }];
  const panel = await openRegion(page, seed);
  const unvisited = page.getByRole('region', { name: '시연 작은 전시관 방문 기록', exact: true });
  await expectProgress(panel, 2, 3, 1);
  await expectProgress(unvisited, 2, 2, 1);
  await panel.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true }).click();
  await expectProgress(panel, 2, 2, 0);
  await expectProgress(unvisited, 2, 2, 0);
  await page.reload();
  await expectProgress(panel, 2, 2, 0);
  expect((await persisted(page)).profile.initialLevels['dong-4127353200']).toBe(2);
});

test('an empty visit date shows an error and stores no visit', async ({ page }) => {
  const panel = await openRegion(page);
  await panel.getByLabel('방문일', { exact: true }).fill('');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(panel.getByRole('alert')).toHaveText('올바른 방문일을 선택해 주세요.');
  await expect(panel.getByText('자기 신고', { exact: true })).toHaveCount(0);
  expect((await persisted(page)).visits).toEqual([]);
});

test('write failure preserves existing records and shows no successful add, edit, or delete', async ({ page }) => {
  const seed = initialState();
  seed.visits = [{ id: 'existing-a1', placeId: 'a1', date: '2026-11-08', method: 'self_report' }];
  // Fault injection is limited to the error-path test; all UI/storage reads remain real.
  await page.addInitScript(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key) throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, { key: KEY, state: seed });
  await page.goto(`${BASE_URL}/#/region/dong-4127353200`);
  const panel = page.getByRole('region', { name: `${PLACE} 방문 기록`, exact: true });
  const unvisited = page.getByRole('region', { name: '시연 작은 전시관 방문 기록', exact: true });
  const unchanged = async () => expect(await persisted(page)).toEqual(seed);
  await expectProgress(panel, 1, 2, 1);
  await expectProgress(unvisited, 1, 1, 1);

  await unvisited.getByLabel('방문일', { exact: true }).fill('2026-11-09');
  await unvisited.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(unvisited.getByRole('alert')).toContainText('기록을 저장하지 못했어요');
  await expect(unvisited.getByRole('status')).toHaveCount(0);
  await expectProgress(unvisited, 1, 1, 1);
  await expectProgress(panel, 1, 2, 1);
  await expect(panel.getByText('자기 신고', { exact: true })).toHaveCount(1);
  await expect(unvisited.getByText('자기 신고', { exact: true })).toHaveCount(0);
  await unchanged();

  await panel.getByRole('button', { name: '2026-11-08 방문일 수정', exact: true }).click();
  await panel.getByLabel('수정할 방문일', { exact: true }).fill('2026-11-10');
  await panel.getByRole('button', { name: '수정 저장', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('기록을 저장하지 못했어요');
  await expect(panel.getByText('2026-11-08', { exact: true })).toBeVisible();
  await expect(panel.getByRole('status')).toHaveCount(0);
  await expectProgress(panel, 1, 2, 1);
  await unchanged();

  await panel.getByRole('button', { name: '취소', exact: true }).click();
  await panel.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('기록을 저장하지 못했어요');
  await expect(panel.getByText('2026-11-08', { exact: true })).toBeVisible();
  await expect(panel.getByRole('status')).toHaveCount(0);
  await expectProgress(panel, 1, 2, 1);
  await unchanged();
});

test('visit controls and records remain visible on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = await openRegion(page);
  await addVisit(panel, '2026-11-08');
  await expectProgress(panel, 1, 2, 1);
  await expect(panel.getByText('자기 신고', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: '2026-11-08 방문일 수정', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, 'visits-mobile.png');
});

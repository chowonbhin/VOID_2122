import { test, expect, type Page } from '@playwright/test';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const list = (page: Page) => page.getByRole('list', { name: '권역 장소 추천' }).locator(':scope > li');
const markers = (page: Page) => page.getByRole('region', { name: '안산 탐험 지도' }).getByRole('button', { name: /지도에서 선택$/ });

test('designed geographic map sits above cards and retains source attribution', async ({ page }) => {
  await seed(page, false);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
  const mapBox = await map.boundingBox();
  const cardBox = await list(page).first().boundingBox();
  expect(cardBox!.y).toBeGreaterThan(mapBox!.y + mapBox!.height);
  await expect(markers(page)).toHaveCount(5);
});

test('background tile failure preserves list and selectable markers', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await seed(page, false);
  await expect(page.getByText(/배경지도를 불러오지 못했어요/)).toBeVisible();
  await expect(list(page)).toHaveCount(5);
  await page.getByRole('button', { name: '시연 작은 전시관 지도에서 선택', exact: true }).click();
  await expect(page.getByRole('button', { name: '시연 작은 전시관 카드에서 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

async function seed(page: Page, visited: boolean) {
  await page.goto(base);
  await page.evaluate((visited) => localStorage.setItem('ansan-explore/v1', JSON.stringify({
    profile: { initialLevels: { 'region-a': 2 }, interests: [], experiencedEventIds: [] },
    visits: visited ? [{ id: 'visit-a1', placeId: 'a1', date: '2026-11-07', method: 'self_report' }] : [], search: null,
  })), visited);
  await page.goto(`${base}/#/region/region-a`);
  await page.reload();
}

test('visited filter uses persisted records, shares marker selection, and fits mobile', async ({ page }) => {
  await seed(page, true);
  await page.getByRole('button', { name: '가본 장소', exact: true }).click();
  await expect(list(page)).toHaveCount(1);
  await expect(markers(page)).toHaveCount(1);
  await page.getByRole('button', { name: '시연 산책 공간 카드에서 선택', exact: true }).click();
  await expect(markers(page).first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '전체 장소', exact: true }).click();
  await expect(list(page)).toHaveCount(5);
  await expect(page.getByRole('button', { name: '추천 장소', exact: true })).toBeDisabled();
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.claude/state/evidence/region-integrated/mobile-${width}.png`, fullPage: true });
  }
});

test('initial familiarity does not invent visits and empty state recovers', async ({ page }) => {
  await seed(page, false);
  await page.getByRole('button', { name: '가본 장소', exact: true }).click();
  await expect(page.getByText('아직 이 동네에 남긴 방문 기록이 없어요.')).toBeVisible();
  await expect(markers(page)).toHaveCount(0);
  await page.getByRole('button', { name: '전체 장소 보기', exact: true }).click();
  await expect(list(page)).toHaveCount(5);
});

test('recommended filter consumes real shared scores and excludes closed/unknown places', async ({ page }) => {
  await page.goto(`${base}/#/setup`);
  await page.getByLabel('출발지 이름').fill('시연 출발지');
  await page.getByLabel('위도', { exact: true }).fill('37.3219');
  await page.getByLabel('경도', { exact: true }).fill('126.8309');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByLabel('최대 거리 (km)').fill('10');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await page.getByRole('button', { name: /^지도 A권역/ }).click();
  await page.getByRole('button', { name: '추천 장소', exact: true }).click();
  await expect(list(page)).toHaveCount(3);
  await expect(markers(page)).toHaveCount(3);
  await expect(page.getByRole('list', { name: '권역 장소 추천' })).not.toContainText('운영정보 미확인');
  await page.getByRole('button', { name: '시연 작은 전시관 지도에서 선택', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '시연 작은 전시관 카드에서 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '전체 장소', exact: true }).click();
  await expect(list(page)).toHaveCount(5);
  await expect(page.getByRole('list', { name: '권역 장소 추천' })).toContainText('운영정보 미확인');
});

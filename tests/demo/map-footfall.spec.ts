import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3001';
const evidence = process.env.MAP_EVIDENCE_DIR ?? `.claude/state/evidence/map-footfall-${new Date().toISOString().replace(/[:.]/g, '-')}`;
async function setup(page: Page) {
  await page.goto(`${baseURL}/#/setup`);
  await page.getByLabel('출발지 이름').fill('안산 시연 출발지');
  await page.getByLabel('위도', { exact: true }).fill('37.3219');
  await page.getByLabel('경도', { exact: true }).fill('126.8309');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByLabel('최대 거리 (km)').fill('10');
  await page.getByRole('button', { name: '추천 받기' }).click();
}
const rankCards = (page: Page) => page.getByRole('list', { name: '추천 순위' }).getByRole('button');
async function shot(page: Page, name: string) {
  await expect(page.locator('.map-canvas')).toHaveAttribute('aria-busy', 'false', { timeout: 15000 });
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
  console.log(`map evidence: ${evidence}/${name}.png`);
}

test('real-region map → recommended places → visit → footfall and map scores persist, deletion restores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await setup(page);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('button', { name: /^지도 A권역/ })).toContainText('1순위 · 240.7점');
  await expect(map.getByRole('button', { name: /^지도 B권역/ })).toContainText('2순위 · 207.0점');
  await expect(rankCards(page).first()).toContainText('150,039명');
  await expect(rankCards(page).nth(1)).toContainText('65,567명');
  await expect(rankCards(page).first()).toContainText('Lv.0 감점 없음');
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15000 });
  await shot(page, 'map-before-visit');
  // Keyboard activation of the polygon, not just the fallback cards.
  await map.getByRole('button', { name: /^영역 A권역/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A권역 · 중앙동·중앙역');
  const list = page.getByRole('list', { name: '권역 장소 추천' });
  await expect(list.locator(':scope > li')).toHaveCount(5);
  await expect(list.locator(':scope > li').first()).toContainText('시연 산책 공간');
  await expect(list).toContainText('운영정보 미확인');
  await expect(list).not.toContainText('시연 골목 시장');
  await map.getByRole('button', { name: '시연 작은 전시관 지도에서 선택', exact: true }).click();
  await expect(list.getByRole('button', { name: '시연 작은 전시관 카드에서 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await list.getByRole('button', { name: '시연 산책 공간 카드에서 선택', exact: true }).click();
  await expect(map.getByRole('button', { name: '시연 산책 공간 지도에서 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'map-region-selected');
  const visit = page.getByRole('region', { name: '시연 산책 공간 방문 기록', exact: true });
  await visit.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await visit.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(map.getByRole('button', { name: /^지도 A권역/ })).toContainText('188.9점');
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(rankCards(page).first()).toHaveAccessibleName(/B권역/);
  await expect(rankCards(page).nth(1)).toContainText('유동인구 감점 3.21점');
  await expect(map.getByRole('button', { name: /^지도 B권역/ })).toContainText('1순위');
  await page.reload();
  await expect(map.getByRole('button', { name: /^지도 A권역/ })).toContainText('2순위 · 188.9점');
  await shot(page, 'map-after-visit');
  await map.getByRole('button', { name: /^지도 A권역/ }).click();
  await visit.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true }).click();
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(map.getByRole('button', { name: /^지도 A권역/ })).toContainText('1순위 · 240.7점');
  expect(errors).toEqual([]);
});

test('same familiarity penalizes the busier region more, with mobile map and detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('A권역 · 중앙동·중앙역 익숙함').selectOption('2');
  await page.getByLabel('B권역 · 안산역·다문화거리 익숙함').selectOption('2');
  await page.getByRole('button', { name: '추천 받기' }).click();
  const cards = rankCards(page);
  await expect(cards.filter({ hasText: 'A권역' })).toContainText('유동인구 감점 6.43점');
  await expect(cards.filter({ hasText: 'B권역' })).toContainText('유동인구 감점 2.81점');
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('button', { name: /^지도 A권역/ })).toBeVisible();
  await expect(map.getByRole('button', { name: /^지도 B권역/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15000 });
  await shot(page, 'map-mobile');
  await map.getByRole('button', { name: /^지도 B권역/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('B권역 · 안산역·다문화거리');
  await map.getByRole('button', { name: '시연 공방 지도에서 선택', exact: true }).click();
  await expect(page.getByRole('button', { name: '시연 공방 카드에서 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, 'map-detail-mobile');
});

test('tile failure keeps the polygon and list usable, excluded regions remain explorable', async ({ page }) => {
  // Failure-path injection only; the normal browser tests use real OSM tiles.
  await page.route('https://tile.openstreetmap.org/**', route => route.abort('failed'));
  await setup(page);
  await expect(page.getByRole('status')).toContainText('배경지도를 불러오지 못했습니다');
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('최대 거리 (km)').fill('0.1');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByText('조건에 맞는 추천 권역이 없어요', { exact: true })).toBeVisible();
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('button', { name: /^지도 A권역/ })).toContainText('조건 미충족');
  await map.getByRole('button', { name: /^지도 A권역/ }).click();
  await expect(page.getByRole('list', { name: '권역 장소 추천' }).locator(':scope > li')).toHaveCount(5);
});

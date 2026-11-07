// Uses the real shipped simulation content, including an excluded chain and unclassified place.
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3002';
const evidence = `.claude/state/evidence/franchise-${new Date().toISOString().replace(/[:.]/g, '-')}`;

async function setup(page: Page) {
  await page.goto(`${baseURL}/#/setup`);
  await page.getByLabel('출발지 이름').fill('시연 출발지');
  await page.getByLabel('위도', { exact: true }).fill('37.3219');
  await page.getByLabel('경도', { exact: true }).fill('126.8309');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByLabel('최대 거리 (km)').fill('10');
  await page.getByRole('button', { name: '추천 받기' }).click();
}
async function checkPlaces(page: Page, region: 'A' | 'B') {
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`${region}권역`);
  await expect(page.getByText(region === 'A'
    ? '프랜차이즈 1곳 · 분류 미확인 0곳은 목록·지도·점수에서 제외했습니다.'
    : '프랜차이즈 0곳 · 분류 미확인 1곳은 목록·지도·점수에서 제외했습니다.', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '권역 장소 추천' }).locator(':scope > li')).toHaveCount(5);
  await expect(page.getByRole('region', { name: '안산 탐험 지도' }).getByRole('button', { name: /지도에서 선택$/ })).toHaveCount(5);
  await expect(page.getByText(/시연 프랜차이즈 카페|시연 분류 미확인 카페|시연 체인점 행사/)).toHaveCount(0);
  await expect(page.getByText(/비프랜차이즈 설정 \(시연용\)/)).toHaveCount(5);
}
async function shot(page: Page, name: string) {
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
  console.log(`franchise evidence: ${evidence}/${name}.png`);
}

test('franchise/unverified exclusions apply to scores, cards, markers and event display', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  await expect(page.getByText('프랜차이즈와 분류 미확인 장소는 추천·점수에서 제외합니다.', { exact: true })).toBeVisible();
  const cards = page.getByRole('list', { name: '추천 순위' }).getByRole('button');
  await expect(cards.first()).toContainText('추천 점수 240.7');
  await expect(cards.nth(1)).toContainText('추천 점수 207.0');
  await expect(cards.first()).toContainText('운영 확인 장소 수 3곳');
  await page.getByRole('button', { name: /^지도 A권역/ }).click();
  await checkPlaces(page, 'A');
  await shot(page, 'excluded-franchise');
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await page.getByRole('button', { name: /^지도 B권역/ }).click();
  await checkPlaces(page, 'B');
  await page.reload();
  await checkPlaces(page, 'B');
  expect(errors).toEqual([]);
});

test('mobile direct exploration and absence of saved conditions cannot bypass exclusion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/#/region/region-b`);
  await expect(page.getByText('조건을 설정하면 추천순으로 표시합니다.', { exact: true })).toBeVisible();
  await checkPlaces(page, 'B');
  await shot(page, 'unverified-mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await setup(page);
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('최대 거리 (km)').fill('0.1');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await page.getByRole('region', { name: '직접 탐색' }).getByRole('button', { name: /A권역/ }).click();
  await checkPlaces(page, 'A');
});

test('previously saved excluded visits remain stored but never alter Lv, scores or map shades', async ({ page }) => {
  await setup(page);
  const before = await page.locator('[data-region-id="region-a"]').getAttribute('fill');
  // Legacy storage input, not a mocked recommendation response.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('ansan-explore/v1')!);
    state.visits = ['a6-franchise', 'b6-unverified'].map(placeId => ({ id: placeId, placeId, date: '2026-11-08', method: 'self_report' }));
    localStorage.setItem('ansan-explore/v1', JSON.stringify(state));
  });
  await page.reload();
  const cards = page.getByRole('list', { name: '추천 순위' }).getByRole('button');
  await expect(cards.first()).toContainText('지역 Lv.0');
  await expect(cards.first()).toContainText('추천 점수 240.7');
  await expect(cards.nth(1)).toContainText('지역 Lv.0');
  await expect(cards.nth(1)).toContainText('추천 점수 207.0');
  await expect(page.locator('[data-region-id="region-a"]')).toHaveAttribute('fill', before!);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!).visits)).toHaveLength(2);
});

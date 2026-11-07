// Uses the real shipped simulation content, including an excluded chain and unclassified place.
import { test, expect, type Page } from './baseline';
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
  await expect(page.getByRole('heading', { level: 1 })).toContainText(region === 'A' ? '중앙동' : '원곡동');
  await expect(page.getByText(region === 'A'
    ? '프랜차이즈 1곳 · 분류 미확인 0곳은 목록·지도·점수에서 제외했습니다.'
    : '프랜차이즈 0곳 · 분류 미확인 1곳은 목록·지도·점수에서 제외했습니다.', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '행정동 장소 추천' }).locator(':scope > li')).toHaveCount(region === 'A' ? 5 : 4);
  await expect(page.getByRole('region', { name: '안산 탐험 지도' }).getByRole('button', { name: /지도에서 선택$/ })).toHaveCount(region === 'A' ? 5 : 4);
  await expect(page.getByText(/시연 프랜차이즈 카페|시연 분류 미확인 카페|시연 체인점 행사/)).toHaveCount(0);
  await expect(page.getByText(/비프랜차이즈 설정 \(시연용\)/)).toHaveCount(region === 'A' ? 5 : 4);
}
async function shot(page: Page, name: string) {
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
  console.log(`franchise evidence: ${evidence}/${name}.png`);
}

const dongOnMap = (page: Page, name: string) => page.getByRole('region', { name: '안산 탐험 지도' }).getByRole('button', { name: new RegExp(`^지도 ${name} ·`) });
const recommendedDongs = (page: Page) => page.locator('.ansan-region.recommended');
const placePicks = (page: Page) => page.getByRole('list', { name: '장소 추천' }).getByRole('button');

test('franchise/unverified exclusions apply to scores, cards, markers and event display', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  // Score values are pinned in score.test.ts; the main screen shows only the resulting order.
  await expect(dongOnMap(page, '중앙동')).toHaveAccessibleName(/오늘의 추천 1순위/);
  await expect(dongOnMap(page, '원곡동')).toHaveAccessibleName(/오늘의 추천 2순위/);
  await page.getByRole('button', { name: /^지도 중앙동/ }).click();
  await checkPlaces(page, 'A');
  await shot(page, 'excluded-franchise');
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await page.getByRole('button', { name: /^지도 원곡동/ }).click();
  await checkPlaces(page, 'B');
  await page.reload();
  await checkPlaces(page, 'B');
  expect(errors).toEqual([]);
});

test('mobile direct exploration and absence of saved conditions cannot bypass exclusion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/#/region/dong-4127354500`);
  await expect(page.getByText('조건을 설정하면 추천순으로 표시합니다.', { exact: true })).toBeVisible();
  await checkPlaces(page, 'B');
  await shot(page, 'unverified-mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await setup(page);
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('최대 거리 (km)').fill('0.1');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await page.getByRole('region', { name: '직접 탐색' }).getByRole('button', { name: /중앙동/ }).click();
  await checkPlaces(page, 'A');
});

test('previously saved excluded visits remain stored but never alter Lv, scores or map shades', async ({ page }) => {
  await setup(page);
  const before = await page.locator('[data-region-id="dong-4127353200"]').getAttribute('fill');
  // Legacy storage input, not a mocked recommendation response.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('ansan-explore/v1')!);
    state.visits = ['a6-franchise', 'b6-unverified'].map(placeId => ({ id: placeId, placeId, date: '2026-11-08', method: 'self_report' }));
    localStorage.setItem('ansan-explore/v1', JSON.stringify(state));
  });
  await page.reload();
  await expect(dongOnMap(page, '중앙동')).toHaveAccessibleName(/아직 낯선 동네 · 오늘의 추천 1순위/);
  await expect(dongOnMap(page, '원곡동')).toHaveAccessibleName(/아직 낯선 동네 · 오늘의 추천 2순위/);
  await expect(page.locator('[data-region-id="dong-4127353200"]')).toHaveAttribute('fill', before!);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!).visits)).toHaveLength(2);
});

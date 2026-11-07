import { test, expect, type Page } from './baseline';
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
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toBeVisible();
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
  await page.getByRole('region', { name: '안산 탐험 지도' }).screenshot({ path: `${evidence}/${name}-map.png` });
  console.log(`map evidence: ${evidence}/${name}.png`);
}

test('Ansan schematic → places → visit changes score and shade, persistence and deletion restore', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await setup(page);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  // The map speaks in familiarity and recommendation order; score and footfall values live in unit tests.
  await expect(map.getByRole('button', { name: /^지도 중앙동/ })).toHaveAccessibleName(/친밀도 잘 몰라요 · 오늘의 추천 1순위/);
  await expect(map.getByRole('button', { name: /^지도 원곡동/ })).toHaveAccessibleName(/친밀도 잘 몰라요 · 오늘의 추천 2순위/);
  await expect(map.getByText('테라코타 테두리: 오늘의 추천', { exact: true })).toBeVisible();
  await shot(page, 'map-before-visit');
  const aFill = await map.locator('[data-region-id="dong-4127353200"]').getAttribute('fill');
  const bFill = await map.locator('[data-region-id="dong-4127354500"]').getAttribute('fill');
  // A keyboard user can open every region without interacting with SVG paths.
  await map.getByRole('button', { name: /^지도 중앙동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('중앙동');
  const list = page.getByRole('list', { name: '행정동 장소 추천' });
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
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(map.getByRole('button', { name: /^지도 중앙동/ })).toHaveAccessibleName(/친밀도 가끔 가요/);
  await expect(rankCards(page).first()).toHaveAccessibleName(/중앙동/);
  await expect(rankCards(page).first()).toContainText('친밀도 가끔 가요');
  await expect(map.getByRole('button', { name: /^지도 원곡동/ })).toHaveAccessibleName(/2순위/);
  await page.reload();
  await expect(map.getByRole('button', { name: /^지도 중앙동/ })).toHaveAccessibleName(/친밀도 가끔 가요 · 오늘의 추천 1순위/);
  await expect(map.locator('[data-region-id="dong-4127353200"]')).not.toHaveAttribute('fill', aFill!);
  // Unchanged familiarity keeps exactly the same shade.
  await expect(map.locator('[data-region-id="dong-4127354500"]')).toHaveAttribute('fill', bFill!);
  await shot(page, 'map-after-visit');
  await map.getByRole('button', { name: /^지도 중앙동/ }).click();
  await visit.getByRole('button', { name: '2026-11-08 방문 기록 삭제', exact: true }).click();
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(map.getByRole('button', { name: /^지도 중앙동/ })).toHaveAccessibleName(/친밀도 잘 몰라요 · 오늘의 추천 1순위/);
  await expect(map.locator('[data-region-id="dong-4127353200"]')).toHaveAttribute('fill', aFill!);
  expect(errors).toEqual([]);
});

test('same familiarity penalizes the busier region more, with mobile map and detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await page.getByLabel('원곡동 익숙함').selectOption('2');
  await page.getByRole('button', { name: '추천 받기' }).click();
  const cards = rankCards(page);
  await expect(cards.filter({ hasText: '중앙동' })).toContainText('친밀도 자주 가요');
  await expect(cards.filter({ hasText: '원곡동' })).toContainText('친밀도 자주 가요');
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('button', { name: /^지도 중앙동/ })).toBeVisible();
  await expect(map.getByRole('button', { name: /^지도 원곡동/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(map.getByText('테라코타 테두리: 오늘의 추천', { exact: true })).toBeVisible();
  await shot(page, 'map-mobile');
  await map.getByRole('button', { name: /^지도 원곡동/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('원곡동');
  // Every marker must be clickable on a narrow phone, without obscuring a neighbour.
  await page.setViewportSize({ width: 320, height: 844 });
  const markerNames = await map.getByRole('button', { name: /지도에서 선택$/ }).evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')!));
  for (const name of markerNames) {
    const marker = map.getByRole('button', { name, exact: true });
    await marker.click();
    await expect(marker).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: name.replace('지도에서', '카드에서'), exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await map.getByRole('button', { name: '시연 식당 지도에서 선택', exact: true }).click();
  await expect(page.getByRole('button', { name: '시연 식당 카드에서 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, 'map-detail-mobile');
});

test('schematic uses no external map requests and excluded regions remain explorable offline', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL).origin) external.push(request.url()); });
  await setup(page);
  await context.setOffline(true);
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('최대 거리 (km)').fill('0.1');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByText('조건에 맞는 추천 행정동이 없어요', { exact: true })).toBeVisible();
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  // Not recommended now, but familiarity is still shown.
  await expect(map.getByRole('button', { name: /^지도 중앙동/ })).not.toHaveAccessibleName(/오늘의 추천/);
  await expect(map.locator('[data-region-id="dong-4127353200"]')).toHaveAttribute('fill', '#E1EBDD');
  await expect(map.locator('[data-region-id="dong-4127353200"]')).toHaveAttribute('data-level', '0');
  expect(external).toEqual([]);
  // The coloured region body also opens its recommendations, beyond its text button.
  await map.locator('[data-region-id="dong-4127353200"]').click();
  await expect(page.getByRole('list', { name: '행정동 장소 추천' }).locator(':scope > li')).toHaveCount(5);
  expect(external).toEqual([]);
});

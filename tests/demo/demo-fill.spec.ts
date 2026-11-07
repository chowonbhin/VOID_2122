import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const target = '시연 중앙동 체험 20';
const regionId = 'dong-4127353200';
const list = (page: Page) => page.getByRole('list', { name: '행정동 장소 추천' });
const panel = (page: Page) => page.getByRole('region', { name: `${target} 방문 기록`, exact: true });
async function start(page: Page) {
  await page.goto(`${base}/#/setup`);
  await page.getByLabel('내 동네 선택').selectOption('4127353200');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.locator('.ansan-region.recommended')).toHaveCount(25);
}

test('twentieth visit, reload, mode switches and deletion keep the correct top 20', async ({ page }) => {
  await start(page);
  const score = page.locator(`[data-region-id="${regionId}"]`);
  const originalScore = await score.getAttribute('data-score');
  await page.getByRole('button', { name: /^지도 중앙동/ }).click();
  const originals = await list(page).getByRole('heading', { level: 2 }).allTextContents();
  await panel(page).getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(list(page)).not.toContainText(target);
  await expect(list(page)).toContainText('시연 중앙동 산책 21');
  await page.reload();
  await expect(list(page)).not.toContainText(target);
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await page.getByRole('button', { name: '시연 안내' }).click();
  await page.getByRole('button', { name: '추가 시연 장소 끄기' }).click();
  await page.getByRole('button', { name: '시연 안내' }).click();
  await expect(page.getByRole('button', { name: '추가 시연 장소 켜기' })).toBeVisible();
  await expect(list(page).locator(':scope > li')).toHaveCount(5);
  await expect(list(page)).not.toContainText(target);
  await page.getByRole('button', { name: '추가 시연 장소 켜기' }).click();
  await page.getByRole('button', { name: '가본 장소', exact: true }).click();
  await expect(panel(page).locator('time')).toHaveText('2026-11-08');
  await panel(page).getByRole('button', { name: '2026-11-08 방문 기록 삭제' }).click();
  await page.getByRole('button', { name: '추천 장소', exact: true }).click();
  expect(await list(page).getByRole('heading', { level: 2 }).allTextContents()).toEqual(originals);
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(score).toHaveAttribute('data-score', originalScore!);
});

test('filters still apply; the visible preset restores 25 full dongs including Daebu without erasing familiarity', async ({ page }) => {
  await page.goto(`${base}/#/setup`);
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T02:00');
  await page.getByLabel('최대 거리 (km)').fill('1');
  await page.getByRole('checkbox', { name: '자연·산책' }).check();
  await page.getByRole('button', { name: '추천 받기' }).click();
  const picks = page.getByRole('list', { name: '장소 추천' }).getByRole('button');
  const jungang = page.getByRole('button', { name: /^지도 중앙동 ·/ });
  // Counts and scores stay off screen; the 20-place detail list is checked below.
  await expect(jungang).toHaveAccessibleName(/내가 좋아하는 동네/);
  await page.getByRole('button', { name: '시연 안내' }).click();
  await page.getByRole('button', { name: '25개 동 시연 조건 적용' }).click();
  await expect(page.locator('.ansan-region.recommended')).toHaveCount(25);
  expect((await picks.allTextContents()).every(text => !text.includes('점수'))).toBe(true);
  await expect(jungang).toHaveAccessibleName(/내가 좋아하는 동네/);
  await picks.filter({ hasText: '대부동' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('대부동');
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
});

test('320px map pages expose all 20 touch targets and card selection opens the right page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await start(page);
  await page.getByRole('button', { name: /^지도 중앙동/ }).click();
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  const selectedNames = new Set<string>();
  for (let index = 0; index < 3; index++) {
    const markers = map.getByRole('button', { name: /지도에서 선택$/ });
    await expect(markers).toHaveCount(index === 2 ? 4 : 8);
    for (const marker of await markers.all()) {
      const name = await marker.getAttribute('aria-label');
      await marker.click();
      selectedNames.add(name!);
      await expect(page.getByRole('button', { name: name!.replace('지도에서 선택', '카드에서 선택'), exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    if (index < 2) await page.getByRole('button', { name: '다음 지도 장소' }).click();
  }
  expect(selectedNames.size).toBe(20);
  await page.getByRole('button', { name: '시연 중앙동 산책 01 카드에서 선택', exact: true }).click();
  await expect(map.getByRole('button', { name: '시연 중앙동 산책 01 지도에서 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  fs.mkdirSync('.claude/state/evidence/demo-fill', { recursive: true });
  await map.screenshot({ path: '.claude/state/evidence/demo-fill/central-320.png' });
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(page.getByRole('heading', { name: '추천 행정동' })).toBeVisible();
  await page.getByRole('region', { name: '안산 탐험 지도' }).screenshot({ path: '.claude/state/evidence/demo-fill/score-map-320.png' });
});

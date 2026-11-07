import { test, expect } from './baseline';
import { base, setup, openBono, mapScore, openVisit, closeVisit } from './real';

test('real visit changes exact map score and shade; deletion and reload restore it', async ({ page }) => {
  await setup(page);
  const score = await mapScore(page).getAttribute('data-score');
  const color = await mapScore(page).getAttribute('fill');
  await openBono(page);
  const panel = await openVisit(page, '바바카멜');
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await closeVisit(page);
  await page.getByRole('link', { name: '안산에 스며들다' }).click();
  expect(Number(await mapScore(page).getAttribute('data-score'))).toBeLessThan(Number(score));
  expect(await mapScore(page).getAttribute('fill')).not.toBe(color);
  await page.reload();
  await expect(mapScore(page)).not.toHaveAttribute('fill', color!);
  await openBono(page);
  await openVisit(page, '바바카멜');
  await panel.getByRole('button', { name: '2026-11-08 방문 기록 삭제' }).click();
  await closeVisit(page);
  await page.getByRole('link', { name: '안산에 스며들다' }).click();
  await expect(mapScore(page)).toHaveAttribute('data-score', score!);
  await expect(mapScore(page)).toHaveAttribute('fill', color!);
});

test('a real visit keeps the main screen score-free and the 동네 page free of footfall internals', async ({ page }) => {
  // Footfall and score maths are covered by footfall.test.ts and score.test.ts; the UI shows none of it.
  await setup(page);
  const card = page.getByRole('list', { name: '장소 추천' }).getByRole('button').filter({ hasText: '본오1동' }).first();
  await expect(card).toContainText('오늘의 추천');
  await expect(page.getByRole('list', { name: '지도 범례' })).toContainText('오늘의 추천');
  await openBono(page);
  await expect(page.locator('.region-detail')).not.toContainText('유동인구');
  const panel = await openVisit(page, '바바카멜');
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(page.locator('.region-detail')).not.toContainText('감점');
  await closeVisit(page);
  await page.getByRole('link', { name: '안산에 스며들다' }).click();
  await expect(card).toContainText('오늘의 추천');
});

test('drawing and real-place exploration make no external map or API calls in browser, including offline', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', request => { if (!request.url().startsWith(base) && /^https?:/.test(request.url())) external.push(request.url()); });
  await setup(page);
  await context.setOffline(true);
  await page.getByRole('button', { name: /^지도 중앙동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('중앙동');
  expect(external).toEqual([]);
});

test('the main map is familiarity-only with home hatching; the hidden score still drives order', async ({ page }) => {
  await setup(page);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('list', { name: '지도 범례' })).toContainText('내가 좋아하는 동네');
  await expect(map.getByRole('button', { name: '점수 보기', exact: true })).toHaveCount(0);
  await expect(mapScore(page)).toHaveAttribute('fill', 'var(--color-map-familiarity-0)');
  expect(Number(await mapScore(page).getAttribute('data-score'))).toBeGreaterThan(0);
  await expect(map.locator('.ansan-home-hatch')).toHaveCount(1);
  await expect(map.locator('text')).toHaveCount(0);
  await expect(map.getByRole('button', { name: /^지도 본오1동/ })).toHaveAccessibleName(/오늘의 추천 \d+순위/);
  await openBono(page);
  await expect(page.locator('.dong-pin.kind-start')).toHaveCount(0);
});

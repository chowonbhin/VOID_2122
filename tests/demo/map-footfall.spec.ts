import { test, expect } from './baseline';
import { base, setup, openBono, mapScore } from './real';

test('real visit changes exact map score and shade; deletion and reload restore it', async ({ page }) => {
  await setup(page);
  const score = await mapScore(page).getAttribute('data-score');
  const color = await mapScore(page).getAttribute('fill');
  await openBono(page);
  const panel = page.getByRole('region', { name: '바바카멜 방문 기록', exact: true });
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  expect(Number(await mapScore(page).getAttribute('data-score'))).toBeLessThan(Number(score));
  expect(await mapScore(page).getAttribute('fill')).not.toBe(color);
  await page.reload();
  await expect(mapScore(page)).not.toHaveAttribute('fill', color!);
  await openBono(page);
  await page.getByRole('button', { name: '가본 장소', exact: true }).click();
  await panel.getByRole('button', { name: '2026-11-08 방문 기록 삭제' }).click();
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(mapScore(page)).toHaveAttribute('data-score', score!);
  await expect(mapScore(page)).toHaveAttribute('fill', color!);
});

test('source-dong footfall is visible before and after a real visit; absent dongs remain unmeasured', async ({ page }) => {
  await setup(page);
  const card = page.getByRole('list', { name: '장소 추천' }).getByRole('button').filter({ hasText: '본오1동' }).first();
  // Main screen: place picks and familiarity only; footfall details live on the 동네 page.
  await expect(card).toContainText('오늘의 추천');
  await expect(page.getByRole('region', { name: '안산 탐험 지도' })).toContainText('테라코타 테두리: 오늘의 추천');
  await openBono(page);
  await page.getByText('유동인구 반영 내역', { exact: true }).click();
  await expect(page.locator('details')).toContainText('Lv.0 감점 없음');
  await expect(page.locator('details')).toContainText('11,360 / 466,765');
  await expect(page.locator('details')).toContainText('안산신안우편취급국');
  const panel = page.getByRole('region', { name: '바바카멜 방문 기록', exact: true });
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(page.locator('details')).toContainText('지역 Lv.1 · 유동인구 감점률 1.14% (최대 15%)');
  await expect(page.locator('details')).toContainText('최대 동별 합계 150,039명');
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await expect(card).toContainText('오늘의 추천');
  await page.getByRole('button', { name: /^지도 와동/ }).click();
  await page.getByText('유동인구 반영 내역', { exact: true }).click();
  await expect(page.locator('details')).toContainText('유동인구 미반영');
  await expect(page.locator('details')).toContainText('0명으로 측정된 동이라는 뜻은 아닙니다');
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
  await expect(map).toContainText('색이 짙을수록 내가 좋아하는 동네예요.');
  await expect(map.getByRole('button', { name: '점수 보기', exact: true })).toHaveCount(0);
  await expect(mapScore(page)).toHaveAttribute('fill', '#E1EBDD');
  expect(Number(await mapScore(page).getAttribute('data-score'))).toBeGreaterThan(0);
  await expect(map.locator('.ansan-home-hatch')).toHaveCount(1);
  await expect(map.locator('text')).toHaveCount(0);
  await expect(map.getByRole('button', { name: /^지도 본오1동/ })).toHaveAccessibleName(/오늘의 추천 \d+순위/);
  await openBono(page);
  await expect(page.locator('.dong-pin.kind-start')).toHaveCount(0);
});

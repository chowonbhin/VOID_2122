import { test, expect } from './baseline';
import { base, setup, mapScore, list } from './real';
import { changeState } from './setupSteps';

test('normalized scores include all 20 actual venues and experience still changes the score', async ({ page }) => {
  await setup(page);
  await expect(page.getByRole('button', { name: /^지도 본오1동/ })).toHaveAccessibleName(/오늘의 추천 \d+순위/);
  await expect(page.getByRole('button', { name: /^지도 중앙동/ })).toHaveAccessibleName(/오늘의 추천 \d+순위/);
  const before = Number(await mapScore(page).getAttribute('data-score'));
  await changeState(page, { profile: { initialLevels: { 'dong-4127154000': 2 } } });
  expect(Number(await mapScore(page).getAttribute('data-score'))).toBeLessThan(before);
  await page.reload();
  await expect(page.getByRole('button', { name: /^지도 본오1동/ })).toHaveAccessibleName(/내가 좋아하는 동네/);
});

test('interest and distance filters constrain the same displayed/scored set; the complete pool stays reachable', async ({ page }) => {
  await setup(page);
  await changeState(page, { search: { interests: ['nature'] } });
  await expect(mapScore(page)).not.toHaveAttribute('data-score', 'unavailable');
  await page.goto(`${base}/#/region/dong-4127154000`);
  const selectedCount = await list(page).locator(':scope > li').count();
  expect(selectedCount).toBeGreaterThan(0);
  expect(selectedCount).toBeLessThan(20);
  await expect(list(page).getByText(/자연·산책 ·/)).toHaveCount(selectedCount);
  await page.getByRole('button', { name: '전체 후보' }).click();
  expect(await list(page).locator(':scope > li').count()).toBeGreaterThan(20);
  await page.getByRole('button', { name: '추천 장소' }).click();
  await expect(list(page).locator(':scope > li')).toHaveCount(selectedCount);
  await setup(page, '2026-11-08T14:00', '0.1');
  await expect(page.getByRole('button', { name: /^지도 본오1동/ })).toHaveAccessibleName(/선택한 거리 밖/);
});

test('at night closed sources cannot be represented as open recommendations', async ({ page }) => {
  await setup(page, '2026-11-08T23:00');
  await expect(mapScore(page)).not.toHaveAttribute('data-score', 'unavailable');
  await page.goto(`${base}/#/region/dong-4127154000`);
  await page.getByRole('button', { name: '전체 후보' }).click();
  const baba = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: /바바카멜/ }) });
  await expect(baba).toContainText('휴무·이용 마감');
  await expect(baba).toContainText('지금 조건에서는 추천하지 않지만 둘러볼 수 있어요.');
});

test('without conditions the map asks for conditions and still opens 20 real venues', async ({ page }) => {
  await page.goto(`${base}/#/recommend`);
  await expect(page.getByRole('button', { name: '시작 설정하기' })).toBeVisible();
  await page.getByRole('button', { name: /^지도 중앙동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
});

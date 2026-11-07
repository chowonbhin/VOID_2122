import { test, expect } from './baseline';
import { base, setup, mapScore, list, openVisit, closeVisit } from './real';
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

test('interest and distance filters constrain the default displayed/scored set', async ({ page }) => {
  await setup(page);
  await changeState(page, { search: { interests: ['nature'] } });
  await expect(mapScore(page)).not.toHaveAttribute('data-score', 'unavailable');
  await page.goto(`${base}/#/region/dong-4127154000`);
  const selectedCount = await list(page).locator(':scope > li').count();
  expect(selectedCount).toBeGreaterThan(0);
  expect(selectedCount).toBeLessThan(20);
  await expect(list(page).getByText(/^자연·산책(?: ·|$)/)).toHaveCount(selectedCount);
  await expect(list(page).locator(':scope > li')).toHaveCount(selectedCount);
  await setup(page, '2026-11-08T14:00', '0.1');
  await expect(page.getByRole('button', { name: /^지도 본오1동/ })).toHaveAccessibleName(/선택한 거리 밖/);
});

test('at night closed sources cannot be represented as open recommendations', async ({ page }) => {
  // The 동네 page shows opening info for the real current time; pin the clock to the same night.
  await page.clock.install({ time: new Date('2026-11-08T23:00:00+09:00') });
  await setup(page);
  await expect(mapScore(page)).not.toHaveAttribute('data-score', 'unavailable');
  await page.goto(`${base}/#/region/dong-4127154000`);
  // Previously visited places remain accessible through Memories, even when closed.
  const panel = await openVisit(page, '바바카멜');
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-07');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await closeVisit(page);
  await changeState(page, { search: { when: '2026-11-08T23:00' } });
  await expect(list(page)).not.toContainText('바바카멜');
  await page.getByRole('region', { name: '이 동네의 추억' }).getByRole('button').filter({ hasText: '바바카멜' }).click();
  const baba = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: /바바카멜/ }) });
  await expect(baba).toContainText('휴무·이용 마감');
  await expect(baba).toContainText('현재 추천 조건 밖');
});

test('after onboarding, missing search conditions still allow exploring 20 real venues', async ({ page }) => {
  await page.goto(`${base}/#/recommend`);
  // First-time users now enter onboarding; exercise the completed-user fallback.
  await changeState(page, { profile: { onboarding: {
    residence: 'under_6m', visitedDongCodes: [], visitedPlaceIds: [], completedAt: '2026-11-08T00:00:00+09:00',
  } } });
  await expect(page.getByRole('button', { name: '시작 설정하기' })).toBeVisible();
  await page.getByRole('button', { name: /^지도 중앙동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
});

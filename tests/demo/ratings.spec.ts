import { test, expect } from './baseline';
import { base, setup, list, openVisit, closeVisit } from './real';

// External star ratings still feed scoring (covered by unit tests) but are no longer shown on the 동네 page.
test('star ratings and review counts stay off the cards while a visit still updates scores', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127152500`);
  const places = list(page);
  await expect(places.locator(':scope > li')).toHaveCount(20);
  const rated = places.locator(':scope > li').filter({ has: page.getByRole('heading', { name: /^\d+\. 레드지$/ }) });
  await expect(rated).toHaveAttribute('data-rated', 'true');
  await expect(rated).not.toContainText('리뷰');
  await expect(places).not.toContainText('별점');
  await expect(places).not.toContainText('점수');
  const panel = await openVisit(page, '레드지');
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(panel).toHaveAttribute('data-region-level', '1');
  await closeVisit(page);
  await page.getByRole('button', { name: '가본 장소', exact: true }).click();
  await expect(rated).not.toContainText('별점');
  await page.getByRole('button', { name: '발견할 20곳', exact: true }).click();
  await expect(places.locator(':scope > li')).toHaveCount(20);
});

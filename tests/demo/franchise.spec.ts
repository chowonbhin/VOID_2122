import { test, expect } from './baseline';
import data from '../../src/data/research/real-places.json' with { type: 'json' };
import { base, setup, list, openVisit, closeVisit } from './real';

test('known and suspected chains stay outside cards, markers and scores; pending classification is labelled', async ({ page }) => {
  await setup(page);
  const region = 'dong-4127353500';
  await page.goto(`${base}/#/region/${region}`);
  await page.getByRole('button', { name: '전체 후보' }).click();
  for (const place of data.filter(p => p.regionId === region && (p.discovery.excludedReason || p.franchise.status === 'franchise'))) {
    await expect(list(page).getByRole('heading', { name: new RegExp(`\\. ${place.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })).toHaveCount(0);
  }
  // Classification review status is internal and no longer shown; exclusion is what matters.
  await page.getByRole('button', { name: '추천 장소' }).click();
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await expect(list(page)).not.toContainText('점수');
});

test('pending real-place visits update score and Lv while missing evidence stays explicitly provisional', async ({ page }) => {
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127353200`);
  // A highly rated place can remain in the top 20 after a visit. Exercise
  // replacement with an unrated candidate, rather than assuming rank 1 leaves.
  const first = list(page).locator(':scope > li[data-rated="false"]').first();
  const heading = await first.getByRole('heading').innerText();
  const name = heading.replace(/^\d+\. /, '');
  const panel = await openVisit(page, name);
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await expect(list(page).getByRole('heading', { name: new RegExp(name) })).toHaveCount(0);
  // The editor survives the place moving out of the top 20.
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-region-level', '1');
  await expect(panel).toHaveAttribute('data-place-level', '2');
  await closeVisit(page);
  await page.getByRole('button', { name: '가본 장소' }).click();
  await expect(list(page)).toContainText(name);
  await expect(list(page)).not.toContainText('Lv.');
  await expect(list(page)).not.toContainText('장소 Lv 검토 대기');
  await page.reload();
  await page.getByRole('button', { name: '가본 장소' }).click();
  await openVisit(page, name);
  await expect(panel).toContainText('2026-11-08');
  await panel.getByRole('button', { name: '2026-11-08 방문 기록 삭제' }).click();
  await closeVisit(page);
  await page.getByRole('button', { name: '발견할 20곳', exact: true }).click();
  await expect(list(page)).toContainText(name);
});

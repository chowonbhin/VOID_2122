import { test, expect } from './baseline';
import data from '../../src/data/research/real-places.json' with { type: 'json' };
import { base, setup, list } from './real';

test('known and suspected chains stay outside cards, markers and scores; pending classification is labelled', async ({ page }) => {
  await setup(page);
  const region = 'dong-4127353500';
  await page.goto(`${base}/#/region/${region}`);
  await page.getByRole('button', { name: '전체 후보' }).click();
  for (const place of data.filter(p => p.regionId === region && (p.discovery.excludedReason || p.franchise.status === 'franchise'))) {
    await expect(list(page).getByRole('heading', { name: new RegExp(`\\. ${place.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })).toHaveCount(0);
  }
  await expect(list(page)).toContainText('프랜차이즈 여부 검토 중');
  await page.getByRole('button', { name: '점수 반영 장소' }).click();
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await expect(list(page)).toContainText('정보 검토 중인 잠정 점수');
});

test('pending real-place visits update score and Lv while missing evidence stays explicitly provisional', async ({ page }) => {
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127353200`);
  const first = list(page).locator(':scope > li').first();
  const heading = await first.getByRole('heading').innerText();
  const name = heading.replace(/^\d+\. /, '');
  const panel = first.getByRole('region');
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await expect(list(page).getByRole('heading', { name: new RegExp(name) })).toHaveCount(0);
  await page.getByRole('button', { name: '가본 장소' }).click();
  await expect(list(page)).toContainText(name);
  await expect(list(page)).toContainText('지역 Lv.1');
  await expect(list(page)).toContainText('장소 Lv.2');
  await expect(list(page)).not.toContainText('장소 Lv 검토 대기');
  await expect(list(page)).toContainText('분류 검토 중인 실제 장소입니다');
  await page.reload();
  await page.getByRole('button', { name: '가본 장소' }).click();
  await expect(list(page)).toContainText('2026-11-08');
  await list(page).getByRole('button', { name: '2026-11-08 방문 기록 삭제' }).click();
  await page.getByRole('button', { name: '발견할 20곳', exact: true }).click();
  await expect(list(page)).toContainText(name);
});

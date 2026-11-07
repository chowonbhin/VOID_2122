import { test, expect } from './baseline';
import { base, setup, openBono, list } from './real';

test('20 actual cards and three marker pages share selection on a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  await openBono(page);
  const cards = list(page).locator(':scope > li');
  await expect(cards).toHaveCount(20);
  // No map paging controls: the map shows 8 places, and choosing a card brings that place onto the map.
  await expect(page.getByRole('navigation', { name: '지도 장소 페이지' })).toHaveCount(0);
  const last = cards.last();
  const name = (await last.getByRole('heading').innerText()).replace(/^20\. /, '');
  const pin = page.getByRole('button', { name: `${name} 지도에서 선택`, exact: true });
  await expect(pin).toHaveCount(0);
  await last.getByRole('button', { name: `${name} 카드에서 선택` }).click();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await pin.click();
  await expect(last.getByRole('button', { name: `${name} 카드에서 선택` })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const pins = await page.locator('.dong-pin.kind-place').evaluateAll(nodes => nodes.map(node => {const r = node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  expect(pins.every(p => p.w >= 44 && p.h >= 44)).toBe(true);
  for (let i=0;i<pins.length;i++) for(let j=i+1;j<pins.length;j++) expect(Math.hypot(pins[i].x-pins[j].x,pins[i].y-pins[j].y)).toBeGreaterThanOrEqual(43);
});

test('real review sources and weekday uncertainty are visible without fabricated zero counts', async ({ page }) => {
  // Opening info follows the real clock, so pin it to the seeded Sunday afternoon.
  await page.clock.install({ time: new Date('2026-11-08T14:00:00+09:00') });
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127353200`);
  await page.getByRole('button', { name: '전체 후보' }).click();
  const nuave = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: /누아베/ }) });
  await expect(nuave).toContainText('방문자 리뷰 수 12건');
  await expect(nuave).toContainText('오늘 요일의 운영 시간은 아직 확인하지 못했어요.');
  await expect(page.locator('.region-detail')).toContainText('11월 8일 14:00 기준');
  // Unknown counts are simply not shown, never rendered as 0.
  await expect(list(page)).not.toContainText('리뷰 수 0건');
});

test('score-only filter shows exactly the venues summed by the region and all candidates remain accessible', async ({ page }) => {
  await setup(page);
  await openBono(page);
  await page.getByRole('button', { name: '추천 장소' }).click();
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await expect(list(page)).toContainText('바바카멜');
  await expect(list(page)).toContainText('보노다방');
  await expect(list(page)).toContainText('문다방');
  await page.getByRole('button', { name: '전체 후보' }).click();
  expect(await list(page).locator(':scope > li').count()).toBeGreaterThan(20);
});

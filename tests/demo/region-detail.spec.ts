import { test, expect } from './baseline';
import { base, setup, openBono, list } from './real';

test('20 actual cards and three marker pages share selection on a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  await openBono(page);
  const cards = list(page).locator(':scope > li');
  await expect(cards).toHaveCount(20);
  await expect(page.getByRole('navigation', { name: '지도 장소 페이지' })).toContainText('1 / 3');
  const last = cards.last();
  const name = (await last.getByRole('heading').innerText()).replace(/^20\. /, '');
  await last.getByRole('button', { name: `${name} 카드에서 선택` }).click();
  await expect(page.getByRole('navigation', { name: '지도 장소 페이지' })).toContainText('3 / 3');
  const pin = page.getByRole('button', { name: `${name} 지도에서 선택`, exact: true });
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await pin.click();
  await expect(last.getByRole('button', { name: `${name} 카드에서 선택` })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const pins = await page.locator('.dong-pin.kind-place').evaluateAll(nodes => nodes.map(node => {const r = node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  expect(pins.every(p => p.w >= 44 && p.h >= 44)).toBe(true);
  for (let i=0;i<pins.length;i++) for(let j=i+1;j<pins.length;j++) expect(Math.hypot(pins[i].x-pins[j].x,pins[i].y-pins[j].y)).toBeGreaterThanOrEqual(43);
});

test('real review sources and weekday uncertainty are visible without fabricated zero counts', async ({ page }) => {
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127353200`);
  await page.getByRole('button', { name: '전체 후보' }).click();
  const nuave = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: /누아베/ }) });
  await expect(nuave).toContainText('방문자 리뷰 수 12건');
  await expect(nuave).toContainText('선택한 요일의 운영정보 미확인');
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

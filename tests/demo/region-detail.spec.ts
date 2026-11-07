import { test, expect } from './baseline';
import { base, setup, openBono, list } from './real';
import fs from 'node:fs';

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

test('weekday uncertainty and place links remain visible without review counts', async ({ page }) => {
  // Opening info follows the real clock, so pin it to the seeded Sunday afternoon.
  await page.clock.install({ time: new Date('2026-11-08T14:00:00+09:00') });
  await setup(page);
  await page.goto(`${base}/#/region/dong-4127353200`);
  const nuave = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: /누아베/ }) });
  await expect(nuave.getByRole('link', { name: '네이버에서 장소 보기', exact: true })).toHaveAttribute('href', /^https:\/\/map.naver.com\//);
  await expect(nuave.getByLabel('누아베 오늘 운영시간', { exact: true })).toContainText('운영시간 미확인');
  await expect(page.locator('.region-detail')).toContainText('11월 8일 14:00 기준');
  await expect(list(page)).not.toContainText('리뷰');
});

test('region opens directly on its 20 recommendations without the removed filter widgets', async ({ page }) => {
  await setup(page);
  await openBono(page);
  await expect(list(page).locator(':scope > li')).toHaveCount(20);
  await expect(list(page)).toContainText('바바카멜');
  await expect(list(page)).toContainText('보노다방');
  await expect(list(page)).toContainText('문다방');
  await expect(page.getByRole('group', { name: '동네 안 장소 필터' })).toHaveCount(0);
  for (const name of ['발견할 20곳', '추천 장소', '가본 장소', '전체 후보']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  fs.mkdirSync('.claude/state/evidence/region-tabs-removed', { recursive: true });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.claude/state/evidence/region-tabs-removed/top-${width}.png` });
  }
});

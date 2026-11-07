import { test, expect } from './baseline';
import { base, setup, list } from './real';
import fs from 'node:fs';

test('existing shops show researched breaks, overnight hours and the fixed memory shop schedule', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T14:00:00+09:00') });
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  const examples = [
    { dong: 'dong-4127357000', name: '여우카츠', times: ['11:30–15:00', '17:00–21:00'], image: 'break-time' },
    { dong: 'dong-4127156000', name: '미스터꼼장어막창', times: ['00:00–03:00', '17:00–24:00'], image: 'overnight' },
    { dong: 'dong-4127152500', name: '초지참숯불갈비', times: ['13:00–22:00'], image: 'memory-shop' },
  ];
  const out = '.claude/state/evidence/opening-data';
  fs.mkdirSync(out, { recursive: true });
  for (const example of examples) {
    await page.goto(base + '/#/region/' + example.dong);
    await page.getByRole('button', { name: '전체 후보', exact: true }).click();
    const card = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: new RegExp('^\\d+\\. ' + example.name + '$') }) });
    const hours = card.getByLabel(example.name + ' 오늘 운영시간', { exact: true });
    for (const time of example.times) await expect(hours).toContainText(time);
    await expect(hours.locator('time')).toHaveAttribute('datetime', '2026-11-08');
    await expect(card.getByRole('button', { name: example.name + ' 방문 날짜 설정', exact: true })).toBeVisible();
    await card.screenshot({ path: `${out}/${example.image}.png` });
  }
});

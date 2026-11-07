import { test, expect } from './baseline';
import { base, setup, list, openVisit, closeVisit } from './real';
import fs from 'node:fs';

const out = '.claude/state/evidence/visit-dialog-hours';

test('name-side visit button opens a focused date editor; cancel and Escape preserve records on a 320px phone', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T14:00:00+09:00') });
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page, '2026-11-07T14:00');
  await page.goto(base + '/#/region/dong-4127154000');
  await expect(list(page).locator('input[type="date"]')).toHaveCount(0);
  const card = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: /^\d+\. 바바카멜$/ }) });
  const trigger = card.getByRole('button', { name: '바바카멜 방문 날짜 설정', exact: true });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(card.getByRole('button', { name: '바바카멜 지도에서 위치 보기' })).toBeVisible();
  fs.mkdirSync(out, { recursive: true });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const visit = await trigger.boundingBox();
    const map = await card.getByRole('button', { name: '바바카멜 지도에서 위치 보기' }).boundingBox();
    expect(visit).not.toBeNull(); expect(map).not.toBeNull();
    // Keep the visit and map actions on one row, including on narrow phones.
    expect(Math.abs(visit!.y - map!.y)).toBeLessThan(1);
    expect(map!.x).toBeGreaterThanOrEqual(visit!.x + visit!.width);
    expect(visit!.height).toBeGreaterThanOrEqual(44);
    expect(map!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.screenshot({ path: out + '/place-card-' + width + '.png' });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  const before = await page.evaluate(() => localStorage.getItem('ansan-explore/v1'));
  const panel = await openVisit(page, '바바카멜');
  await expect(panel.getByLabel('방문일', { exact: true })).toHaveValue('2026-11-08');
  await expect(panel.getByLabel('방문일', { exact: true })).toBeFocused();
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-06');
  await page.screenshot({ path: out + '/date-editor-320.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('ansan-explore/v1'))).toBe(before);
  await openVisit(page, '바바카멜');
  await expect(panel.getByLabel('방문일', { exact: true })).toHaveValue('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('방문 기록을 저장했어요.');
  await expect(panel.locator('time')).toHaveText('2026-11-08');
  await closeVisit(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('today’s actual schedule ignores saved search date and updates across midnight, closure and expiry', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-08T14:00:00+09:00') });
  await setup(page, '2026-11-10T14:00');
  await page.goto(base + '/#/region/dong-4127156000');
  const card = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: /^\d+\. 최용신기념관$/ }) });
  const hours = card.getByLabel('최용신기념관 오늘 운영시간', { exact: true });
  await expect(hours.locator('time')).toHaveAttribute('datetime', '2026-11-08');
  await expect(hours).toContainText('09:00–18:00');
  await expect(hours).toContainText('입장·주문 마감 17:30');
  await expect(card).toContainText('운영 중');
  fs.mkdirSync(out, { recursive: true });
  await card.screenshot({ path: out + '/today-hours.png' });
  await page.clock.fastForward('06:00:00');
  await expect(card).toContainText('휴무·이용 마감');
  await expect(hours).toContainText('09:00–18:00');
  await page.clock.fastForward('04:01:00');
  await expect(hours.locator('time')).toHaveAttribute('datetime', '2026-11-09');
  await expect(hours).toContainText('오늘 휴무');
  await expect(hours).not.toContainText('09:00');
  await page.clock.fastForward(6 * 24 * 60 * 60 * 1000);
  // Expired hours: explained once, conversationally, inside the today-hours box.
  await expect(hours).toContainText('운영 정보가 오래됐어요');
});

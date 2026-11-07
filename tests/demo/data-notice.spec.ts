import { test, expect } from './baseline';
import { setup } from './real';

test('latest floating notice design shows actual data and provisional scoring, with keyboard and phone access', async ({ page }) => {
  await setup(page);
  const chip = page.getByRole('button', { name: '데이터 안내', exact: true });
  const panel = page.getByRole('complementary', { name: '데이터와 점수 안내', exact: true });
  await expect(panel).toBeHidden();
  await chip.hover();
  await expect(panel).toContainText('네이버 검색 기준');
  await expect(panel).toContainText('운영시간이 미확인인 장소');
  await expect(panel).toContainText('방문 전 매장 정보를 확인');
  await chip.focus();
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await expect(panel).toBeHidden();
  await page.setViewportSize({ width: 320, height: 844 });
  await chip.click();
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText('가상 후보 25곳');
  await expect(panel.getByRole('button', { name: /추가 시연 장소/ })).toHaveCount(0);
  // Pressing inside keeps it open; pressing anywhere outside closes it.
  await panel.click();
  await expect(panel).toBeVisible();
  await page.getByRole('region', { name: '안산 탐험 지도' }).click({ position: { x: 10, y: 10 } });
  await expect(panel).toBeHidden();
  await expect(chip).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('on a touch phone, tapping outside closes the data notice', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await setup(page);
  const chip = page.getByRole('button', { name: '데이터 안내', exact: true });
  const panel = page.getByRole('complementary', { name: '데이터와 점수 안내', exact: true });
  await chip.tap();
  await expect(panel).toBeVisible();
  await page.getByRole('region', { name: '안산 탐험 지도' }).tap({ position: { x: 10, y: 10 } });
  await expect(panel).toBeHidden();
  await context.close();
});

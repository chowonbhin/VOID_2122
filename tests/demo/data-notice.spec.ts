import { test, expect } from './baseline';
import { setup } from './real';

test('latest floating notice design shows actual data and provisional scoring, with keyboard and phone access', async ({ page }) => {
  await setup(page);
  const chip = page.getByRole('button', { name: '데이터 안내', exact: true });
  const panel = page.getByRole('complementary', { name: '데이터와 점수 안내', exact: true });
  await expect(panel).toBeHidden();
  await chip.hover();
  await expect(panel).toContainText('2,329곳');
  await expect(panel).toContainText('추천에 표시한 20곳 모두');
  await expect(panel).toContainText('공개 2차 출처');
  await chip.focus();
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await expect(panel).toBeHidden();
  await page.setViewportSize({ width: 320, height: 844 });
  await chip.click();
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText('가상 후보 25곳');
  await expect(panel.getByRole('button', { name: /추가 시연 장소/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

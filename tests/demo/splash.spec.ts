import { test, expect } from '@playwright/test';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

test('launch splash shows the welcome copy for about 1.5 s, once per session', async ({ page }) => {
  await page.goto(base);
  const splash = page.getByRole('status', { name: '안산에 스며들다를 여는 중' });
  await expect(splash).toContainText('나의 발자국 사이로, 새로운 발견 하나.');
  const shownAt = Date.now();
  await expect(splash).toBeHidden({ timeout: 4000 });
  expect(Date.now() - shownAt).toBeGreaterThan(900);
  await page.reload();
  await expect(splash).toHaveCount(0);
});

test('tapping the splash skips it', async ({ page }) => {
  await page.goto(base);
  const splash = page.getByRole('status', { name: '안산에 스며들다를 여는 중' });
  await splash.click();
  await expect(splash).toHaveCount(0);
});

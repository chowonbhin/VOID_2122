// Exercise the shipped "추가 시연 장소 끄기" mode to retain the original policy regressions.
// Default-on demo data is covered by golden-path, demo-fill and onboarding specs.
import { test as base } from '@playwright/test';
export { expect, type Page } from '@playwright/test';
export const test = base.extend<{ baselineContent: void }>({
  baselineContent: [async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem('ansan-explore/demo-fill', 'off'));
    await use();
  }, { auto: true }],
});

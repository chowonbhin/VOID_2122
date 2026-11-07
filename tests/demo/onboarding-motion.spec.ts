import { test, expect, type Page } from '@playwright/test';
import { base } from './real';

const ready = async (page: Page) => expect(page.locator('.onboarding')).toHaveAttribute('aria-busy', 'false');

test('question transitions enter from the right, reverse on previous, and retain answers', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(base);
  await page.getByRole('radio', { name: /2년 이상/ }).click();
  await page.getByLabel(/지금 사는 동네/).selectOption({ label: '본오1동' });
  await page.getByRole('button', { name: '다음', exact: true }).click();
  // Inspect the real incoming animation while it runs; no clock or animation mocks.
  await expect.poll(() => page.locator('.onboarding-question').evaluate(node => node.getAnimations()
    .some(animation => (animation.effect as KeyframeEffect).getKeyframes()[0].transform === 'translateX(56px)'))).toBe(true);
  await ready(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByRole('group', { name: '가본 동네 카드' }).getByRole('button', { name: /여기 가봤어요/ }).first().click();
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await expect.poll(() => page.locator('.onboarding-question').evaluate(node => node.getAnimations()
    .some(animation => (animation.effect as KeyframeEffect).getKeyframes()[0].transform === 'translateX(-56px)'))).toBe(true);
  await ready(page);
  await expect(page.getByRole('radio', { name: /2년 이상/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel(/지금 사는 동네/)).toHaveValue('4127154000');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('group', { name: '가본 동네 카드' }).getByRole('button', { name: /여기 가봤어요/ }).first()).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced motion skips question effects and a failed save restores the faded screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  await page.getByRole('radio', { name: /6개월이 안 됐어요/ }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('어떤 활동을 좋아하나요?');
  expect(await page.locator('.onboarding-question').evaluate(node => node.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'ansan-explore/v1') throw new DOMException('Storage unavailable', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '탐험 시작', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('답변을 저장하지 못했어요');
  await ready(page);
  await expect(page.locator('.onboarding')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', { name: '탐험 시작', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '이전', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('radio', { name: /6개월이 안 됐어요/ })).toHaveAttribute('aria-checked', 'true');
});

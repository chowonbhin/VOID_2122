import { test, expect } from './baseline';
import fs from 'node:fs';
import { base, setup, list, openBono, openVisit, closeVisit } from './real';

const REGION = 'dong-4127152500';
const KEY = 'ansan-explore/sadong-memory-preview/v2';
const state = (page: import('@playwright/test').Page) => page.evaluate(() => localStorage.getItem('ansan-explore/v1'));

test('Sadong alone shows two real memory examples; selection, fixed examples, hide and reload never create visits or change scores', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  const originalState = await state(page);
  const scores = await page.locator('[data-region-id]').evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-region-id'), n.getAttribute('data-score')]));
  await page.goto(`${base}/#/region/${REGION}`);
  const memories = page.getByRole('region', { name: '이 동네의 추억', exact: true });
  const examples = memories.getByRole('list').getByRole('button');
  await expect(examples).toHaveCount(2);
  await expect(memories.getByText('추억 예시', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('link', { name: /추억 예시 네이버지도에서 보기 \(새 탭\)$/ })).toHaveCount(2);
  const assertPinSpacing = async () => {
    const pins = await page.locator('.dong-pin').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }));
    for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
      expect(Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y)).toBeGreaterThanOrEqual(44);
    }
  };
  await assertPinSpacing();
  const firstName = await examples.first().locator('strong').innerText();
  await examples.first().click();
  await expect(memories.locator('figure')).toContainText(firstName);
  const pin = page.getByRole('link', { name: `${firstName} 추억 예시 네이버지도에서 보기 (새 탭)`, exact: true });
  await expect(pin).toHaveAttribute('aria-current', 'location');
  const card = list(page).locator(':scope > li').filter({ has: page.getByRole('heading', { name: new RegExp(firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }) });
  await expect(card.getByRole('button', { name: `${firstName} 지도에서 위치 보기`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(card.getByRole('link', { name: '네이버에서 장소 보기', exact: true })).toHaveAttribute('href', /^https:\/\/map.naver.com\//);
  const originalIds = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).placeIds as string[], KEY);
  await page.reload();
  await expect(examples).toHaveCount(2);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).placeIds, KEY)).toEqual(originalIds);
  await expect(memories.getByRole('button', { name: '다른 예시 보기', exact: true })).toHaveCount(0);
  expect(new Set(originalIds)).toEqual(new Set(['naver-ae318ce3e729e02e81ef', 'naver-1d7e281c7c50afba23e0']));

  // Exercise the maximum marker density: eight ordinary places plus two hearts.
  await assertPinSpacing();
  // Walk every 8-place map group by choosing a card from each group.
  const cards = page.getByRole('list', { name: '행정동 장소 추천' }).locator(':scope > li');
  const total = await cards.count();
  for (let i = 8; i < total; i += 8) {
    await cards.nth(i).getByRole('button', { name: /지도에서 위치 보기$/ }).click();
    await assertPinSpacing();
  }

  const dir = process.env.EVIDENCE_DIR ?? '.claude/state/evidence/sadong-memory-preview';
  fs.mkdirSync(dir, { recursive: true });
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await map.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -90));
  await map.screenshot({ path: `${dir}/sadong-map.png` });
  await memories.screenshot({ path: `${dir}/sadong-memories.png` });
  await memories.getByRole('button', { name: '예시 숨기기', exact: true }).click();
  await expect(memories.getByRole('heading')).toHaveText('이 동네의 추억 0');
  await expect(page.getByRole('link', { name: /추억 예시 네이버지도에서 보기 \(새 탭\)$/ })).toHaveCount(0);
  await page.reload();
  await expect(memories.getByRole('heading')).toHaveText('이 동네의 추억 0');
  await memories.getByRole('button', { name: '예시 보기', exact: true }).click();
  await expect(examples).toHaveCount(2);
  expect(await state(page)).toBe(originalState);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await openBono(page);
  await expect(page.getByRole('heading', { name: '이 동네의 추억 0', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '다른 예시 보기', exact: true })).toHaveCount(0);
  await page.goto(`${base}/#/recommend`);
  expect(await page.locator('[data-region-id]').evaluateAll(nodes => nodes.map(n => [n.getAttribute('data-region-id'), n.getAttribute('data-score')]))).toEqual(scores);
});

test('a real visit to an example remains a real record after examples are hidden', async ({ page }) => {
  await setup(page);
  await page.goto(`${base}/#/region/${REGION}`);
  const memories = page.getByRole('region', { name: '이 동네의 추억', exact: true });
  const example = memories.getByRole('list').getByRole('button').first();
  const name = await example.locator('strong').innerText();
  await example.click();
  const panel = await openVisit(page, name);
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await closeVisit(page);
  await expect(memories.getByRole('list').getByRole('button').filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(1);
  await expect(memories).toContainText('2026년 11월 8일');
  const withVisit = await state(page);
  await memories.getByRole('button', { name: '예시 숨기기', exact: true }).click();
  await expect(memories.getByRole('heading')).toHaveText('이 동네의 추억 1');
  await expect(memories.getByRole('list')).toContainText(name);
  await page.reload();
  await expect(memories.getByRole('list')).toContainText(name);
  expect(await state(page)).toBe(withVisit);
});

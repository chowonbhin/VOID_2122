// Owner: chowonbhin. Real scoring with condition inputs; persisted visits are integration fixtures.
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const evidence = `.claude/state/evidence/recommend-${new Date().toISOString().replace(/[:.]/g, '-')}`;

async function setup(page: Page) {
  await page.goto(`${baseURL}/#/setup`);
  await page.getByLabel('출발지 이름').fill('시연 출발지 (가상)');
  await page.getByLabel('위도', { exact: true }).fill('37.3219');
  await page.getByLabel('경도', { exact: true }).fill('126.8309');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByLabel('최대 거리 (km)').fill('10');
}

const cards = (page: Page) => page.getByRole('list', { name: '추천 순위' }).getByRole('button');

test('신규 주민 순위와 점수 표시, 기존 주민 경험 변경으로 재계산', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(cards(page).first()).toHaveAccessibleName(/1순위 중앙동/);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/2순위 원곡동/);
  await expect(page.locator('.recommend')).not.toContainText('점수');
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(cards(page).first()).toHaveAccessibleName(/1순위 중앙동/);
  await expect(cards(page).first()).toContainText('친밀도 자주 가요');
  await page.reload();
  await expect(cards(page).first()).toHaveAccessibleName(/1순위 중앙동/);
});

test('관심 활동 필터와 직접 탐색, 최대 거리로 후보 없음 안내', async ({ page }) => {
  await setup(page);
  await page.getByLabel('자연·산책', { exact: true }).check();
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toHaveAccessibleName(/중앙동/);
  await expect(cards(page).first()).toContainText('추천 이유');
  const explore = page.getByRole('region', { name: '직접 탐색' });
  await expect(explore).toContainText('지금 시각·관심 활동에 맞는 장소가 없어요');
  await explore.getByRole('button', { name: /원곡동/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('원곡동');
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('최대 거리 (km)').fill('0.1');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('status')).toContainText('조건에 맞는 추천 행정동이 없어요');
  await expect(page.getByRole('list', { name: '추천 순위' })).toHaveCount(0);
  await expect(explore.getByRole('button')).toHaveCount(25);
  await expect(explore.getByRole('button').first()).toContainText('최대 거리 밖');
  await page.getByRole('button', { name: '조건 변경' }).click();
  await expect(page.getByLabel('최대 거리 (km)')).toHaveValue('0.1');
  await expect(page.getByLabel('자연·산책', { exact: true })).toBeChecked();
});

test('야간 운영 후보 없음과 모바일 화면', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(cards(page)).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/recommend-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T23:30');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('status')).toContainText('조건에 맞는 추천 행정동이 없어요');
  await expect(page.getByRole('region', { name: '직접 탐색' }).getByRole('button')).toHaveCount(25);
  await page.screenshot({ path: `${evidence}/empty-mobile.png`, fullPage: true });
  console.log(`recommend evidence: ${evidence}`);
});

test('저장된 방문 기록을 추천 계산에 전달하고 새로고침해도 유지', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(cards(page).first()).toHaveAccessibleName(/중앙동/);
  // Only seed a visit as the input fixture: visit-entry UI belongs to step 4's owner.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('ansan-explore/v1')!);
    state.visits = [{ id: 'fixture-visit', placeId: 'a1', date: '2026-11-08', method: 'self_report' }];
    localStorage.setItem('ansan-explore/v1', JSON.stringify(state));
  });
  await page.reload();
  await expect(cards(page).first()).toHaveAccessibleName(/중앙동/);
  await expect(cards(page).first()).toContainText('친밀도 가끔 가요');
  await page.reload();
  await expect(cards(page).first()).toHaveAccessibleName(/중앙동/);
});

test('저장된 조건 없이 추천 주소에 접근하면 설정으로 안내', async ({ page }) => {
  await page.goto(`${baseURL}/#/recommend`);
  await expect(page.getByText('먼저 탐험 조건을 입력해 주세요.')).toBeVisible();
  await page.getByRole('button', { name: '조건 설정' }).click();
  await expect(page.getByRole('heading', { name: '탐험 조건' })).toBeVisible();
});

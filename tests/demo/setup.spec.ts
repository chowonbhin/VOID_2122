// M02 input/storage behavior. Owner: chowonbhin. Scoring is not implemented yet.
import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test('조건 저장과 새로고침: 지역별 경험·관심·출발지·한국 시각을 유지한다', async ({ page }) => {
  await page.goto(`${baseURL}/#/setup`);
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('0');
  await expect(page.getByLabel('원곡동 익숙함')).toHaveValue('0');
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await page.getByLabel('자연·산책', { exact: true }).check();
  await page.getByLabel('출발지 이름').fill('직접 지정 출발지');
  await page.getByLabel('위도', { exact: true }).fill('37.3219');
  await page.getByLabel('경도', { exact: true }).fill('126.8309');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByLabel('최대 거리 (km)').fill('7.5');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '조건 변경' }).click();
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('2');
  await expect(page.getByLabel('원곡동 익숙함')).toHaveValue('0');
  await expect(page.getByLabel('자연·산책', { exact: true })).toBeChecked();
  await expect(page.getByLabel('출발지 이름')).toHaveValue('직접 지정 출발지');
  await expect(page.getByLabel('위도', { exact: true })).toHaveValue('37.3219');
  await expect(page.getByLabel('경도', { exact: true })).toHaveValue('126.8309');
  await expect(page.getByLabel('날짜·시각 (한국 시간)')).toHaveValue('2026-11-08T14:00');
  await expect(page.getByLabel('최대 거리 (km)')).toHaveValue('7.5');
});

test('입력 오류와 저장 실패는 추천 화면으로 이동하지 않는다', async ({ page }) => {
  await page.goto(`${baseURL}/#/setup`);
  await page.getByLabel('위도', { exact: true }).fill('91');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page).toHaveURL(/#\/setup$/);
  await page.getByLabel('위도', { exact: true }).fill('37');
  await page.getByLabel('출발지 이름').fill('   ');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('alert')).toContainText('출발지, 날짜·시각, 최대 거리');
  await page.getByLabel('출발지 이름').fill('보존할 출발지');
  // Failure injection checks error handling, never the golden-path result.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
  });
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('alert')).toContainText('조건을 저장하지 못했습니다');
  await expect(page).toHaveURL(/#\/setup$/);
  await expect(page.getByLabel('출발지 이름')).toHaveValue('보존할 출발지');
});

test('조건 변경은 기존 방문 기록과 행사 경험을 보존한다', async ({ page }) => {
  await page.goto(baseURL);
  const visits = [{ id: 'existing-visit', placeId: 'a1', date: '2026-11-07', method: 'self_report' }];
  await page.evaluate((records) => {
    localStorage.setItem('ansan-explore/v1', JSON.stringify({
      profile: { initialLevels: { 'dong-4127354500': 1 }, interests: [], experiencedEventIds: ['existing-event'] },
      visits: records, search: null,
    }));
  }, visits);
  await page.goto(`${baseURL}/#/setup`);
  await page.reload();
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.visits).toEqual(visits);
  expect(stored.profile.experiencedEventIds).toEqual(['existing-event']);
  expect(stored.profile.initialLevels).toEqual({ 'dong-4127353200': 2, 'dong-4127354500': 1 });
});

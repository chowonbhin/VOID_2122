// M02 input/storage behavior. Owner: chowonbhin. Scoring is not implemented yet.
import { test, expect } from './baseline';
import { DEMO_SEARCH, openSetup, setupStep, submitSetup } from './setupSteps';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test('조건 저장과 새로고침: 내 동네·지역별 경험·관심 활동을 유지하고 저장된 시각·거리는 그대로 둔다', async ({ page }) => {
  await openSetup(page, baseURL, { maxDistanceKm: 7.5 });
  await setupStep(page, '지역별 익숙함');
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('0');
  await expect(page.getByLabel('원곡동 익숙함')).toHaveValue('0');
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await setupStep(page, '관심 활동');
  await page.getByLabel('자연·산책', { exact: true }).check();
  await submitSetup(page);
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '조건 변경' }).click();
  await setupStep(page, '지역별 익숙함');
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('2');
  await expect(page.getByLabel('원곡동 익숙함')).toHaveValue('0');
  await setupStep(page, '관심 활동');
  await expect(page.getByLabel('자연·산책', { exact: true })).toBeChecked();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.search.when).toBe(DEMO_SEARCH.when);
  expect(stored.search.maxDistanceKm).toBe(7.5);
});

test('저장 실패는 추천 화면으로 이동하지 않는다', async ({ page }) => {
  await openSetup(page, baseURL);
  await setupStep(page, '지역별 익숙함');
  await page.getByLabel('중앙동 익숙함').selectOption('1');
  // Failure injection checks error handling, never the golden-path result.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
  });
  await submitSetup(page);
  await expect(page.getByRole('alert')).toContainText('조건을 저장하지 못했습니다');
  await expect(page).toHaveURL(/#\/setup$/);
  await setupStep(page, '지역별 익숙함');
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('1');
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
  await setupStep(page, '지역별 익숙함');
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await submitSetup(page);
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.visits).toEqual(visits);
  expect(stored.profile.experiencedEventIds).toEqual(['existing-event']);
  expect(stored.profile.initialLevels).toEqual({ 'dong-4127353200': 2, 'dong-4127354500': 1 });
});

test('조건은 내 동네·지역별 익숙함·관심 활동 3단계를 다음·이전으로 넘긴다', async ({ page }) => {
  await page.goto(`${baseURL}/#/setup`);
  const steps = page.getByRole('navigation', { name: '탐험 조건 단계' });
  await expect(steps).toContainText('1 / 3단계');
  await expect(steps.getByRole('button')).toHaveCount(3);
  await expect(steps.getByRole('button', { name: '내 동네', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByLabel('내 동네 선택')).toBeVisible();
  await expect(page.getByRole('button', { name: '추천 받기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '이전' })).toHaveCount(0);
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByLabel('중앙동 익숙함')).toBeVisible();
  await expect(page.getByLabel('내 동네 선택')).toHaveCount(0);
  await page.getByLabel('중앙동 익숙함').selectOption('1');
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByLabel('자연·산책', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '추천 받기' })).toBeVisible();
  await expect(page.getByLabel('출발지 이름')).toHaveCount(0);
  await expect(page.getByLabel('최대 거리 (km)')).toHaveCount(0);
  await page.getByRole('button', { name: '이전' }).click();
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('1');
});

test('출발지는 선택한 내 동네에서 시작한다', async ({ page }) => {
  await openSetup(page, baseURL);
  await setupStep(page, '내 동네');
  await page.getByLabel('내 동네 선택').selectOption({ label: '대부동' });
  await submitSetup(page);
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.profile.homeDongCode).toBe('4127361000');
  expect(stored.search.origin.lat).toBeLessThan(37.3);
  expect(stored.search.origin.lat).not.toBe(DEMO_SEARCH.origin.lat);
});

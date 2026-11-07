// M02 input/storage behavior. Owner: chowonbhin. Scoring is not implemented yet.
import { test, expect } from './baseline';
import { setupStep, submitSetup } from './setupSteps';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test('조건 저장과 새로고침: 지역별 경험·관심·출발지·한국 시각을 유지한다', async ({ page }) => {
  await page.goto(`${baseURL}/#/setup`);
  await setupStep(page, '지역별 익숙함');
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('0');
  await expect(page.getByLabel('원곡동 익숙함')).toHaveValue('0');
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await setupStep(page, '관심 활동');
  await page.getByLabel('자연·산책', { exact: true }).check();
  await setupStep(page, '출발지');
  await page.getByLabel('출발지 이름').fill('직접 지정 출발지');
  await page.getByLabel('위도', { exact: true }).fill('37.3219');
  await page.getByLabel('경도', { exact: true }).fill('126.8309');
  await setupStep(page, '외출 조건');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByLabel('최대 거리 (km)').fill('7.5');
  await submitSetup(page);
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '조건 변경' }).click();
  await setupStep(page, '지역별 익숙함');
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('2');
  await expect(page.getByLabel('원곡동 익숙함')).toHaveValue('0');
  await setupStep(page, '관심 활동');
  await expect(page.getByLabel('자연·산책', { exact: true })).toBeChecked();
  await setupStep(page, '출발지');
  await expect(page.getByLabel('출발지 이름')).toHaveValue('직접 지정 출발지');
  await expect(page.getByLabel('위도', { exact: true })).toHaveValue('37.3219');
  await expect(page.getByLabel('경도', { exact: true })).toHaveValue('126.8309');
  await setupStep(page, '외출 조건');
  await expect(page.getByLabel('날짜·시각 (한국 시간)')).toHaveValue('2026-11-08T14:00');
  await expect(page.getByLabel('최대 거리 (km)')).toHaveValue('7.5');
});

test('입력 오류와 저장 실패는 추천 화면으로 이동하지 않는다', async ({ page }) => {
  await page.goto(`${baseURL}/#/setup`);
  await setupStep(page, '출발지');
  await page.getByLabel('위도', { exact: true }).fill('91');
  await submitSetup(page);
  await expect(page).toHaveURL(/#\/setup$/);
  await setupStep(page, '출발지');
  await page.getByLabel('위도', { exact: true }).fill('37');
  await page.getByLabel('출발지 이름').fill('   ');
  await submitSetup(page);
  await expect(page.getByRole('alert')).toContainText('출발지, 날짜·시각, 최대 거리');
  await setupStep(page, '출발지');
  await page.getByLabel('출발지 이름').fill('보존할 출발지');
  // Failure injection checks error handling, never the golden-path result.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
  });
  await submitSetup(page);
  await expect(page.getByRole('alert')).toContainText('조건을 저장하지 못했습니다');
  await expect(page).toHaveURL(/#\/setup$/);
  await setupStep(page, '출발지');
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
  await setupStep(page, '지역별 익숙함');
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await submitSetup(page);
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.visits).toEqual(visits);
  expect(stored.profile.experiencedEventIds).toEqual(['existing-event']);
  expect(stored.profile.initialLevels).toEqual({ 'dong-4127353200': 2, 'dong-4127354500': 1 });
});

test('조건은 한 단계씩 다음·이전으로 넘기고, 출발지 오류는 그 단계에서 막는다', async ({ page }) => {
  await page.goto(`${baseURL}/#/setup`);
  const steps = page.getByRole('navigation', { name: '탐험 조건 단계' });
  await expect(steps).toContainText('1 / 5단계');
  await expect(steps.getByRole('button', { name: '내 동네', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByLabel('내 동네 선택')).toBeVisible();
  await expect(page.getByRole('button', { name: '추천 받기' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '이전' })).toHaveCount(0);
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByLabel('중앙동 익숙함')).toBeVisible();
  await expect(page.getByLabel('내 동네 선택')).toHaveCount(0);
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByLabel('자연·산책', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByLabel('위도', { exact: true }).fill('91');
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('alert')).toContainText('출발지');
  await expect(steps).toContainText('4 / 5단계');
  await page.getByLabel('위도', { exact: true }).fill('37.3219');
  await page.getByLabel('위도', { exact: true }).press('Enter');
  await expect(page.getByLabel('최대 거리 (km)')).toBeVisible();
  await expect(page.getByRole('button', { name: '추천 받기' })).toBeVisible();
  await page.getByRole('button', { name: '이전' }).click();
  await expect(page.getByLabel('위도', { exact: true })).toHaveValue('37.3219');
});

test('출발지는 지도를 끌어 가운데 핀으로 정하고 좌표·이름이 함께 바뀐다', async ({ page }) => {
  await page.goto(`${baseURL}/#/setup`);
  await setupStep(page, '출발지');
  const map = page.getByRole('application', { name: /출발지 지도/ });
  await expect(map).toBeVisible();
  const before = await page.getByLabel('경도', { exact: true }).inputValue();
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const after = Number(await page.getByLabel('경도', { exact: true }).inputValue());
  expect(after).toBeGreaterThan(Number(before));
  await expect(page.getByLabel('출발지 이름')).toHaveValue(/지도 선택 지점|지도에서 고른 출발지/);
  await map.focus();
  await page.keyboard.press('ArrowUp');
  expect(Number(await page.getByLabel('위도', { exact: true }).inputValue())).toBeGreaterThan(0);
  await expect(page.locator('#origin-map-status')).toContainText('핀 위치');
  await submitSetup(page);
  await expect(page.getByRole('heading', { name: '추천 행정동', level: 1 })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.search.origin.lng).toBeCloseTo(after, 3);
});

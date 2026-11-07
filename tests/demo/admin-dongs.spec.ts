import { test, expect, type Page } from '@playwright/test';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3002';
async function setup(page: Page) {
  await page.goto(`${base}/#/setup`);
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByLabel('최대 거리 (km)').fill('100');
  await page.getByRole('button', { name: '추천 받기' }).click();
}

test('all 25 dongs are reachable, including unresearched dongs; urban/island slides and keyboard selection work', async ({ page }) => {
  await setup(page);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.locator('[data-region-id]')).toHaveCount(25);
  await expect(map.locator('.dong-directory button')).toHaveCount(25);
  await expect(page.getByRole('list', { name: '추천 순위' }).getByRole('button')).toHaveCount(3);
  await expect(map.getByRole('button', { name: /^지도 부곡동/ })).toHaveAccessibleName(/장소 준비 중/);
  await expect(map.getByRole('button', { name: /^지도 대부동/ })).toHaveCount(0);
  await map.getByRole('button', { name: '대부도 →', exact: true }).click();
  await expect(map.getByRole('button', { name: /^지도 대부동/ })).toBeVisible();
  await expect(map.getByRole('button', { name: /^지도 중앙동/ })).toHaveCount(0);
  await map.getByRole('button', { name: /^지도 대부동/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('대부동');
  await expect(page.getByText('데이터 준비 중 · 비프랜차이즈로 확인된 실제 장소를 조사한 뒤 반영합니다.')).toBeVisible();
  await expect(page.getByRole('list', { name: '행정동 장소 추천' }).locator(':scope > li')).toHaveCount(0);
  await page.screenshot({ path: '.claude/state/evidence/admin-dongs/empty-dong.png', fullPage: true });
});

test('real venue supports visits but cannot be scored without measured popularity; expired hours remain unknown', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: /^지도 일동 ·/ }).click();
  const list = page.getByRole('list', { name: '행정동 장소 추천' });
  await expect(list.locator(':scope > li')).toHaveCount(1);
  await expect(list).toContainText('성호박물관');
  await expect(list).toContainText('운영 중');
  await expect(list).toContainText('실제 조사 장소');
  await expect(list).toContainText('방문·리뷰 수 확인 필요');
  await expect(list).toContainText('현재 추천 점수에서 제외됩니다.');
  await expect(list).toContainText('비프랜차이즈 확인');
  await expect(list).toContainText('시연값');
  await expect(list.getByRole('link', { name: '성호박물관 공식 관람안내' })).toHaveAttribute('href', 'https://www.ansan.go.kr/seongho/main/main.do');
  const panel = page.getByRole('region', { name: '성호박물관 방문 기록', exact: true });
  await panel.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await panel.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(panel.getByText('지역 Lv.1', { exact: true })).toBeVisible();
  await page.reload();
  await expect(panel.locator('time')).toHaveText('2026-11-08');
  await page.screenshot({ path: '.claude/state/evidence/admin-dongs/real-place.png', fullPage: true });
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  await page.getByRole('button', { name: '조건 변경' }).click();
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-14T14:00');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await expect(page.getByRole('button', { name: /^지도 일동 ·/ })).not.toHaveAccessibleName(/오늘의 추천/);
  await page.getByRole('button', { name: /^지도 일동 ·/ }).click();
  await expect(list).toContainText('운영정보 미확인');
  await expect(list).toContainText('운영정보 검토 기간 밖');
});

test('old records survive migration and update the actual dong; level review is explicit', async ({ page }) => {
  await page.goto(base);
  await page.evaluate(() => localStorage.setItem('ansan-explore/v1', JSON.stringify({
    profile: { initialLevels: { 'region-a': 2, 'region-b': 2 }, interests: [], experiencedEventIds: ['e-b1-market'] },
    visits: [{ id: 'old-b3', placeId: 'b3', date: '2026-11-07', method: 'self_report' }], search: null,
  })));
  await page.goto(`${base}/#/setup`);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('기존 방문 기록은 유지');
  await expect(page.getByLabel('중앙동 익숙함')).toHaveValue('0');
  await expect(page.getByLabel('원곡동 익숙함')).toHaveValue('0');
  await page.getByLabel('중앙동 익숙함').selectOption('2');
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByRole('button', { name: '추천 받기' }).click();
  await page.getByRole('button', { name: /^지도 신길동/ }).click();
  const panel = page.getByRole('region', { name: '시연 공방 방문 기록', exact: true });
  await expect(panel.locator('time')).toHaveText('2026-11-07');
  await expect(panel.getByText('지역 Lv.1', { exact: true })).toBeVisible();
  await page.goto(`${base}/#/region/region-b`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('원곡동');
  await expect(page.getByRole('list', { name: '행정동 장소 추천' })).not.toContainText('시연 공방');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.visits[0].id).toBe('old-b3');
  expect(stored.legacyInitialLevels).toEqual({ 'region-a': 2, 'region-b': 2 });
  expect(stored.profile.experiencedEventIds).toEqual(['e-b1-market']);
  expect(stored.needsDongLevelReview).toBe(false);
});

test('25-dong map and directory fit a 320px phone, and every directory target stays usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await setup(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await map.screenshot({ path: '.claude/state/evidence/admin-dongs/map-320.png' });
  await map.locator('.dong-directory').getByRole('button', { name: /본오3동/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('본오3동');
  await expect(page.getByRole('list', { name: '행정동 장소 추천' })).toContainText('최용신기념관');
  await page.screenshot({ path: '.claude/state/evidence/admin-dongs/real-place-320.png', fullPage: true });
});


test('home dong survives reload, opens island memories, and samples never change scores or visits', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`${base}/#/setup`);
  await page.getByLabel('내 동네 선택').selectOption({ label: '대부동' });
  await page.getByLabel('날짜·시각 (한국 시간)').fill('2026-11-08T14:00');
  await page.getByRole('button', { name: '추천 받기' }).click();
  const ranking = page.getByRole('list', { name: '추천 순위' });
  const before = await ranking.innerText();
  const map = page.getByRole('region', { name: '안산 탐험 지도' });
  await expect(map.getByRole('img', { name: '내 동네 · 대부동' })).toBeVisible();
  await expect(map.getByRole('button', { name: /^지도 대부동/ })).toBeVisible();
  await page.reload();
  // 내 동네 is hatched, not pinned. The MultiPolygon bounding-box centre is sea, so open it by keyboard.
  await expect(map.getByRole('img', { name: '내 동네 · 대부동' })).toHaveCount(1);
  await map.getByRole('button', { name: /^지도 대부동/ }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '대부도 해솔길 바다 추억 보기', exact: true }).click();
  await expect(page.getByText(/구봉도 낙조가 최고/)).toBeVisible();
  await expect(page.getByText(/시연용 추억 예시/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '가까운 탐험 동네' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.claude/state/evidence/admin-dongs/home-memory-320.png', fullPage: true });
  await page.getByRole('button', { name: '추천으로 돌아가기' }).click();
  expect(await ranking.innerText()).toBe(before);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ansan-explore/v1')!));
  expect(stored.profile.homeDongCode).toBe('4127361000');
  expect(stored.visits).toEqual([]);
});

test('legacy dong URLs and home codes resolve to current dong details', async ({ page }) => {
  await page.goto(base);
  await page.evaluate(() => localStorage.setItem('ansan-explore/v1', JSON.stringify({
    profile: { initialLevels: {}, interests: [], experiencedEventIds: [], homeDongCode: '3109273' }, visits: [], search: null,
  })));
  await page.goto(`${base}/#/setup`);
  await page.reload();
  await expect(page.getByLabel('내 동네 선택')).toHaveValue('4127353500');
  await page.goto(`${base}/#/dong/3109273`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('호수동');
  await expect(page.getByRole('img', { name: '내 동네 · 호수동' })).toBeVisible();
  await page.getByRole('button', { name: '호수공원 노을 산책 추억 보기', exact: true }).click();
  await expect(page.getByText(/다음엔 돗자리 챙기기/)).toBeVisible();
});

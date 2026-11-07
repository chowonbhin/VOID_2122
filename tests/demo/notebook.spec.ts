import { test, expect } from './baseline';
import fs from 'node:fs';
import { base, setup, openVisit, closeVisit } from './real';

const out = '.claude/state/evidence/notebook-design';
const currentState = (page: import('@playwright/test').Page) => page.evaluate(() => localStorage.getItem('ansan-explore/v1'));

test('menu separates notebook and settings; closes outside and with Escape', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await currentState(page);
  const menu = page.getByRole('button', { name: '메뉴', exact: true });
  await expect(page.getByRole('button', { name: '다시 설정하기', exact: true })).toHaveCount(0);
  await menu.click();
  const panel = page.getByRole('navigation', { name: '내 탐험 메뉴' });
  await expect(panel.getByRole('link', { name: /나의 동네수첩/ })).toHaveAttribute('href', '#/notebook');
  await expect(panel.getByRole('link', { name: /다시 설정하기/ })).toHaveAttribute('href', '#/onboarding');
  fs.mkdirSync(out, { recursive: true });
  await page.screenshot({ path: out + '/menu-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(panel).toBeHidden();
  await menu.click();
  await page.getByRole('region', { name: '안산 탐험 지도' }).click({ position: { x: 10, y: 10 } });
  await expect(panel).toBeHidden();
  await menu.click();
  await panel.getByRole('link', { name: /나의 동네수첩/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('나의 동네수첩');
  await expect(panel).toBeHidden();
  expect(await currentState(page)).toBe(before);
  await menu.click();
  await panel.getByRole('link', { name: /다시 설정하기/ }).click();
  await expect(page.getByRole('radio', { name: /6개월이 안 됐어요/ })).toBeVisible();
  expect(await currentState(page)).toBe(before);
});

test('fixed actual storefronts render on desktop and phones; canceling the photo editor changes no records', async ({ page }) => {
  await setup(page);
  const before = await currentState(page);
  await page.goto(base + '/#/notebook');
  const gallery = page.getByRole('list', { name: '동네수첩 사진' });
  await expect(gallery.getByRole('img')).toHaveCount(2);
  await expect(gallery).toContainText('도니스커피');
  await expect(gallery).toContainText('초지참숯불갈비');
  await expect(page.locator('.notebook-end')).toHaveText('안산에서, 한 장씩.');
  await expect(page.locator('.notebook-end')).not.toContainText('✳');
  fs.mkdirSync(out, { recursive: true });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => gallery.getByRole('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: out + '/gallery-' + width + '.png', fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await gallery.getByRole('button', { name: '도니스커피 추억 보기', exact: true }).click();
  const lightbox = page.getByRole('dialog', { name: '도니스커피', exact: true });
  await expect(lightbox.getByRole('img')).toBeVisible();
  await expect(lightbox.getByRole('link', { name: /함께할개/ })).toHaveAttribute('href', /45002/);
  await page.screenshot({ path: out + '/photo-detail.png' });
  await page.keyboard.press('Escape');
  await expect(lightbox).toHaveCount(0);
  await expect(gallery.getByRole('button', { name: '도니스커피 추억 보기', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '방문한 곳', exact: true }).click();
  await expect(page.getByText('아직 남긴 발걸음이 없어요', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '사진 남기기', exact: true }).click();
  const draft = page.getByRole('dialog', { name: '한 장의 추억 남기기', exact: true });
  await expect(draft.getByRole('button', { name: '추억 저장하기', exact: true })).toBeDisabled();
  await expect(draft).toContainText('이 브라우저에 저장돼요');
  await page.screenshot({ path: out + '/photo-draft.png' });
  await draft.getByLabel('추억 사진 선택', { exact: true }).setInputFiles('public/memories/donis-storefront.jpg');
  await expect(draft.getByRole('img', { name: '선택한 사진 미리보기', exact: true })).toBeVisible();
  await expect(draft.getByRole('button', { name: '추억 저장하기', exact: true })).toBeEnabled();
  await draft.getByRole('button', { name: '닫기', exact: true }).click();
  expect(await currentState(page)).toBe(before);
});

const DONIS = 'naver-ae318ce3e729e02e81ef';
async function addPhoto(page: import('@playwright/test').Page, memo: string, date = '2026-11-08') {
  await page.getByRole('button', { name: '사진 남기기', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '한 장의 추억 남기기', exact: true });
  await editor.getByLabel('추억 사진 선택', { exact: true }).setInputFiles('public/memories/donis-storefront.jpg');
  await editor.getByLabel('장소', { exact: true }).selectOption(DONIS);
  await editor.getByLabel('기억할 날짜', { exact: true }).fill(date);
  await editor.getByLabel('짧은 메모').fill(memo);
  await editor.getByRole('button', { name: '추억 저장하기', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('사진과 메모를 수첩에 저장했어요.');
}

test('saved photos and notes survive reload; multiple photos, sources and deletion preserve visits and scores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await setup(page);
  await page.goto(base + '/#/region/dong-4127152500');
  await page.getByRole('region', { name: '이 동네의 추억', exact: true }).getByRole('button', { name: /도니스커피/ }).click();
  const visits = await openVisit(page, '도니스커피');
  await visits.getByLabel('방문일', { exact: true }).fill('2026-11-08');
  await visits.getByRole('button', { name: '방문 기록', exact: true }).click();
  await expect(visits.getByRole('status')).toHaveText('방문 기록을 저장했어요.');
  await closeVisit(page);
  const before = await currentState(page);
  await page.goto(base + '/#/recommend');
  const scores = await page.locator('[data-region-id]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-score')));
  await page.goto(base + '/#/notebook');
  await addPhoto(page, '따뜻한 커피와 함께한 오후');
  const card = page.getByRole('button', { name: '도니스커피 추억 보기', exact: true });
  await expect(card).toContainText('내 사진 1장');
  await expect(card).toContainText('따뜻한 커피와 함께한 오후');
  await addPhoto(page, '비가 오던 날의 커피', '2026-11-07');
  await page.reload();
  await expect(card).toContainText('내 사진 2장');
  await expect.poll(() => card.getByRole('img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '방문한 곳', exact: true }).click();
  await expect(card).toBeVisible();
  await page.screenshot({ path: out + '/saved-gallery-mobile.png', fullPage: true });
  await card.click();
  const album = page.getByRole('dialog', { name: '도니스커피', exact: true });
  await expect(album).toContainText('따뜻한 커피와 함께한 오후');
  await expect.poll(() => album.locator('.notebook-lightbox-image').evaluate(async image =>
    (await (await fetch((image as HTMLImageElement).src)).blob()).size)).toBe(fs.statSync('public/memories/donis-storefront.jpg').size);
  await expect(album.getByRole('button', { name: '내 사진 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await album.getByRole('button', { name: '내 사진 2', exact: true }).click();
  await expect(album).toContainText('비가 오던 날의 커피');
  await expect(album.locator('.notebook-lightbox-image')).toHaveAttribute('alt', '2026. 11. 07에 남긴 추억 사진');
  await page.screenshot({ path: out + '/saved-detail-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await album.getByRole('button', { name: '간판 예시', exact: true }).click();
  await expect(album.getByRole('link', { name: /함께할개/ })).toBeVisible();
  await expect(album.getByRole('button', { name: '이 사진 삭제', exact: true })).toHaveCount(0);
  await album.getByRole('button', { name: '내 사진 2', exact: true }).click();
  await album.getByRole('button', { name: '이 사진 삭제', exact: true }).click();
  await album.getByRole('button', { name: '취소', exact: true }).click();
  await expect(album).toContainText('비가 오던 날의 커피');
  await album.getByRole('button', { name: '이 사진 삭제', exact: true }).click();
  await album.getByRole('button', { name: '삭제하기', exact: true }).click();
  await expect(album).toContainText('따뜻한 커피와 함께한 오후');
  await expect(album.getByRole('button', { name: '내 사진 2', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(card).toContainText('내 사진 1장');
  await card.click();
  await album.getByRole('button', { name: '이 사진 삭제', exact: true }).click();
  await album.getByRole('button', { name: '삭제하기', exact: true }).click();
  await expect(album.getByRole('link', { name: /함께할개/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(card).toContainText('간판 사진 예시');
  expect(await currentState(page)).toBe(before);
  await page.goto(base + '/#/recommend');
  expect(await page.locator('[data-region-id]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-score')))).toEqual(scores);
  expect(errors).toEqual([]);
});

test('invalid image files cannot be saved', async ({ page }) => {
  await setup(page);
  await page.goto(base + '/#/notebook');
  await page.getByRole('button', { name: '사진 남기기', exact: true }).click();
  const editor = page.getByRole('dialog');
  const input = editor.getByLabel('추억 사진 선택', { exact: true });
  await input.setInputFiles({ name: 'not-a-photo.txt', mimeType: 'text/plain', buffer: Buffer.from('text') });
  await expect(editor.getByRole('alert')).toContainText('10MB 이하');
  await expect(editor.getByRole('button', { name: '추억 저장하기', exact: true })).toBeDisabled();
  await input.setInputFiles({ name: 'too-large.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(editor.getByRole('alert')).toContainText('10MB 이하');
  await expect(editor.getByRole('button', { name: '추억 저장하기', exact: true })).toBeDisabled();
  await input.setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') });
  await expect(editor.getByRole('alert')).toContainText('사진을 읽을 수 없어요');
  await expect(editor.getByRole('button', { name: '추억 저장하기', exact: true })).toBeDisabled();
});

test('quota failure rolls back metadata and original together and allows retry', async ({ page }) => {
  await setup(page);
  await page.goto(base + '/#/notebook');
  await page.getByRole('button', { name: '사진 남기기', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('추억 사진 선택', { exact: true }).setInputFiles('public/memories/donis-storefront.jpg');
  await editor.getByLabel('짧은 메모').fill('실패 후에도 입력 유지');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(...args) {
      if (this.name === 'images') {
        IDBObjectStore.prototype.add = original;
        throw new DOMException('Test storage full', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await editor.getByRole('button', { name: '추억 저장하기', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('저장 공간이 부족');
  await expect(editor.getByLabel('짧은 메모')).toHaveValue('실패 후에도 입력 유지');
  expect(await page.evaluate(() => new Promise<number[]>((resolve, reject) => {
    const open = indexedDB.open('ansan-explore/notebook/v1');
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(['photos', 'images'], 'readonly');
      const photos = tx.objectStore('photos').count();
      const images = tx.objectStore('images').count();
      tx.oncomplete = () => { db.close(); resolve([photos.result, images.result]); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
    open.onerror = () => reject(open.error);
  }))).toEqual([0, 0]);
  await editor.getByRole('button', { name: '추억 저장하기', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('list', { name: '동네수첩 사진' })).toContainText('내 사진 1장');
});

test('storage access failure is explicit and leaves real example photos available', async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', {
    get() { throw new DOMException('Test access denied', 'SecurityError'); }, configurable: true,
  }));
  await page.goto(base + '/#/notebook');
  // A hash navigation keeps the current document; reload to install the denied-storage environment.
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('사진 저장소를 사용할 수 없어요');
  await expect(page.getByRole('button', { name: '사진 남기기', exact: true })).toBeDisabled();
  await expect(page.getByRole('list', { name: '동네수첩 사진' }).getByRole('img')).toHaveCount(2);
  await page.getByRole('button', { name: '다시 불러오기', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('legacy random examples migrate to the two fixed storefronts without changing visits', async ({ page }) => {
  await setup(page);
  const before = await currentState(page);
  await page.evaluate(() => localStorage.setItem('ansan-explore/sadong-memory-preview/v1',
    JSON.stringify({ enabled: false, placeIds: ['old-random-place'] })));
  await page.goto(base + '/#/region/dong-4127152500');
  const memories = page.getByRole('region', { name: '이 동네의 추억', exact: true });
  await expect(memories.getByRole('heading')).toHaveText('이 동네의 추억 0');
  await memories.getByRole('button', { name: '예시 보기', exact: true }).click();
  await expect(memories.getByRole('list')).toContainText('도니스커피');
  await expect(memories.getByRole('list')).toContainText('초지참숯불갈비');
  await expect(memories.getByRole('button', { name: '다른 예시 보기', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(memories.getByRole('list')).toContainText('도니스커피');
  expect(await currentState(page)).toBe(before);
});

/** Photos stay in this browser. Keep original blobs out of app state and gallery reads. */
export interface NotebookPhoto {
  id: string;
  placeId: string;
  date: string;
  memo: string;
  createdAt: string;
  thumbnail: Blob;
}

const DATABASE = 'ansan-explore/notebook/v1';
const META = 'photos';
const IMAGES = 'images';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(META, { keyPath: 'id' });
      request.result.createObjectStore(IMAGES);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('사진 수첩을 열 수 없어요. 다른 탭을 닫고 다시 시도해 주세요.')); };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transaction<T>(stores: string[], mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => () => T): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction | undefined;
    try {
      tx = db.transaction(stores, mode);
      tx.oncomplete = () => { db.close(); resolve(result()); };
      tx.onabort = () => { db.close(); reject(tx?.error ?? new Error('사진 저장소 작업이 중단됐어요.')); };
      const result = run(tx);
    } catch (error) { tx?.abort(); db.close(); reject(error); }
  });
}

export function listPhotos(): Promise<NotebookPhoto[]> {
  return transaction([META], 'readonly', tx => {
    const request = tx.objectStore(META).getAll();
    return () => request.result as NotebookPhoto[];
  });
}

export function readPhoto(id: string): Promise<Blob | undefined> {
  return transaction([IMAGES], 'readonly', tx => {
    const request = tx.objectStore(IMAGES).get(id);
    return () => request.result as Blob | undefined;
  });
}

export function photoFileError(file: File): string | null {
  return !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024
    ? '10MB 이하의 JPG, PNG, WebP 사진을 골라주세요.' : null;
}

async function thumbnail(file: File): Promise<Blob> {
  const error = photoFileError(file);
  if (error) throw new Error(error);
  let image: ImageBitmap;
  try { image = await createImageBitmap(file); }
  catch { throw new Error('사진을 읽을 수 없어요. 다른 사진을 골라주세요.'); }
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 640 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진 미리보기를 만들 수 없어요.');
    // A stable paper backing keeps transparent uploads identical across themes.
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-photo-paper').trim();
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('사진 미리보기를 만들 수 없어요.')), 'image/jpeg', .82));
  } finally { image.close(); }
}

export async function savePhoto(input: { file: File; placeId: string; date: string; memo: string }): Promise<NotebookPhoto> {
  const photo: NotebookPhoto = {
    id: crypto.randomUUID(), placeId: input.placeId, date: input.date,
    memo: input.memo.trim().slice(0, 300), createdAt: new Date().toISOString(), thumbnail: await thumbnail(input.file),
  };
  // Both records commit together; a quota error must never leave a partial photo.
  return transaction([META, IMAGES], 'readwrite', tx => {
    tx.objectStore(META).add(photo);
    tx.objectStore(IMAGES).add(input.file, photo.id);
    return () => photo;
  });
}

export function deletePhoto(id: string): Promise<void> {
  return transaction([META, IMAGES], 'readwrite', tx => {
    tx.objectStore(META).delete(id);
    tx.objectStore(IMAGES).delete(id);
    return () => undefined;
  });
}

export function photoStorageError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return '브라우저 저장 공간이 부족해요. 필요 없는 사진을 삭제하거나 더 작은 사진을 골라주세요.';
  }
  return error instanceof Error && !(error instanceof DOMException)
    ? error.message : '사진 저장소를 사용할 수 없어요. 브라우저의 저장 공간과 설정을 확인하고 다시 시도해 주세요.';
}

import type { Visit } from '../../domain/types';

// Visits keep the shared contract: { id, placeId, date: YYYY-MM-DD, method: 'self_report' }.
// These functions only change visit records. Region/place Lv and recommendation scoring
// belong to the shared domain module, rather than a second implementation in this feature.
export type VisitRecordError = 'invalid-date' | 'duplicate' | 'not-found' | 'duplicate-id';
export type VisitRecordResult =
  | { ok: true; visits: Visit[] }
  | { ok: false; error: VisitRecordError };

export const VISIT_ERROR_MESSAGES: Record<VisitRecordError, string> = {
  'invalid-date': '올바른 방문일을 선택해 주세요.',
  duplicate: '이 장소의 같은 날짜 방문 기록이 이미 있어요.',
  'not-found': '방문 기록을 찾을 수 없어요. 새로고침 후 다시 확인해 주세요.',
  'duplicate-id': '이미 처리된 기록이에요. 새로고침 후 다시 확인해 주세요.',
};

/** Validate the calendar date without changing it for the browser's time zone. */
export function isVisitDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function addVisitRecord(visits: readonly Visit[], visit: Visit): VisitRecordResult {
  if (!isVisitDate(visit.date)) return { ok: false, error: 'invalid-date' };
  if (visits.some((item) => item.placeId === visit.placeId && item.date === visit.date)) {
    return { ok: false, error: 'duplicate' };
  }
  if (visits.some((item) => item.id === visit.id)) return { ok: false, error: 'duplicate-id' };
  return { ok: true, visits: [...visits, visit] };
}

export function changeVisitDate(visits: readonly Visit[], id: string, date: string): VisitRecordResult {
  if (!isVisitDate(date)) return { ok: false, error: 'invalid-date' };
  const visit = visits.find((item) => item.id === id);
  if (!visit) return { ok: false, error: 'not-found' };
  if (visits.some((item) => item.id !== id && item.placeId === visit.placeId && item.date === date)) {
    return { ok: false, error: 'duplicate' };
  }
  return { ok: true, visits: visits.map((item) => (item.id === id ? { ...item, date } : item)) };
}

export function deleteVisitRecord(visits: readonly Visit[], id: string): VisitRecordResult {
  if (!visits.some((item) => item.id === id)) return { ok: false, error: 'not-found' };
  return { ok: true, visits: visits.filter((item) => item.id !== id) };
}

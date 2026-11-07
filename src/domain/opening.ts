import type { OpeningInfo, TimeRange } from './types';

export type DailyOpening =
  | { status: 'known'; ranges: TimeRange[]; note?: string }
  | { status: 'unknown'; note: string };

/** The schedule for a Korean calendar date, independent of the viewer's time zone. */
export function openingOnDate(opening: OpeningInfo, date: string): DailyOpening {
  if (opening.status !== 'known' || !opening.weekly) return { status: 'unknown', note: '운영정보 미확인' };
  if (opening.verifiedPeriod && (date < opening.verifiedPeriod.from || date > opening.verifiedPeriod.through)) {
    return { status: 'unknown', note: '운영정보 검토 기간 밖 · 공식 안내 재확인 필요' };
  }
  const day = new Date(`${date}T00:00:00Z`).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const exception = opening.exceptions?.find(item => item.date === date);
  if (!exception && opening.unknownDays?.includes(day)) return { status: 'unknown', note: '선택한 요일의 운영정보 미확인' };
  return { status: 'known', ranges: exception ? exception.ranges : opening.weekly[day] ?? [], note: exception?.note };
}

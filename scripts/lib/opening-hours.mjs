// Convert published business-day schedules to Korean calendar-day intervals.
// Missing days remain unknown. Never infer daily opening from an unlabelled time.
const labels = ['일', '월', '화', '수', '목', '금', '토'];
const minute = value => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value ?? '')) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};
const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

function interval(start, end, nextStart = false, nextEnd = false) {
  let a = minute(start), b = minute(end);
  if (a === null || b === null) return null;
  if (nextStart) a += 1440;
  if (nextEnd || b < a) b += 1440;
  return a < b && b <= 2880 ? [a, b] : null;
}

function subtract(ranges, breaks) {
  return breaks.reduce((all, [a, b]) => all.flatMap(([start, end]) => {
    if (b <= start || a >= end) return [[start, end]];
    return [...(start < a ? [[start, a]] : []), ...(b < end ? [[b, end]] : [])];
  }), ranges);
}

export function calendarOpening(days) {
  const weekly = {}, unknownDays = [];
  const overnight = days.some(ranges => ranges?.some(([, end]) => end > 1440));
  for (let day = 0; day < 7; day++) {
    const current = days[day], previous = days[(day + 6) % 7];
    // For overnight schedules an unknown previous day also leaves today's early hours unknown.
    if (!current || (overnight && !previous)) { unknownDays.push(day); continue; }
    const ranges = [...current.map(([a, b]) => [a, Math.min(b, 1440)]),
      ...(previous ?? []).filter(([, b]) => b > 1440).map(([a, b]) => [Math.max(a - 1440, 0), b - 1440])]
      .filter(([a, b]) => a < b && a < 1440).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const range of ranges) {
      const last = merged.at(-1);
      if (last && last[1] >= range[0]) last[1] = Math.max(last[1], range[1]);
      else merged.push([...range]);
    }
    weekly[day] = merged.map(([a, b]) => ({ open: clock(a), close: clock(b) }));
  }
  return { status: Object.keys(weekly).length ? 'known' : 'unknown', weekly, unknownDays };
}

export function openingFromWeeklyText(hoursWeekly = {}) {
  return calendarOpening(labels.map(label => {
    const value = hoursWeekly[label];
    if (value === '휴무' || value === '정기휴무') return [];
    if (value === '24시간' || value === '24시간 영업') return [[0, 1440]];
    const match = /^(\d{2}:\d{2})\s*[-~–]\s*(\d{2}:\d{2})(?:\s*(다음 날|익일))?$/.exec(value ?? '');
    const range = match && interval(match[1], match[2], false, Boolean(match[3]));
    return range ? [range] : null;
  }));
}

export function openingFromTabling(evidence) {
  // Monthly/irregular holidays need dated exceptions, not a fabricated weekly rule.
  if (evidence.temporaryHolidays?.length || (evidence.regularHolidays ?? []).some(h => h.criterion !== 'WEEK' || h.weekNo != null)) return { status: 'unknown' };
  const days = Array(7).fill(null);
  for (const item of evidence.restaurantTimes ?? []) {
    if (!Number.isInteger(item.dayOfWeek) || item.dayOfWeek < 0 || item.dayOfWeek > 6) continue;
    if (item.dayStatus === 'REGULAR_HOLIDAY') {
      if (evidence.regularHolidays?.some(h => h.dayOfWeek === item.dayOfWeek)) days[item.dayOfWeek] = [];
      continue;
    }
    if (item.dayStatus !== 'BUSINESS' || !item.openTimeList?.length) continue;
    const convert = r => interval(r.startTime, r.endTime, r.isStartTimeNextDay, r.isEndTimeNextDay);
    const ranges = item.openTimeList.map(convert), breaks = (item.breakTimeList ?? []).map(convert);
    if (ranges.some(r => !r) || breaks.some(r => !r)) continue;
    days[item.dayOfWeek] = subtract(ranges, breaks);
  }
  return calendarOpening(days);
}

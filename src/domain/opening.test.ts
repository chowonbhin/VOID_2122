import { describe, expect, it } from 'vitest';
import { openingOnDate } from './opening';
import type { OpeningInfo } from './types';

const split: OpeningInfo = { status: 'known', weekly: { 0: [
  { open: '10:00', close: '14:00' }, { open: '17:00', close: '22:00', lastEntry: '21:30' },
] } };
describe('calendar-date opening schedule shared by display and scoring', () => {
  it('preserves separate service periods and last-entry times', () => {
    expect(openingOnDate(split, '2026-11-08')).toEqual({ status: 'known', ranges: split.weekly![0] });
    expect(openingOnDate(split, '2026-11-09')).toEqual({ status: 'known', ranges: [] });
  });
  it('uses a dated closure instead of the ordinary weekday schedule', () => {
    expect(openingOnDate({ ...split, exceptions: [{ date: '2026-11-08', ranges: [], note: '임시 휴무' }] }, '2026-11-08'))
      .toEqual({ status: 'known', ranges: [], note: '임시 휴무' });
  });
  it('keeps partial weekday evidence unknown, unless a dated exception supplies hours', () => {
    const partial = { ...split, unknownDays: [1] } as OpeningInfo;
    expect(openingOnDate(partial, '2026-11-09').status).toBe('unknown');
    expect(openingOnDate({ ...partial, exceptions: [{ date: '2026-11-09', ranges: [{ open: '12:00', close: '18:00' }] }] }, '2026-11-09'))
      .toEqual({ status: 'known', ranges: [{ open: '12:00', close: '18:00' }] });
  });
  it('does not present expired or missing evidence as today’s hours', () => {
    const limited = { ...split, verifiedPeriod: { from: '2026-11-08', through: '2026-11-09' } };
    expect(openingOnDate(limited, '2026-11-07').status).toBe('unknown');
    expect(openingOnDate(limited, '2026-11-10').status).toBe('unknown');
    expect(openingOnDate({ status: 'unknown' }, '2026-11-08').status).toBe('unknown');
  });
});

import { describe, expect, it } from 'vitest';
import type { Visit } from '../../domain/types';
import { addVisitRecord, changeVisitDate, deleteVisitRecord, isVisitDate } from './records';

function visit(id: string, placeId: string, date: string): Visit {
  return { id, placeId, date, method: 'self_report' };
}

function frozenVisits(): readonly Visit[] {
  return Object.freeze([
    Object.freeze(visit('visit-1', 'a1', '2026-11-08')),
    Object.freeze(visit('visit-2', 'a1', '2026-11-09')),
    Object.freeze(visit('visit-3', 'b1', '2026-11-08')),
  ]);
}

describe('visit calendar dates', () => {
  it.each(['2026-11-08', '2024-02-29', '2000-02-29', '2026-01-01', '2026-12-31', '2099-11-08'])(
    'accepts the valid date %s, including future demo dates',
    (date) => expect(isVisitDate(date)).toBe(true),
  );

  it.each([
    '',
    '2026-02-29',
    '1900-02-29',
    '2100-02-29',
    '2026-04-31',
    '2026-11-31',
    '2026-00-08',
    '2026-13-08',
    '2026-11-00',
    '2026-11-32',
    '0000-01-01',
    '2026-1-08',
    '2026-11-8',
    '2026/11/08',
    ' 2026-11-08',
    '2026-11-08 ',
    '2026-11-08T00:00:00Z',
  ])('rejects the invalid calendar date or format %j', (date) => {
    expect(isVisitDate(date)).toBe(false);
  });
});

describe('adding visit records', () => {
  it('adds a self-reported visit without changing existing records or the input array', () => {
    const visits = frozenVisits();
    const nextVisit = Object.freeze(visit('visit-4', 'a2', '2026-11-08'));
    const result = addVisitRecord(visits, nextVisit);

    expect(result).toEqual({ ok: true, visits: [...visits, nextVisit] });
    if (result.ok) expect(result.visits).not.toBe(visits);
    expect(visits).toHaveLength(3);
    expect(nextVisit).toEqual(visit('visit-4', 'a2', '2026-11-08'));
  });

  it('rejects the same place and date even when a second click generates another ID', () => {
    const visits = frozenVisits();
    expect(addVisitRecord(visits, visit('another-id', 'a1', '2026-11-08'))).toEqual({
      ok: false,
      error: 'duplicate',
    });
    expect(visits).toHaveLength(3);
  });

  it('allows a revisit to the same place on a different day', () => {
    const visits = frozenVisits();
    const nextVisit = visit('visit-4', 'a1', '2026-11-10');
    expect(addVisitRecord(visits, nextVisit)).toEqual({ ok: true, visits: [...visits, nextVisit] });
  });

  it('allows two places to be visited on the same day', () => {
    const visits = frozenVisits();
    const nextVisit = visit('visit-4', 'a2', '2026-11-08');
    expect(addVisitRecord(visits, nextVisit)).toEqual({ ok: true, visits: [...visits, nextVisit] });
  });

  it('rejects reuse of an ID for a different place and date', () => {
    const visits = frozenVisits();
    expect(addVisitRecord(visits, visit('visit-1', 'a2', '2026-11-10'))).toEqual({
      ok: false,
      error: 'duplicate-id',
    });
  });

  it('rejects invalid dates without adding a record', () => {
    const visits = frozenVisits();
    expect(addVisitRecord(visits, visit('visit-4', 'a2', '2026-02-29'))).toEqual({
      ok: false,
      error: 'invalid-date',
    });
    expect(visits).toHaveLength(3);
  });
});

describe('editing visit dates', () => {
  it('changes only the selected record date and preserves its identity and reporting method', () => {
    const visits = frozenVisits();
    const result = changeVisitDate(visits, 'visit-1', '2026-11-10');

    expect(result).toEqual({
      ok: true,
      visits: [{ ...visits[0], date: '2026-11-10' }, visits[1], visits[2]],
    });
    if (result.ok) {
      expect(result.visits).not.toBe(visits);
      expect(result.visits[0]).toMatchObject({ id: 'visit-1', placeId: 'a1', method: 'self_report' });
    }
    expect(visits[0].date).toBe('2026-11-08');
  });

  it('allows saving the current date without colliding with itself', () => {
    const visits = frozenVisits();
    expect(changeVisitDate(visits, 'visit-1', '2026-11-08')).toEqual({ ok: true, visits });
  });

  it('rejects moving a record onto another visit to the same place on the same day', () => {
    const visits = frozenVisits();
    expect(changeVisitDate(visits, 'visit-1', '2026-11-09')).toEqual({ ok: false, error: 'duplicate' });
    expect(visits[0].date).toBe('2026-11-08');
  });

  it('allows matching the date of a visit to a different place', () => {
    const visits = frozenVisits();
    expect(changeVisitDate(visits, 'visit-3', '2026-11-09')).toEqual({
      ok: true,
      visits: [visits[0], visits[1], { ...visits[2], date: '2026-11-09' }],
    });
  });

  it('rejects an invalid replacement date', () => {
    const visits = frozenVisits();
    expect(changeVisitDate(visits, 'visit-1', '2026-04-31')).toEqual({ ok: false, error: 'invalid-date' });
  });

  it('reports a record removed before the edit was saved', () => {
    const visits = frozenVisits();
    expect(changeVisitDate(visits, 'missing', '2026-11-10')).toEqual({ ok: false, error: 'not-found' });
  });
});

describe('deleting visit records', () => {
  it('deletes only the selected ID, retaining other dates for the same place', () => {
    const visits = frozenVisits();
    const result = deleteVisitRecord(visits, 'visit-1');

    expect(result).toEqual({ ok: true, visits: [visits[1], visits[2]] });
    if (result.ok) expect(result.visits).not.toBe(visits);
    expect(visits).toHaveLength(3);
  });

  it('returns an empty list when the last visit is removed', () => {
    const visits = Object.freeze([Object.freeze(visit('only', 'a1', '2026-11-08'))]);
    expect(deleteVisitRecord(visits, 'only')).toEqual({ ok: true, visits: [] });
    expect(visits).toHaveLength(1);
  });

  it('reports an already-removed or unknown record without altering the list', () => {
    const visits = frozenVisits();
    expect(deleteVisitRecord(visits, 'missing')).toEqual({ ok: false, error: 'not-found' });
    expect(visits).toEqual(frozenVisits());
  });
});

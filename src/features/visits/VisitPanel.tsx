// Golden-path step 4 and M07. Owner: zT4ek.
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useAppState } from '../../AppState';
import { content } from '../../data/content';
import { TIME_ZONE } from '../../domain/policy';
import { isDiscoverablePlace } from '../../domain/discovery';
import type { Visit } from '../../domain/types';
import {
  addVisitRecord,
  changeVisitDate,
  deleteVisitRecord,
  isVisitDate,
  VISIT_ERROR_MESSAGES,
  type VisitRecordError,
  type VisitRecordResult,
} from './records';
import { getVisitProgress } from './progress';
import './visits.css';

function todayInSeoul(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function VisitPanel({ placeId }: { placeId: string }) {
  const { state, update } = useAppState();
  const formId = useId();
  const place = content.places.find((item) => item.id === placeId);
  const [date, setDate] = useState(() => {
    const selected = state.search?.when.slice(0, 10) ?? '';
    return isVisitDate(selected) ? selected : todayInSeoul();
  });
  const [editing, setEditing] = useState<{ id: string; date: string } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const visits = useMemo(
    () => state.visits.filter((item) => item.placeId === placeId).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
    [state.visits, placeId],
  );
  const alreadyRecorded = visits.some((item) => item.date === date);
  const progress = useMemo(
    () => place ? getVisitProgress(place, content.places, state.profile, state.visits) : null,
    [place, state.profile, state.visits],
  );

  if (!place || !isDiscoverablePlace(place) || !progress) return null;

  function mutateVisits(operation: (previous: readonly Visit[]) => VisitRecordResult): boolean {
    let recordError: VisitRecordError | undefined;
    setError('');
    setMessage('');
    // Shared update() applies this function to the latest stored state, then persists
    // before publishing React state. Failed writes must never show a successful edit.
    const saved = update((previous) => {
      const result = operation(previous.visits);
      if (!result.ok) {
        recordError = result.error;
        return previous;
      }
      return { ...previous, visits: result.visits };
    });
    if (recordError) {
      setError(VISIT_ERROR_MESSAGES[recordError]);
      return false;
    }
    if (!saved) {
      setError('기록을 저장하지 못했어요. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.');
      return false;
    }
    return true;
  }

  function addRecord(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const visit: Visit = { id: crypto.randomUUID(), placeId, date, method: 'self_report' };
    if (mutateVisits((previous) => addVisitRecord(previous, visit))) {
      setMessage('방문 기록을 저장했어요.');
    }
  }

  function saveDate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!editing) return;
    if (mutateVisits((previous) => changeVisitDate(previous, editing.id, editing.date))) {
      setEditing(null);
      setMessage('방문일을 수정했어요.');
    }
  }

  function removeRecord(id: string): void {
    if (mutateVisits((previous) => deleteVisitRecord(previous, id))) {
      if (editing?.id === id) setEditing(null);
      setMessage('방문 기록을 삭제했어요.');
    }
  }

  return (
    // Lv is not shown to users; data-*-level are hidden hooks so tests can still check the Lv rules.
    <section className="visit-panel" aria-label={`${place.name} 방문 기록`} data-place={placeId}
      data-region-level={progress.regionLevel} data-place-level={progress.placeLevel ?? 'pending'} data-visited-count={progress.distinctPlaceCount}>
      <form className="visit-form" aria-label={`${place.name} 방문 추가`} onSubmit={addRecord} noValidate>
        <label htmlFor={`${formId}-date`}>방문일</label>
        <input
          id={`${formId}-date`}
          type="date"
          value={date}
          required
          aria-describedby={`${formId}-hint`}
          onChange={(event) => {
            setDate(event.target.value);
            setError('');
            setMessage('');
          }}
        />
        <button type="submit" disabled={alreadyRecorded}>방문 기록</button>
      </form>
      <p id={`${formId}-hint`} className="visit-hint">
        {alreadyRecorded ? '이 날짜의 방문 기록이 있어요. 다른 방문일을 선택하면 재방문을 남길 수 있어요.' : '직접 방문한 날짜를 남겨주세요.'}
      </p>
      {error && <p role="alert" className="visit-error">{error}</p>}
      {message && <p role="status" className="visit-message">{message}</p>}

      {visits.length === 0 ? <p className="visit-empty">아직 남긴 방문 기록이 없어요.</p> : (
        <ul className="visit-records" aria-label={`${place.name} 방문 기록 목록`}>
          {visits.map((visit) => (
            <li key={visit.id}>
              <div className="visit-record-summary">
                <time dateTime={visit.date}>{visit.date}</time>
                <span className="visit-badge">자기 신고</span>
              </div>
              {editing?.id === visit.id ? (
                <form className="visit-edit-form" onSubmit={saveDate} aria-label={`${visit.date} 방문일 수정`} noValidate>
                  <label htmlFor={`${formId}-edit`}>수정할 방문일</label>
                  <input
                    id={`${formId}-edit`}
                    type="date"
                    required
                    value={editing.date}
                    onChange={(event) => {
                      setEditing({ id: visit.id, date: event.target.value });
                      setError('');
                      setMessage('');
                    }}
                  />
                  <div className="visit-actions">
                    <button type="submit">수정 저장</button>
                    <button type="button" onClick={() => { setEditing(null); setError(''); }}>취소</button>
                  </div>
                </form>
              ) : (
                <div className="visit-actions">
                  <button type="button" aria-label={`${visit.date} 방문일 수정`} onClick={() => {
                    setEditing({ id: visit.id, date: visit.date });
                    setError('');
                    setMessage('');
                  }}>수정</button>
                  <button type="button" aria-label={`${visit.date} 방문 기록 삭제`} onClick={() => removeRecord(visit.id)}>삭제</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

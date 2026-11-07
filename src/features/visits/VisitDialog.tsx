import { useEffect, useRef } from 'react';
import type { Place } from '../../domain/types';
import { VisitPanel } from './VisitPanel';

/** Lives outside the ranked cards so re-ranking cannot interrupt a visit edit. */
export function VisitDialog({ place, onClose }: { place: Place; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('input[type="date"]')?.focus();
    return () => {
      element?.close();
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
      else document.querySelector<HTMLButtonElement>('.region-filters button[aria-pressed="true"]')?.focus();
    };
  }, []);
  return <dialog ref={dialog} className="visit-dialog" aria-label={`${place.name} 방문 날짜 설정`}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="visit-dialog-body">
      <div className="visit-dialog-heading"><h2>{place.name}</h2>
        <button type="button" className="visit-dialog-close" aria-label="방문 날짜 설정 닫기" onClick={onClose}>×</button></div>
      <VisitPanel placeId={place.id} />
    </div>
  </dialog>;
}

import { useEffect, useRef, useState } from 'react';
import { naverCandidateStatus } from '../../data/content';

/** Retain the team's floating notice design, with factual content and no synthetic-mode switch. */
export function DataNotice() {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const root = useRef<HTMLDivElement>(null);
  // A press anywhere outside closes it. Touch taps also leave the hover state on, so clear both.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      setPinned(false);
      setHovered(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);
  return <div ref={root} className="demo-float" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setHovered(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}
    onKeyDown={event => { if (event.key === 'Escape') { setPinned(false); setHovered(false); } }}>
    <aside id="data-notice-panel" className="demo-notice" aria-label="데이터와 점수 안내" hidden={!open}>
      <strong>장소 정보 안내</strong>
      <p>네이버 검색 기준 · 확인 {naverCandidateStatus.checkedAt}</p>
      <p>운영시간이 미확인인 장소도 포함돼요. 방문 전 매장 정보를 확인해 주세요.</p>
    </aside>
    <button type="button" className="demo-chip" aria-expanded={open} aria-controls="data-notice-panel" onClick={() => setPinned(value => !value)}>
      <span aria-hidden="true" className="demo-chip-dot" />데이터 안내
    </button>
  </div>;
}

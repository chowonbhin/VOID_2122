import { useEffect, useRef, useState } from 'react';
import { content, naverCandidateStatus } from '../../data/content';

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
      <strong>실제 장소 20곳 · 100점 기준 추천</strong>
      <p>네이버 실제 검색 후보 {naverCandidateStatus.rawCandidateCount.toLocaleString('ko-KR')}곳 · 조회 {naverCandidateStatus.checkedAt}. 가상 장소는 사용하지 않습니다.</p>
      <p>추천에 표시한 20곳 모두를 점수에 넣습니다. 리뷰 수 {naverCandidateStatus.reviewCount}곳은 공개 2차 출처와 대조했으며, 미확인 수치를 만들지 않습니다.</p>
      <p>운영·분류·리뷰 미확인은 잠정 계산입니다. 리뷰 미확인은 보수적 감점을 적용하고, 영업 여부는 방문 전에 확인해 주세요.</p>
      <p>유동인구는 {content.regions.filter(region => region.footfallMarketIds?.length).length}/25개 동에 자료가 연결됐습니다. Lv.1 최대 15%, Lv.2 최대 30% 감점하며 Lv.0은 감점하지 않습니다.</p>
      <p>관심 활동·휴무 조건으로 후보가 20곳보다 적으면 실제 반영한 N/20을 표시합니다.</p>
    </aside>
    <button type="button" className="demo-chip" aria-expanded={open} aria-controls="data-notice-panel" onClick={() => setPinned(value => !value)}>
      <span aria-hidden="true" className="demo-chip-dot" />데이터 안내
    </button>
  </div>;
}

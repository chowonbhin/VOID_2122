import { useRef, useState, type ReactNode } from 'react';

/**
 * Card-news deck: swipe left/right, or tap a card to turn to the next page.
 * Each card has its own "여기 가봤어요" toggle that does not turn the page.
 */
export function CardDeck<T extends { id: string }>({ label, items, checked, onToggle, render }: {
  label: string; items: T[]; checked: string[]; onToggle: (id: string) => void; render: (item: T) => ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, next));
    setIndex(clamped);
    const element = track.current;
    if (!element) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: clamped * element.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };

  return <div className="deck" role="group" aria-label={label}>
    <div className="deck-track" ref={track}
      onScroll={event => setIndex(Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))}>
      {items.map((item, i) => {
        const on = checked.includes(item.id);
        return <article key={item.id} className={`deck-card${on ? ' checked' : ''}`} aria-roledescription="카드" aria-label={`${i + 1} / ${items.length}`}
          onClick={() => goTo(i + 1)}>
          {render(item)}
          <button type="button" className="deck-check" aria-pressed={on}
            onClick={event => { event.stopPropagation(); onToggle(item.id); }}>
            <span aria-hidden="true">{on ? '✓' : '+'}</span> 여기 가봤어요
          </button>
          <p className="deck-hint">{i < items.length - 1 ? '카드를 누르거나 옆으로 넘기면 다음 장' : '마지막 장이에요'}</p>
        </article>;
      })}
    </div>
    <div className="deck-nav">
      <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="이전 카드">←</button>
      <span aria-live="polite">{index + 1} / {items.length} · 체크 {checked.length}</span>
      <button type="button" onClick={() => goTo(index + 1)} disabled={index >= items.length - 1} aria-label="다음 카드">→</button>
    </div>
  </div>;
}

import type { ReactNode } from 'react';

const koreanDate = (date: string) => { const [year, month, day] = date.split('-').map(Number); return `${year}년 ${month}월 ${day}일`; };

export interface MemoryItem {
  id: string;
  title: string;
  /** Newest first. */
  dates: string[];
  memo?: string;
  sample?: boolean;
}

/** Memories in this 동네: the user's own visit records plus labelled demo examples. */
export function Memories({ items, selectedId, onSelect, controls }: {
  items: MemoryItem[]; selectedId?: string; onSelect: (id: string) => void; controls?: ReactNode;
}) {
  const selected = items.find(item => item.id === selectedId);
  return <section className="region-memories" aria-label="이 동네의 추억">
    <h2>이 동네의 추억 <span className="region-memory-count">{items.length}</span></h2>
    {controls}
    {items.some(item => item.sample) && <p className="region-note memory-preview-note">사동의 실제 장소를 골라 보여주는 추억 예시예요. 방문 기록·점수에는 반영하지 않아요.</p>}
    {items.length ? <>
      <ul>
        {items.map(item => <li key={item.id}>
          <button type="button" aria-pressed={item.id === selectedId} onClick={() => onSelect(item.id)}>
            <strong>{item.title}</strong>
            <span>{item.sample ? '추억 예시' : <>{item.dates.length > 1 ? `추억 ${item.dates.length}개 · 최근 ` : ''}{koreanDate(item.dates[0])}</>}</span>
          </button>
        </li>)}
      </ul>
      {selected?.memo && <figure className="region-memory-card">
        <figcaption><strong>{selected.title}</strong> · {selected.sample ? '추억 예시' : koreanDate(selected.dates[0])}</figcaption>
        <p>{selected.memo}</p>
      </figure>}
    </> : <p className="region-note">아직 이 동네에 남긴 추억이 없어요. 장소를 다녀온 뒤 방문을 기록하면 지도에 추억이 생겨요.</p>}
  </section>;
}

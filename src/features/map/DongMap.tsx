import { useId } from 'react';
import { dongs, fitBox, pathOf, project, type Dong } from './ansanGeo';
import './map.css';

export interface MapMarker {
  id: string;
  kind: 'place' | 'memory' | 'start' | 'home';
  lat: number;
  lng: number;
  /** Accessible name; place markers end with "지도에서 선택". */
  label: string;
  text?: string;
  pressed?: boolean;
  /** Place with the user's own visit records. */
  remembered?: boolean;
}

const MARKER_PX = 50; // 44px button + gap
const MIN_WIDTH_PX = 280; // narrowest map width on a 320px phone

/**
 * Markers sit at their real coordinates, then are nudged apart just enough to stay tappable on a phone.
 * A dot and a short leader line keep the true location visible.
 */
function layout(markers: MapMarker[], box: [number, number, number, number]) {
  const gap = (box[2] * MARKER_PX) / MIN_WIDTH_PX;
  const items = markers.map(marker => {
    const [x, y] = project([marker.lng, marker.lat]);
    return { marker, x0: x, y0: y, x, y };
  });
  for (let round = 0; round < 120; round++) {
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distance = Math.hypot(dx, dy);
      if (distance >= gap) continue;
      if (distance < 1e-6) { dx = Math.cos(i + j); dy = Math.sin(i + j); distance = 1; }
      const push = (gap - distance) / 2;
      a.x -= (dx / distance) * push; a.y -= (dy / distance) * push;
      b.x += (dx / distance) * push; b.y += (dy / distance) * push;
    }
    const inset = gap / 2;
    for (const item of items) {
      item.x = Math.min(box[0] + box[2] - inset, Math.max(box[0] + inset, item.x));
      item.y = Math.min(box[1] + box[3] - inset, Math.max(box[1] + inset, item.y));
    }
  }
  return items;
}

const Heart = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
  <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor" />
</svg>;
export const HomeIcon = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
  <path d="M12 3 2.5 11h2.7v9h5.3v-6h3v6h5.3v-9h2.7z" fill="currentColor" />
</svg>;

/** Single-동네 map in the same drawn style as the main map: real outline, neighbours for context. */
export function DongMap({ target, markers, onSelect }: {
  target: Dong[]; markers: MapMarker[]; onSelect?: (marker: MapMarker) => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const box = fitBox(target, 0.06 * Math.max(...target.map(d => fitBox([d], 0)[2])));
  const codes = new Set(target.map(d => d.code));
  const placed = layout(markers, box);
  const pct = (x: number, y: number) => ({ left: `${((x - box[0]) / box[2]) * 100}%`, top: `${((y - box[1]) / box[3]) * 100}%` });

  return <div className="dong-map" role="region" aria-label="안산 탐험 지도" style={{ aspectRatio: `${box[2]} / ${box[3]}` }}>
    <svg viewBox={box.join(' ')} className="dong-map-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`${uid}dots`} width={box[2] / 60} height={box[2] / 60} patternUnits="userSpaceOnUse">
          <circle cx={box[2] / 240} cy={box[2] / 240} r={box[2] / 400} fill="#c9b99a" opacity=".6" />
        </pattern>
      </defs>
      {dongs.filter(d => !codes.has(d.code)).map(d => <path key={d.code} d={pathOf(d.ring)} className="dong-map-context" />)}
      {target.map(d => <path key={d.code} d={pathOf(d.ring)} className="dong-map-target" />)}
      {target.map(d => <path key={`${d.code}-dots`} d={pathOf(d.ring)} fill={`url(#${uid}dots)`} />)}
      {placed.filter(p => Math.hypot(p.x - p.x0, p.y - p.y0) > box[2] / 200).map(p =>
        <line key={p.marker.id} x1={p.x0} y1={p.y0} x2={p.x} y2={p.y} className="dong-map-leader" strokeWidth={box[2] / 300} />)}
      {placed.map(p => <circle key={p.marker.id} cx={p.x0} cy={p.y0} r={box[2] / 160} className={`dong-map-dot ${p.marker.kind}`} />)}
    </svg>
    {placed.map(({ marker, x, y }) => {
      const style = pct(x, y);
      const className = `dong-pin kind-${marker.kind}${marker.remembered ? ' remembered' : ''}${marker.pressed ? ' selected' : ''}`;
      if (marker.kind === 'start' || marker.kind === 'home') return <span key={marker.id} role="img" aria-label={marker.label} className={className} style={style}>
        {marker.kind === 'home' ? <HomeIcon /> : marker.text}
      </span>;
      return <button type="button" key={marker.id} className={className} style={style} aria-label={marker.label}
        aria-pressed={marker.pressed ?? false} onClick={() => onSelect?.(marker)}>
        {marker.kind === 'memory' ? <Heart /> : marker.text}
      </button>;
    })}
  </div>;
}

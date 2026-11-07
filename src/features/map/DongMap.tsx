import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { Icon } from '../../components/Icon';
import { dongs, fitBox, pathOfDong, project, type Dong } from './ansanGeo';
import './map.css';

export interface MapMarker {
  id: string;
  kind: 'place' | 'memory' | 'home';
  lat: number;
  lng: number;
  /** Accessible name describing the destination or selection action. */
  label: string;
  /** External place map, opened only when the marker itself is activated. */
  href?: string;
  text?: string;
  pressed?: boolean;
  /** Photo of the place (personal or example); shown inside the pin instead of the number. */
  image?: string;
  /** Place with the user's own visit records. */
  remembered?: boolean;
}

const MIN_WIDTH_PX = 280; // narrowest map width on a 320px phone

/**
 * Markers sit at their real coordinates, then are nudged apart just enough to stay tappable on a phone.
 * A dot and a short leader line keep the true location visible.
 */
function layout(markers: MapMarker[], box: [number, number, number, number], width: number) {
  const unit = box[2] / Math.max(width, 1);
  const items = markers.map(marker => {
    const [x, y] = project([marker.lng, marker.lat]);
    // Work with visual centres: a 64px photo sits 42px above its anchor.
    // Include its heart badge, the larger selected number and focus outline.
    const offset = marker.image ? 42 : 0;
    const radius = marker.image ? 40 : marker.pressed && marker.kind === 'place' ? 26 : 22;
    return { marker, radius, offset, x0: x, y0: y, x, y: y - offset * unit };
  });
  for (let round = 0; round < 120; round++) {
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const gap = (a.radius + b.radius + 8) * unit;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distance = Math.hypot(dx, dy);
      if (distance >= gap) continue;
      if (distance < 1e-6) { dx = Math.cos(i + j); dy = Math.sin(i + j); distance = 1; }
      const push = (gap - distance) / 2;
      a.x -= (dx / distance) * push; a.y -= (dy / distance) * push;
      b.x += (dx / distance) * push; b.y += (dy / distance) * push;
    }
    for (const item of items) {
      const inset = (item.radius + 4) * unit;
      item.x = Math.min(box[0] + box[2] - inset, Math.max(box[0] + inset, item.x));
      item.y = Math.min(box[1] + box[3] - inset, Math.max(box[1] + inset, item.y));
    }
  }
  // Dense edge clusters can remain stuck against the bounds after repulsion.
  // Fall back to separated slots only then; the original coordinate dots and
  // leader lines still show where each venue actually is.
  if (items.some((a, i) => items.some((b, j) => j > i && Math.hypot(a.x - b.x, a.y - b.y) < (a.radius + b.radius + 8) * unit * 0.9))) {
    const gap = (2 * Math.max(...items.map(item => item.radius)) + 8) * unit;
    const columns = Math.floor(box[2] / gap);
    const rows = Math.floor(box[3] / gap);
    const slots = Array.from({ length: columns * rows }, (_, i) => ({
      x: box[0] + (box[2] - (columns - 1) * gap) / 2 + (i % columns) * gap,
      y: box[1] + (box[3] - (rows - 1) * gap) / 2 + Math.floor(i / columns) * gap,
    }));
    if (slots.length >= items.length) {
      for (const item of items) {
        let closest = 0;
        for (let i = 1; i < slots.length; i++) {
          if (Math.hypot(slots[i].x - item.x0, slots[i].y - item.y0)
            < Math.hypot(slots[closest].x - item.x0, slots[closest].y - item.y0)) closest = i;
        }
        const slot = slots.splice(closest, 1)[0];
        item.x = slot.x; item.y = slot.y;
      }
    }
  }
  return items.map(item => ({ ...item, y: item.y + item.offset * unit }));
}

const Heart = () => <Icon name="heart" size={18} />;
export const HomeIcon = ({ size = 18 }: { size?: number }) => <Icon name="home" size={size} />;

/** Single-동네 map in the same drawn style as the main map: real outline, neighbours for context. */
export function DongMap({ target, markers, onSelect, ref }: {
  target: Dong[]; markers: MapMarker[]; onSelect?: (marker: MapMarker) => void; ref?: Ref<HTMLDivElement>;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(MIN_WIDTH_PX);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const box = fitBox(target, 0.06 * Math.max(...target.map(d => fitBox([d], 0)[2])));
  const codes = new Set(target.map(d => d.code));
  const placed = layout(markers, box, width);
  const pct = (x: number, y: number) => ({ left: `${((x - box[0]) / box[2]) * 100}%`, top: `${((y - box[1]) / box[3]) * 100}%` });

  return <div ref={element => {
    container.current = element;
    if (typeof ref === 'function') return ref(element);
    if (ref) ref.current = element;
  }} className="dong-map" role="region" aria-label="안산 탐험 지도" tabIndex={-1} style={{ aspectRatio: `${box[2]} / ${box[3]}` }}>
    <svg viewBox={box.join(' ')} className="dong-map-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`${uid}dots`} width={box[2] / 60} height={box[2] / 60} patternUnits="userSpaceOnUse">
          <circle cx={box[2] / 240} cy={box[2] / 240} r={box[2] / 400} fill="var(--color-map-boundary)" opacity=".25" />
        </pattern>
      </defs>
      {dongs.filter(d => !codes.has(d.code)).map(d => <path key={d.code} d={pathOfDong(d)} fillRule="evenodd" className="dong-map-context" />)}
      {target.map(d => <path key={d.code} d={pathOfDong(d)} fillRule="evenodd" className="dong-map-target" />)}
      {target.map(d => <path key={`${d.code}-dots`} d={pathOfDong(d)} fillRule="evenodd" fill={`url(#${uid}dots)`} />)}
      {placed.filter(p => Math.hypot(p.x - p.x0, p.y - p.y0) > box[2] / 200).map(p =>
        <line key={p.marker.id} x1={p.x0} y1={p.y0} x2={p.x} y2={p.y} className="dong-map-leader" strokeWidth={box[2] / 300} />)}
      {placed.map(p => <circle key={p.marker.id} cx={p.x0} cy={p.y0} r={box[2] / 160} className={`dong-map-dot ${p.marker.kind}`} />)}
    </svg>
    {placed.map(({ marker, x, y }) => {
      const style = pct(x, y);
      const className = `dong-pin kind-${marker.kind}${marker.remembered ? ' remembered' : ''}${marker.pressed ? ' selected' : ''}${marker.image ? ' has-image' : ''}`;
      if (marker.kind === 'home') return <span key={marker.id} role="img" aria-label={marker.label} className={className} style={style}>
        {marker.kind === 'home' ? <HomeIcon /> : marker.text}
      </span>;
      const face = marker.image ? <>
        <img src={marker.image} alt="" />
        {(marker.kind === 'memory' || marker.remembered) && <span className="pin-heart" aria-hidden="true"><Heart /></span>}
      </> : marker.kind === 'memory' ? <Heart /> : marker.text;
      if (marker.href) return <a key={marker.id} className={className} style={style} href={marker.href} target="_blank" rel="noreferrer"
        aria-label={marker.label} title={marker.label} aria-current={marker.pressed ? 'location' : undefined}>
        {face}
      </a>;
      return <button type="button" key={marker.id} className={className} style={style} aria-label={marker.label}
        aria-pressed={marker.pressed ?? false} onClick={() => onSelect?.(marker)}>
        {face}
      </button>;
    })}
  </div>;
}

import { useEffect, useId, useRef, useState } from 'react';
import { dongs, fitBox, pathOfDong, project, type Box, type Dong } from './ansanGeo';
import './map.css';

export interface MapMarker {
  id: string;
  kind: 'place' | 'memory' | 'home';
  lat: number;
  lng: number;
  /** Accessible name; place markers end with "지도에서 선택". */
  label: string;
  text?: string;
  pressed?: boolean;
  /** Photo of the place (personal or example); shown inside the pin instead of the number. */
  image?: string;
  /** Place with the user's own visit records. */
  remembered?: boolean;
}

// CSS-pixel extents from the geographic anchor, including outline, tail, heart and breathing room.
const markerInsets = (marker: MapMarker) => marker.image
  ? { left: 40, right: 44, top: 86, bottom: 14 }
  : { left: 34, right: 34, top: 34, bottom: 34 };

/** Expand the shared viewBox, keeping the same map frame and real coordinates. */
function fitMarkers(base: Box, markers: MapMarker[], width: number): Box {
  let box = base;
  const ratio = base[2] / base[3];
  // Fixed-size HTML pins need more geographic padding as the map zooms out.
  for (let round = 0; round < 32; round++) {
    const unit = box[2] / width;
    let left = base[0], top = base[1], right = left + base[2], bottom = top + base[3];
    for (const marker of markers) {
      const [x, y] = project([marker.lng, marker.lat]);
      const inset = markerInsets(marker);
      left = Math.min(left, x - inset.left * unit);
      right = Math.max(right, x + inset.right * unit);
      top = Math.min(top, y - inset.top * unit);
      bottom = Math.max(bottom, y + inset.bottom * unit);
    }
    const w = Math.max(right - left, (bottom - top) * ratio), h = w / ratio;
    const next: Box = [(left + right - w) / 2, (top + bottom - h) / 2, w, h];
    const settled = next.every((value, index) => Math.abs(value - box[index]) < 0.00001);
    box = next;
    if (settled) break;
  }
  return box;
}

/** Separate visual pin rectangles; leaders retain each place's actual coordinate. */
function layout(markers: MapMarker[], box: Box, width: number) {
  const unit = box[2] / width;
  const items = markers.map(marker => {
    const [x, y] = project([marker.lng, marker.lat]);
    return { marker, x0: x, y0: y, x, y, inset: markerInsets(marker) };
  });
  for (let round = 0; round < 120; round++) {
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      const ax = a.x + (a.inset.right - a.inset.left) * unit / 2;
      const ay = a.y + (a.inset.bottom - a.inset.top) * unit / 2;
      const bx = b.x + (b.inset.right - b.inset.left) * unit / 2;
      const by = b.y + (b.inset.bottom - b.inset.top) * unit / 2;
      const overlapX = (a.inset.left + a.inset.right + b.inset.left + b.inset.right) * unit / 2 - Math.abs(bx - ax);
      const overlapY = (a.inset.top + a.inset.bottom + b.inset.top + b.inset.bottom) * unit / 2 - Math.abs(by - ay);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (overlapX < overlapY) {
        const push = (overlapX + unit) / 2 * (bx >= ax ? 1 : -1);
        a.x -= push; b.x += push;
      } else {
        const push = (overlapY + unit) / 2 * (by >= ay ? 1 : -1);
        a.y -= push; b.y += push;
      }
    }
    for (const item of items) {
      item.x = Math.min(box[0] + box[2] - item.inset.right * unit, Math.max(box[0] + item.inset.left * unit, item.x));
      item.y = Math.min(box[1] + box[3] - item.inset.bottom * unit, Math.max(box[1] + item.inset.top * unit, item.y));
    }
  }
  return items;
}

const Heart = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
  <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor" />
</svg>;
export const HomeIcon = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
  <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
</svg>;

/** Single-동네 map in the same drawn style as the main map: real outline, neighbours for context. */
export function DongMap({ target, markers, onSelect }: {
  target: Dong[]; markers: MapMarker[]; onSelect?: (marker: MapMarker) => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const base = fitBox(target, 0.06 * Math.max(...target.map(d => fitBox([d], 0)[2])));
  const box = fitMarkers(base, markers, width);
  const codes = new Set(target.map(d => d.code));
  const placed = layout(markers, box, width);
  const pct = (x: number, y: number) => ({ left: `${((x - box[0]) / box[2]) * 100}%`, top: `${((y - box[1]) / box[3]) * 100}%` });

  return <div ref={container} className="dong-map" role="region" aria-label="안산 탐험 지도" style={{ aspectRatio: `${box[2]} / ${box[3]}` }}>
    <svg viewBox={box.join(' ')} className="dong-map-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`${uid}dots`} width={box[2] / 60} height={box[2] / 60} patternUnits="userSpaceOnUse">
          <circle cx={box[2] / 240} cy={box[2] / 240} r={box[2] / 400} fill="#c9b99a" opacity=".6" />
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
        <HomeIcon size={22} />
      </span>;
      return <button type="button" key={marker.id} className={className} style={style} aria-label={marker.label}
        aria-pressed={marker.pressed ?? false} onClick={() => onSelect?.(marker)}>
        {marker.image ? <>
          <img src={marker.image} alt="" />
          {(marker.kind === 'memory' || marker.remembered) && <span className="pin-heart" aria-hidden="true"><Heart /></span>}
        </> : marker.kind === 'memory' ? <Heart /> : marker.text}
      </button>;
    })}
  </div>;
}

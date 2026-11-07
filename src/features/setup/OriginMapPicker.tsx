// Drag the drawn Ansan map under a fixed centre pin to choose the starting point.
// Uses the same offline 행정동 outlines as the main map; no tiles or external requests.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { dongAt, dongs, pathOfDong, project, wholeBox } from '../map/ansanGeo';

// project() is linear, so its inverse comes from two reference points.
const [X0, Y0] = project([0, 0]);
const PER_LNG = project([1, 0])[0] - X0;
const PER_LAT = Y0 - project([0, 1])[1];
const unproject = (x: number, y: number) => ({ lng: (x - X0) / PER_LNG, lat: (Y0 - y) / PER_LAT });

const MAX_WIDTH = wholeBox[2];
const MIN_WIDTH = MAX_WIDTH / 12;
const RATIO = 3 / 4;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const labels = dongs.map(dong => ({ code: dong.code, name: dong.name, at: project([dong.labelPoint.lng, dong.labelPoint.lat]) }));

export function OriginMapPicker({ lat, lng, onPick }: {
  lat: number;
  lng: number;
  onPick: (point: { lat: number; lng: number; dongName?: string }) => void;
}) {
  const [width, setWidth] = useState(MAX_WIDTH / 5);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; scale: number }>(undefined);
  const [cx, cy] = project([lng, lat]);
  const height = width * RATIO;
  const here = dongAt(lat, lng);

  function moveTo(x: number, y: number) {
    const nx = clamp(x, wholeBox[0], wholeBox[0] + wholeBox[2]);
    const ny = clamp(y, wholeBox[1], wholeBox[1] + wholeBox[3]);
    const point = unproject(nx, ny);
    const rounded = { lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) };
    onPick({ ...rounded, dongName: dongAt(rounded.lat, rounded.lng)?.name });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, cx, cy, scale: width / event.currentTarget.clientWidth };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    moveTo(start.cx - (event.clientX - start.x) * start.scale, start.cy - (event.clientY - start.y) * start.scale);
  }
  const endDrag = () => { drag.current = undefined; };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = width / 10;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (delta[event.key]) {
      event.preventDefault();
      moveTo(cx + delta[event.key][0], cy + delta[event.key][1]);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault(); zoom(1 / 1.5);
    } else if (event.key === '-') {
      event.preventDefault(); zoom(1.5);
    }
  }
  const zoom = (factor: number) => setWidth(previous => clamp(previous * factor, MIN_WIDTH, MAX_WIDTH));

  return <div className="origin-picker">
    <div className="origin-map" role="application" tabIndex={0}
      aria-label="출발지 지도. 지도를 끌거나 방향키로 움직여 가운데 핀에 출발지를 맞추세요. +와 -로 확대·축소합니다."
      aria-describedby="origin-map-status"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}>
      <svg viewBox={`${cx - width / 2} ${cy - height / 2} ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect x={wholeBox[0] - MAX_WIDTH} y={wholeBox[1] - MAX_WIDTH} width={MAX_WIDTH * 3} height={MAX_WIDTH * 3} className="origin-map-sea" />
        {dongs.map(dong => <path key={dong.code} d={pathOfDong(dong)} fillRule="evenodd"
          className={dong.code === here?.code ? 'origin-map-dong current' : 'origin-map-dong'} strokeWidth={width / 400} />)}
        {labels.map(label => <text key={label.code} x={label.at[0]} y={label.at[1]} fontSize={width / 28} textAnchor="middle" className="origin-map-label">{label.name}</text>)}
      </svg>
      <svg className="origin-map-pin" viewBox="0 0 24 32" width="30" height="40" aria-hidden="true">
        <path d="M12 1C6 1 1.5 5.5 1.5 11.3 1.5 19 12 31 12 31s10.5-12 10.5-19.7C22.5 5.5 18 1 12 1z" />
        <circle cx="12" cy="11.5" r="4" />
      </svg>
      <div className="origin-map-zoom">
        <button type="button" aria-label="지도 확대" disabled={width <= MIN_WIDTH} onPointerDown={event => event.stopPropagation()} onClick={() => zoom(1 / 1.5)}>+</button>
        <button type="button" aria-label="지도 축소" disabled={width >= MAX_WIDTH} onPointerDown={event => event.stopPropagation()} onClick={() => zoom(1.5)}>−</button>
      </div>
    </div>
    <p id="origin-map-status" className="origin-map-status" aria-live="polite">
      핀 위치: <strong>{here ? here.name : '안산 밖'}</strong> · {lat.toFixed(4)}, {lng.toFixed(4)}
    </p>
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place, Region } from '../../domain/types';

// Data contract: coordinates come from Region/Place; one selected ID is shared with the cards.
// outline: real area rings as [lat, lng]; memories: visit dates per place, newest first.
export function RegionMap({ region, places, boundsPlaces = places, selectedId, onSelect, outline = [], memories = {} }: {
  region: Region; places: Place[]; boundsPlaces?: Place[]; selectedId: string | null; onSelect: (id: string) => void;
  outline?: [number, number][][]; memories?: Record<string, string[]>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const select = useRef(onSelect);
  select.current = onSelect;
  const [unavailable, setUnavailable] = useState(false);
  const [view, setView] = useState<'places' | 'whole'>('places');
  const viewRef = useRef(view);
  viewRef.current = view;
  const fit = useRef<(target: 'places' | 'whole') => void>(() => {});
  // Rendering selection must not rebuild the map or refetch tiles. Geometry changes do.
  const geometryKey = JSON.stringify([region.id, region.start, places.map(p => [p.id, p.name, p.location]), boundsPlaces.map(p => p.location), outline]);
  useEffect(() => {
    if (!host.current) return;
    setUnavailable(false);
    const map = L.map(host.current, { scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false });
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    let failed = false;
    const fallback = () => {
      if (failed) return;
      failed = true;
      setUnavailable(true);
      map.removeLayer(tiles);
    };
    let timer: ReturnType<typeof setTimeout>;
    tiles.on('loading', () => { clearTimeout(timer); timer = setTimeout(fallback, 8000); });
    tiles.on('load', () => clearTimeout(timer));
    tiles.on('tileerror', fallback);
    tiles.addTo(map);
    const start = L.marker([region.start.lat, region.start.lng], {
      icon: L.divIcon({ className: 'region-pin region-start', html: 'S', iconSize: [30, 30] }),
      title: region.start.label, alt: region.start.label,
    }).addTo(map);
    const bounds = L.latLngBounds([start.getLatLng()]);
    const whole = L.latLngBounds([start.getLatLng()]);
    if (outline.length) {
      const area = L.polygon(outline, { color: '#356859', weight: 3, dashArray: '8 6', fillColor: '#82AE98', fillOpacity: 0.14, interactive: false }).addTo(map);
      whole.extend(area.getBounds());
    }
    places.forEach((place, index) => {
      const marker = L.marker([place.location.lat, place.location.lng], {
        icon: L.divIcon({ className: 'region-pin', html: String(index + 1), iconSize: [30, 30] }),
        title: `${place.name} 지도에서 선택`, alt: `${place.name} 지도에서 선택`,
      }).addTo(map).on('click', () => select.current(place.id));
      markers.current.set(place.id, marker);
      bounds.extend(marker.getLatLng());
    });
    boundsPlaces.forEach((p) => bounds.extend([p.location.lat, p.location.lng]));
    whole.extend(bounds);
    // Places are a few hundred metres apart inside a multi-km 동네: zoom to them by default so every
    // marker stays tappable, and offer the whole real outline on demand (plus the inset below).
    fit.current = (target) => map.fitBounds(target === 'whole' ? whole : bounds, { padding: [28, 28], maxZoom: 16 });
    fit.current(viewRef.current);
    // Leaflet creates marker elements only after the map has its initial view.
    places.forEach((place) => {
      const element = markers.current.get(place.id)?.getElement();
      element?.setAttribute('aria-label', `${place.name} 지도에서 선택`);
      element?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          select.current(place.id);
        }
      });
    });
    start.getElement()?.setAttribute('aria-label', region.start.label);
    return () => { clearTimeout(timer); markers.current.clear(); fit.current = () => {}; map.remove(); };
  }, [geometryKey]);
  useEffect(() => {
    markers.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle('selected', id === selectedId);
      marker.getElement()?.setAttribute('aria-pressed', String(id === selectedId));
    });
  }, [selectedId, geometryKey]);
  const memoryKey = JSON.stringify(memories);
  useEffect(() => {
    markers.current.forEach((marker, id) => {
      const dates = memories[id] ?? [];
      marker.getElement()?.classList.toggle('memory', dates.length > 0);
      marker.unbindTooltip();
      if (dates.length) marker.bindTooltip(`추억 ${dates.length}개 · 최근 ${koreanDate(dates[0])}`, { direction: 'top', offset: [0, -14] });
    });
  }, [memoryKey, geometryKey]);
  return <>
    {outline.length > 0 && <div className="region-map-views" role="group" aria-label="지도 보기 범위">
      {([['places', '장소 가까이'], ['whole', '동네 전체 경계']] as const).map(([value, label]) =>
        <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); fit.current(value); }}>{label}</button>)}
    </div>}
    <div className="region-map-wrap">
      <div ref={host} className="region-map" role="region" aria-label="안산 탐험 지도" />
      {outline.length > 0 && <OutlineInset outline={outline} places={boundsPlaces} />}
    </div>
    {unavailable && <p role="status">배경지도를 불러오지 못했어요. 장소 목록과 번호 마커는 계속 사용할 수 있어요.</p>}
    <p className="region-note">초록 테두리: 실제 행정동 경계(2013) · S: 권역 시작점 · 번호: 아래 장소 목록 순서 · 테라코타 마커: 나의 추억이 있는 곳</p>
    <p className="region-note">배경지도는 실제 지형입니다. 시연용 장소의 위치·운영정보는 가상 데이터입니다.</p>
  </>;
}

export function koreanDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

/** Always-visible mini map of the 동네's real outline, with the places shown as dots. */
function OutlineInset({ outline, places }: { outline: [number, number][][]; places: Place[] }) {
  const points = outline.flat();
  const cos = Math.cos((points[0][0] * Math.PI) / 180);
  const xy = ([lat, lng]: [number, number]) => [lng * cos, -lat] as const;
  const projected = points.map(xy);
  const minX = Math.min(...projected.map(p => p[0]));
  const minY = Math.min(...projected.map(p => p[1]));
  const span = Math.max(Math.max(...projected.map(p => p[0])) - minX, Math.max(...projected.map(p => p[1])) - minY);
  const to = (point: [number, number]) => { const [x, y] = xy(point); return [((x - minX) / span) * 100 + 6, ((y - minY) / span) * 100 + 6]; };
  return <svg className="region-inset" viewBox="0 0 112 112" aria-hidden="true">
    {outline.map((ring, i) => <path key={i} d={ring.map((point, j) => `${j ? 'L' : 'M'}${to(point).map(n => n.toFixed(1)).join(',')}`).join('') + 'Z'} />)}
    {places.map(place => { const [x, y] = to([place.location.lat, place.location.lng]); return <circle key={place.id} cx={x} cy={y} r="2.6" />; })}
  </svg>;
}

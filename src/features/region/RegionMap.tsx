import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place, Region } from '../../domain/types';

// Data contract: coordinates come from Region/Place; one selected ID is shared with the cards.
export function RegionMap({ region, places, boundsPlaces = places, selectedId, onSelect }: {
  region: Region; places: Place[]; boundsPlaces?: Place[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const select = useRef(onSelect);
  select.current = onSelect;
  const [unavailable, setUnavailable] = useState(false);
  // Rendering selection must not rebuild the map or refetch tiles. Geometry changes do.
  const geometryKey = JSON.stringify([region.id, region.start, places.map(p => [p.id, p.name, p.location]), boundsPlaces.map(p => p.location)]);
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
    places.forEach((place, index) => {
      const marker = L.marker([place.location.lat, place.location.lng], {
        icon: L.divIcon({ className: 'region-pin', html: String(index + 1), iconSize: [30, 30] }),
        title: `${place.name} 지도에서 선택`, alt: `${place.name} 지도에서 선택`,
      }).addTo(map).on('click', () => select.current(place.id));
      markers.current.set(place.id, marker);
      bounds.extend(marker.getLatLng());
    });
    boundsPlaces.forEach((p) => bounds.extend([p.location.lat, p.location.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
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
    return () => { clearTimeout(timer); markers.current.clear(); map.remove(); };
  }, [geometryKey]);
  useEffect(() => {
    markers.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle('selected', id === selectedId);
      marker.getElement()?.setAttribute('aria-pressed', String(id === selectedId));
    });
  }, [selectedId, geometryKey]);
  return <>
    <div ref={host} className="region-map" role="region" aria-label="안산 탐험 지도" />
    {unavailable && <p role="status">배경지도를 불러오지 못했어요. 장소 목록과 번호 마커는 계속 사용할 수 있어요.</p>}
    <p className="region-note">S: 권역 시작점 · 번호: 아래 장소 목록 순서</p>
    <p className="region-note">배경지도는 실제 지형입니다. 시연용 장소의 위치·운영정보는 가상 데이터입니다.</p>
  </>;
}

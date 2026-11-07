import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Place, Region, RegionRecommendation } from '../../domain/types';
import 'leaflet/dist/leaflet.css';
import './map.css';

interface Props {
  regions: Region[];
  recommendations: RegionRecommendation[];
  selectedRegionId?: string;
  places?: Place[];
  selectedPlaceId?: string;
  onRegionSelect: (id: string) => void;
  onPlaceSelect?: (id: string) => void;
}
const colors = ['#0f766e', '#4b709b', '#8a75a8'];
const pair = (point: { lat: number; lng: number }): L.LatLngTuple => [point.lat, point.lng];

export function ExplorationMap(props: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const previousSelection = useRef<string | undefined | null>(null);
  const [tileFailed, setTileFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const instance = L.map(element.current!, { scrollWheelZoom: false, fadeAnimation: false });
    map.current = instance;
    const initialRegions = props.selectedRegionId ? props.regions.filter((region) => region.id === props.selectedRegionId) : props.regions;
    const initialBounds = L.latLngBounds(initialRegions.flatMap((region) => (region.boundary ?? [region.start]).map(pair)));
    if (initialBounds.isValid()) instance.fitBounds(initialBounds, {
      paddingTopLeft: [35, 110], paddingBottomRight: [35, 35], maxZoom: props.selectedRegionId ? 15 : 13, animate: false,
    });
    else instance.setView([37.323, 126.814], 13);
    previousSelection.current = props.selectedRegionId;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('loading', () => setLoading(true)).on('load', () => setLoading(false))
      .on('tileerror', () => setTileFailed(true)).addTo(instance);
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(element.current!);
    return () => { resize.disconnect(); instance.remove(); map.current = null; previousSelection.current = null; };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layers = L.layerGroup().addTo(instance);
    const bounds = L.latLngBounds([]);
    const selected = props.regions.find((region) => region.id === props.selectedRegionId);
    for (const [regionIndex, region] of props.regions.entries()) {
      const points = region.boundary?.map(pair);
      if (!points?.length) continue;
      const index = props.recommendations.findIndex((item) => item.regionId === region.id);
      const recommendation = props.recommendations[index];
      const color = recommendation && recommendation.score > 0 ? colors[Math.min(index, colors.length - 1)] : '#667085';
      const isSelected = region.id === props.selectedRegionId;
      const polygon = L.polygon(points, {
        color, fillColor: color, fillOpacity: isSelected ? 0.3 : 0.18,
        weight: isSelected ? 4 : 2, dashArray: recommendation ? undefined : '6 5',
      }).addTo(layers);
      const label = `${region.name} · ${recommendation ? `추천 점수 ${recommendation.score.toFixed(1)}${recommendation.score > 0 ? ` · ${index + 1}순위` : ''}` : '추천 조건 미충족'} · 상세 보기`;
      polygon.on('click', () => props.onRegionSelect(region.id));
      const path = polygon.getElement();
      if (path) {
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', `영역 ${label}`);
        path.addEventListener('keydown', (event) => {
          const key = (event as KeyboardEvent).key;
          if (key === 'Enter' || key === ' ') { event.preventDefault(); props.onRegionSelect(region.id); }
        });
      }
      const badge = document.createElement('button');
      badge.type = 'button'; badge.className = `map-score-badge${isSelected ? ' selected' : ''}`;
      badge.style.borderColor = color; badge.setAttribute('aria-label', `지도 ${label}`);
      const title = document.createElement('strong');
      title.textContent = region.name.replace(/^[AB]권역 · /, '');
      const score = document.createElement('span');
      score.textContent = recommendation ? `${recommendation.score > 0 ? `${index + 1}순위 · ` : ''}${recommendation.score.toFixed(1)}점` : '조건 미충족 · 탐색 가능';
      badge.append(title, score);
      badge.addEventListener('click', (event) => { event.stopPropagation(); props.onRegionSelect(region.id); });
      const center = polygon.getBounds().getCenter();
      L.marker([polygon.getBounds().getNorth(), center.lng], {
        icon: L.divIcon({ html: badge, className: 'map-label', iconSize: [180, 62], iconAnchor: [90, selected ? 62 : 62 + regionIndex * 28] }), keyboard: false,
      }).addTo(layers);
      if (!selected || isSelected) bounds.extend(polygon.getBounds());
    }
    if (selected) {
      const startText = document.createElement('span');
      startText.textContent = `시작점 · ${selected.start.label}`;
      L.circleMarker(pair(selected.start), { radius: 8, color: '#111827', fillColor: '#fff', fillOpacity: 1, weight: 3 })
        .bindTooltip(startText).addTo(layers);
    }
    for (const [index, place] of (props.places ?? []).entries()) {
      const active = place.id === props.selectedPlaceId;
      const marker = document.createElement('button');
      marker.type = 'button'; marker.className = `map-place-marker${active ? ' active' : ''}`;
      marker.textContent = String(index + 1);
      marker.setAttribute('aria-label', `${place.name} 지도에서 선택`);
      marker.setAttribute('aria-pressed', String(active));
      marker.addEventListener('click', (event) => { event.stopPropagation(); props.onPlaceSelect?.(place.id); });
      L.marker(pair(place.location), {
        icon: L.divIcon({ html: marker, className: 'map-label', iconSize: [44, 44], iconAnchor: [22, 22] }), keyboard: false,
      }).addTo(layers);
    }
    if (bounds.isValid() && previousSelection.current !== props.selectedRegionId) {
      instance.fitBounds(bounds, { paddingTopLeft: [35, 110], paddingBottomRight: [35, 35], maxZoom: selected ? 15 : 13, animate: false });
      previousSelection.current = props.selectedRegionId;
    }
    return () => { layers.remove(); };
  }, [props.regions, props.recommendations, props.selectedRegionId, props.places, props.selectedPlaceId, props.onRegionSelect, props.onPlaceSelect]);

  return <section className="exploration-map" aria-label="안산 탐험 지도">
    <div ref={element} className="map-canvas" aria-label="탐험권역 점수와 장소 지도" aria-busy={loading} />
    {tileFailed && <p className="map-warning" role="status">배경지도를 불러오지 못했습니다. 권역 표시와 아래 목록으로 계속 탐색할 수 있어요.</p>}
    <div className="map-legend"><span className="map-legend-dot" /> 현재 조건의 1순위 <span>· 숫자로 점수 비교 · 회색은 조건 미충족</span></div>
    <p className="map-note">경계는 앱에서 정한 탐험 범위이며 행정구역·공식 상권 경계가 아닙니다. 장소 마커는 시연용 위치입니다.</p>
  </section>;
}

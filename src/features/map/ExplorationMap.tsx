import { useRef, useState, type KeyboardEvent } from 'react';
import type { Region, RegionRecommendation } from '../../domain/types';
import { dongByCode, dongs, dongsOfRegion, mapAreas, pathOfDong, wholeBox } from './ansanGeo';
import type { RecommendResult } from '../../domain/score';
import './map.css';

interface Props {
  regions: Region[];
  recommendations: RegionRecommendation[];
  levels: Record<string, 0 | 1 | 2>;
  homeDongCode?: string;
  searchConfigured?: boolean;
  exclusions?: RecommendResult['excluded'];
  onDongSelect?: (code: string) => void;
  onRegionSelect: (id: string) => void;
}

// The main map speaks familiarity only (user decision): fill = region Lv, terracotta outline =
// today's recommendation, hatching = 내 동네. Scores stay off screen; data-score is a hidden test hook.
export const FAMILIARITY = [
  { label: '아직 낯선 동네', fill: '#E1EBDD' },
  { label: '정이 드는 동네', fill: '#B6CFB5' },
  { label: '내가 좋아하는 동네', fill: '#82AE98' },
] as const;

export function ExplorationMap({ regions, recommendations, levels, homeDongCode, onRegionSelect, searchConfigured, exclusions }: Props) {
  const slider = useRef<HTMLDivElement>(null);
  const home = homeDongCode ? dongByCode(homeDongCode) : undefined;
  const [active, setActive] = useState(home?.code === mapAreas[1].dongs[0]?.code ? 1 : 0);
  const [initial] = useState(active);
  const positioned = useRef(false);
  const [hovered, setHovered] = useState<string>();
  const show = (index: number) => {
    const element = slider.current;
    if (!element) return;
    // onScroll owns the active slide. Switching it before a smooth scroll starts
    // briefly makes the focused target inert again on the first scroll frame.
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: index * element.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };
  const shapes = regions.flatMap(region => {
    const dong = dongsOfRegion(region)[0];
    if (!dong) return [];
    const item = recommendations.find(item => item.regionId === region.id);
    const rank = recommendations.findIndex(item => item.regionId === region.id) + 1;
    const score = item?.score ?? null, level = levels[region.id] ?? 0;
    const exclusion = exclusions?.find(excluded => excluded.regionId === region.id);
    const recommended = !!item && score! > 0;
    const note = recommended ? ` · 오늘의 추천 ${rank}순위`
      : searchConfigured && exclusion?.reason === 'too_far' ? ' · 선택한 거리 밖'
        : region.placeIds.length ? '' : ' · 장소 준비 중';
    const status = `${FAMILIARITY[level].label}${note}`;
    return [{ region, dong, recommended, score, level, status, fill: FAMILIARITY[level].fill,
      label: `지도 ${region.name} · ${status}${home?.code === dong.code ? ' · 내 동네' : ''} · 동네로 들어가기` }];
  });
  const onKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRegionSelect(id); }
  };
  const focus = shapes.find(shape => shape.region.id === hovered);

  return <section className="exploration-map ansan-map" aria-label="안산 탐험 지도">
    <div className="ansan-map-heading">
      <div>
        <h2>나의 안산 지도</h2>
      </div>
      <svg className="ansan-overview" viewBox={wholeBox.join(' ')} aria-hidden="true">
        {dongs.map(d => <path key={d.code} d={pathOfDong(d)} fillRule="evenodd" />)}
        <rect x={mapAreas[active].box[0]} y={mapAreas[active].box[1]} width={mapAreas[active].box[2]} height={mapAreas[active].box[3]} rx="8" />
      </svg>
    </div>
    <div className="ansan-area-tabs" role="group" aria-label="지도 지역 선택">
      {mapAreas.map((area, index) => <button type="button" key={area.id} aria-pressed={active === index} onClick={() => show(index)}>
        {area.label}{index === 1 ? ' →' : ''}
      </button>)}
    </div>
    <div className="ansan-slider" ref={element => {
      slider.current = element;
      if (element && initial && !positioned.current) { positioned.current = true; element.scrollLeft = initial * element.clientWidth; }
    }} aria-label="좌우로 넘기는 지역 지도"
      onScroll={event => setActive(Math.min(mapAreas.length - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))))}>
      {mapAreas.map((area, index) => <div className="ansan-slide" role="group" aria-label={`${area.label} 지도 · ${index + 1} / ${mapAreas.length}`}
        aria-hidden={index !== active} inert={index !== active} key={area.id}>
        <svg viewBox={area.box.join(' ')} className="ansan-svg">
          <defs><pattern id={`home-hatch-${area.id}`} width={area.box[2] / 70} height={area.box[2] / 70} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={area.box[2] / 200} height={area.box[2] / 70} fill="#293e39" opacity=".55" />
          </pattern></defs>
          {shapes.filter(shape => area.dongs.some(d => d.code === shape.dong.code)).map(shape =>
            <g key={shape.region.id} role="button" tabIndex={0} aria-label={shape.label}
              className={`ansan-region${shape.recommended ? ' recommended' : ''}`}
              onMouseEnter={() => setHovered(shape.region.id)} onFocus={() => setHovered(shape.region.id)}
              onClick={() => onRegionSelect(shape.region.id)} onKeyDown={event => onKey(event, shape.region.id)}>
              <title>{`${shape.region.name} · ${shape.status}`}</title>
              <path className="ansan-region-fill" d={pathOfDong(shape.dong)} fillRule="evenodd" data-region-id={shape.region.id}
                data-score={shape.score ?? 'unavailable'} data-level={shape.level} fill={shape.fill} />
            </g>)}
          {home && area.dongs.some(d => d.code === home.code) && <path className="ansan-home-hatch" d={pathOfDong(home)} fillRule="evenodd"
            fill={`url(#home-hatch-${area.id})`} role="img" aria-label={`내 동네 · ${home.name}`} />}
        </svg>
      </div>)}
    </div>
    <p className="map-hover" aria-live="polite">{focus ? `${focus.region.name} · ${focus.status}` : ''}</p>
    <ul className="ansan-legend" aria-label="지도 범례">
      {FAMILIARITY.map((item, level) => <li key={level}><i style={{ background: item.fill }} />{item.label}</li>)}
      <li className="legend-recommend"><i />오늘의 추천</li>
      <li className="legend-home"><i />내 동네</li>
    </ul>
  </section>;
}

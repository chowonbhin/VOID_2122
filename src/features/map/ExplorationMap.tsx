import { useRef, useState, type KeyboardEvent } from 'react';
import type { Region, RegionRecommendation } from '../../domain/types';
import { dongByCode, dongs, dongsOfRegion, geoSource, mapAreas, pathOfDong, wholeBox } from './ansanGeo';
import './map.css';

interface Props {
  regions: Region[];
  recommendations: RegionRecommendation[];
  levels: Record<string, 0 | 1 | 2>;
  homeDongCode?: string;
  onDongSelect?: (code: string) => void;
  onRegionSelect: (id: string) => void;
}

// Preserve the team's paper/green/terracotta design and urban/island slides.
// Fill shows how close the user is to each 동네 (region Lv from the shared engine), never a score.
// Recommendation is only a terracotta outline; 내 동네 is hatched.
export const FAMILIARITY = [
  { label: '잘 몰라요', fill: '#E1EBDD' },
  { label: '가끔 가요', fill: '#B6CFB5' },
  { label: '자주 가요', fill: '#82AE98' },
] as const;

export function ExplorationMap({ regions, recommendations, levels, homeDongCode, onRegionSelect }: Props) {
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
    const level = levels[region.id] ?? 0;
    const recommended = !!item && item.score > 0;
    const familiarity = `친밀도 ${FAMILIARITY[level].label}`;
    const status = recommended ? `${familiarity} · 오늘의 추천 ${rank}순위` : region.placeIds.length ? familiarity : `${familiarity} · 장소 준비 중`;
    return [{ region, dong, recommended, level, status, fill: FAMILIARITY[level].fill,
      label: `지도 ${region.name} · ${status}${home?.code === dong.code ? ' · 내 동네' : ''} · 동네로 들어가기` }];
  });
  const onKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRegionSelect(id); }
  };
  const focus = shapes.find(shape => shape.region.id === hovered);

  return <section className="exploration-map ansan-map" aria-label="안산 탐험 지도">
    <div className="ansan-map-heading">
      <div>
        <span className="score-map-kicker">ANSAN · MY NEIGHBORHOODS</span>
        <h2>나의 안산 지도</h2>
        <p className="score-map-intro">색이 짙을수록 나와 가까운 동네예요.</p>
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
          <defs>
            <pattern id={`home-hatch-${area.id}`} width={area.box[2] / 70} height={area.box[2] / 70} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={area.box[2] / 200} height={area.box[2] / 70} fill="#293e39" opacity=".55" />
            </pattern>
          </defs>
          {shapes.filter(shape => area.dongs.some(d => d.code === shape.dong.code)).map(shape =>
            <g key={shape.region.id} role="button" tabIndex={0} aria-label={shape.label}
              className={`ansan-region${shape.recommended ? ' recommended' : ''}`}
              onMouseEnter={() => setHovered(shape.region.id)} onFocus={() => setHovered(shape.region.id)}
              onClick={() => onRegionSelect(shape.region.id)} onKeyDown={event => onKey(event, shape.region.id)}>
              <title>{`${shape.region.name} · ${shape.status}`}</title>
              <path className="ansan-region-fill" d={pathOfDong(shape.dong)} fillRule="evenodd" data-region-id={shape.region.id}
                data-level={shape.level} fill={shape.fill} />
            </g>)}
          {home && area.dongs.some(d => d.code === home.code) && <path className="ansan-home-hatch" d={pathOfDong(home)} fillRule="evenodd"
            fill={`url(#home-hatch-${area.id})`} role="img" aria-label={`내 동네 · ${home.name}`} />}
        </svg>
      </div>)}
    </div>
    <p className="map-hover" aria-live="polite">{focus ? `${focus.region.name} · ${focus.status}` : '작은 동은 아래 목록에서 고를 수 있어요.'}</p>
    <ul className="ansan-legend" aria-label="지도 범례">
      {FAMILIARITY.map((item, level) => <li key={level}><i style={{ background: item.fill }} />{item.label}</li>)}
      <li className="legend-recommend"><i />테라코타 테두리: 오늘의 추천</li>
      <li className="legend-home"><i />빗금: 내 동네</li>
    </ul>
    <div className="dong-directory" aria-label="25개 행정동 목록">
      {(['단원구', '상록구'] as const).map(district => <details key={district} open>
        <summary>{district} · {shapes.filter(s => s.region.district === district).length}개 동</summary>
        <div className="dong-buttons">{shapes.filter(s => s.region.district === district).map(shape =>
          <button key={shape.region.id} aria-label={`${shape.region.name} 행정동 선택 · ${shape.status}`} onClick={() => onRegionSelect(shape.region.id)}>
            <i style={{ background: shape.fill }} /><span>{shape.region.name}</span>
            <small>{FAMILIARITY[shape.level].label}{shape.dong.code === home?.code ? ' · 내 동네' : ''}</small>
          </button>)}</div>
      </details>)}
    </div>
    <p className="map-note">경계: SGIS 공공누리 제1유형 · <a href={geoSource.url} target="_blank" rel="noreferrer">vuski/admdongkor</a> 가공 · 2026-10-01 · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. 탐색용 경계이며 오차가 있을 수 있습니다.</p>
  </section>;
}

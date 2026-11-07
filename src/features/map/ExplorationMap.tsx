import { useRef, useState, type KeyboardEvent } from 'react';
import type { Region, RegionRecommendation } from '../../domain/types';
import { dongByCode, dongs, dongsOfRegion, geoSource, mapAreas, pathOfDong, project, wholeBox } from './ansanGeo';
import { scoreColor } from './scoreColor';
import { HomeIcon } from './DongMap';
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
// Fill encodes the user's requested recommendation score; familiarity remains labelled separately.
export function ExplorationMap({ regions, recommendations, levels, homeDongCode, onRegionSelect }: Props) {
  const slider = useRef<HTMLDivElement>(null);
  const home = homeDongCode ? dongByCode(homeDongCode) : undefined;
  const [active, setActive] = useState(home?.code === mapAreas[1].dongs[0]?.code ? 1 : 0);
  const [initial] = useState(active);
  const positioned = useRef(false);
  const homeCentre = home ? project([home.labelPoint.lng, home.labelPoint.lat]) : undefined;
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
    const status = item ? `${score!.toFixed(1)}점 · ${rank}순위 · ${item.placeIds.length}/${item.placeLimit}개${item.shortfallCount ? ' · 후보 부족' : ''}`
      : region.placeIds.length ? '추천 조건 미충족 · 점수 미제공' : '데이터 준비 중';
    return [{ region, dong, item, rank, score, level, status, color: scoreColor(score),
      centre: project([dong.labelPoint.lng, dong.labelPoint.lat]),
      label: `지도 ${region.name} · ${status} · Lv.${level}${home?.code === dong.code ? ' · 내 동네' : ''} · 동네로 들어가기` }];
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
        <p className="score-map-intro">25개 행정동을 눌러보세요. 추천 점수가 높을수록 색이 짙어요.</p>
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
          {shapes.filter(shape => area.dongs.some(d => d.code === shape.dong.code)).map(shape =>
            <g key={shape.region.id} role="button" tabIndex={0} aria-label={shape.label}
              className={`ansan-region${shape.item && shape.score! > 0 ? ' recommended' : ''}`}
              onMouseEnter={() => setHovered(shape.region.id)} onFocus={() => setHovered(shape.region.id)}
              onClick={() => onRegionSelect(shape.region.id)} onKeyDown={event => onKey(event, shape.region.id)}>
              <title>{`${shape.region.name} · ${shape.status} · Lv.${shape.level}`}</title>
              <path className="ansan-region-fill" d={pathOfDong(shape.dong)} fillRule="evenodd" data-region-id={shape.region.id}
                data-score={shape.score ?? 'unavailable'} data-level={shape.level} fill={shape.color.fill} />
            </g>)}
          {home && homeCentre && area.dongs.some(d => d.code === home.code) && <g className="ansan-home" role="img" aria-label={`내 동네 · ${home.name}`}
            transform={`translate(${homeCentre[0]} ${homeCentre[1]}) scale(${area.box[2] / 420})`}>
            <circle r="17" /><path d="M0 -10 -11 -1h3v10h6v-6h4v6h6v-10h3z" />
          </g>}
        </svg>
      </div>)}
    </div>
    <p className="ansan-slide-caption">{mapAreas[active].label} · {active + 1} / {mapAreas.length} · 옆으로 넘기면 {mapAreas[1 - active].label}{active === 0 ? '가' : '이'} 보여요. 각 지역은 별도 배율로 확대했어요.</p>
    <p className="map-hover" aria-live="polite">{focus ? `${focus.region.name} · ${focus.status} · Lv.${focus.level}` : '작은 동은 아래 동 목록에서 선택하세요.'}</p>
    <div className="score-map-legend" aria-label="추천 점수 색상 범례">
      <div className="score-scale"><span>낮은 추천 점수</span><span>높은 추천 점수</span><i className="score-scale-gradient" />
        <div className="score-scale-ticks"><span>0</span><span>1,000</span><span>2,000</span><span>3,000+</span></div>
      </div>
      <span className="score-no-data"><i />회색 · 데이터 준비 중 / 조건 미충족</span>
    </div>
    <ul className="ansan-legend"><li className="legend-recommend"><i />테라코타 테두리: 추천 동네</li><li className="legend-home"><HomeIcon size={16} />내 동네</li></ul>
    <div className="dong-directory" aria-label="25개 행정동 목록">
      {(['단원구', '상록구'] as const).map(district => <details key={district} open>
        <summary>{district} · {shapes.filter(s => s.region.district === district).length}개 동</summary>
        <div className="dong-buttons">{shapes.filter(s => s.region.district === district).map(shape =>
          <button key={shape.region.id} aria-label={`${shape.region.name} 행정동 선택 · ${shape.status}`} onClick={() => onRegionSelect(shape.region.id)}>
            <i style={{ background: shape.color.fill }} /><span>{shape.region.name}</span>
            <small>{shape.item ? `${shape.score!.toFixed(1)}점 · ${shape.item.placeIds.length}/20` : shape.region.placeIds.length ? '조건 미충족' : '준비 중'}</small>
          </button>)}</div>
      </details>)}
    </div>
    <p className="map-note">경계: SGIS 공공누리 제1유형 · <a href={geoSource.url} target="_blank" rel="noreferrer">vuski/admdongkor</a> 가공 · 2026-10-01 · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. 탐색용 경계이며 오차가 있을 수 있습니다.</p>
  </section>;
}

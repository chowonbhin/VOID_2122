import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Region, RegionRecommendation } from '../../domain/types';
import { centreOf, dongs, dongsOfRegion, geoSource, mapAreas, pathOf, wholeBox } from './ansanGeo';
import './map.css';

interface Props {
  regions: Region[];
  recommendations: RegionRecommendation[];
  /** Region Lv from the shared engine (initial familiarity combined with visits). */
  levels: Record<string, 0 | 1 | 2>;
  onRegionSelect: (id: string) => void;
}

// Familiarity is shown as the fill of the real area; recommendation as a terracotta outline.
export const FAMILIARITY = [
  { label: '잘 몰라요', fill: '#E1EBDD' },
  { label: '가끔 가요', fill: '#B6CFB5' },
  { label: '자주 가요', fill: '#82AE98' },
] as const;
const LAND = '#EEE6D6';

export function ExplorationMap({ regions, recommendations, levels, onRegionSelect }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const slider = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const show = (index: number) => {
    setActive(index);
    const element = slider.current;
    if (!element) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: index * element.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };

  const shapes = regions.filter(region => dongsOfRegion(region).length).map(region => {
    const regionDongs = dongsOfRegion(region);
    const recommendation = recommendations.find(item => item.regionId === region.id);
    const rank = recommendations.findIndex(item => item.regionId === region.id) + 1;
    const score = recommendation?.score ?? null;
    const level = levels[region.id] ?? 0;
    const shortName = region.name.replace(/^[A-Z]권역 · /, '');
    const scoreText = score === null ? '추천 조건 미충족' : score > 0 ? `${score.toFixed(1)}점 · ${rank}순위` : '추천 점수 0점';
    const recommended = score !== null && score > 0;
    return {
      region, level, score, rank, shortName, recommended, scoreText,
      path: regionDongs.map(d => pathOf(d.ring)).join(''),
      centre: centreOf(regionDongs[0].ring),
      codes: regionDongs.map(d => d.code),
      label: `지도 ${region.name} · 친밀도 ${FAMILIARITY[level].label} (Lv.${level}) · ${score === null ? '추천 조건 미충족' : `추천 점수 ${score.toFixed(1)} · ${rank}순위`} · 동네로 들어가기`,
    };
  });
  const regionCodes = new Set(shapes.flatMap(shape => shape.codes));

  const onKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRegionSelect(id);
    }
  };

  return <section className="exploration-map ansan-map" aria-label="안산 탐험 지도">
    <div className="ansan-map-heading">
      <div>
        <span className="score-map-kicker">ANSAN · MY NEIGHBORHOODS</span>
        <h2>나의 안산 지도</h2>
        <p className="score-map-intro">동네를 누르면 그 동네로 들어가요. 색이 짙을수록 친한 동네예요.</p>
      </div>
      <svg className="ansan-overview" viewBox={wholeBox.join(' ')} aria-hidden="true">
        {dongs.map(d => <path key={d.code} d={pathOf(d.ring)} />)}
        <rect x={mapAreas[active].box[0]} y={mapAreas[active].box[1]} width={mapAreas[active].box[2]} height={mapAreas[active].box[3]} rx="8" />
      </svg>
    </div>

    <div className="ansan-area-tabs" role="group" aria-label="지도 지역 선택">
      {mapAreas.map((area, index) => <button type="button" key={area.id} aria-pressed={active === index} onClick={() => show(index)}>
        {area.label}{index === 1 ? ' →' : ''}
      </button>)}
    </div>

    <div className="ansan-slider" ref={slider} aria-label="좌우로 넘기는 지역 지도"
      onScroll={event => setActive(Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))}>
      {mapAreas.map((area, index) => <div className="ansan-slide" role="group" aria-label={`${area.label} 지도 · ${index + 1} / ${mapAreas.length}`} key={area.id}>
        <svg viewBox={area.box.join(' ')} className="ansan-svg">
          <defs>
            <pattern id={`${uid}dots${index}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#c9b99a" opacity=".55" />
            </pattern>
          </defs>
          <g aria-hidden="true">
            {area.dongs.filter(d => !regionCodes.has(d.code)).map(d => <path key={d.code} className="ansan-dong" d={pathOf(d.ring)} fill={LAND} />)}
            {area.dongs.map(d => <path key={d.code} d={pathOf(d.ring)} fill={`url(#${uid}dots${index})`} pointerEvents="none" />)}
          </g>
          {shapes.filter(shape => area.dongs.some(d => shape.codes.includes(d.code))).map(shape =>
            <g key={shape.region.id} role="button" tabIndex={0} aria-label={shape.label}
              className={`ansan-region${shape.recommended ? ' recommended' : ''}`}
              onClick={() => onRegionSelect(shape.region.id)} onKeyDown={event => onKey(event, shape.region.id)}>
              <title>{`${shape.region.name} · ${FAMILIARITY[shape.level].label} · ${shape.scoreText}`}</title>
              <path className="ansan-region-fill" d={shape.path} data-region-id={shape.region.id}
                data-score={shape.score ?? 'unavailable'} data-level={shape.level} fill={FAMILIARITY[shape.level].fill} />
            </g>)}
          {shapes.filter(shape => area.dongs.some(d => shape.codes.includes(d.code))).map(shape =>
            <text key={shape.region.id} className="ansan-region-label" x={shape.centre[0]} y={shape.centre[1]} aria-hidden="true"
              style={{ fontSize: area.box[2] * 0.042, strokeWidth: area.box[2] * 0.012 }}>
              <tspan x={shape.centre[0]}>{shape.shortName}</tspan>
              {shape.recommended && <tspan x={shape.centre[0]} dy="1.2em" className="ansan-region-rank">{shape.rank}순위</tspan>}
            </text>)}
          {area.id === 'island' && <text className="ansan-context" x={area.box[0] + area.box[2] / 2} y={area.box[1] + 28} aria-hidden="true">대부도 · 별도 배율</text>}
        </svg>
      </div>)}
    </div>
    <p className="ansan-slide-caption">{mapAreas[active].label} · {active + 1} / {mapAreas.length} · 옆으로 넘기면 {mapAreas[1 - active].label}{active === 0 ? '가' : '이'} 보여요. 각 지역은 별도 배율로 확대했어요.</p>

    <ul className="ansan-legend" aria-label="친밀도 색상 범례">
      {FAMILIARITY.map((item, level) => <li key={level}><i style={{ background: item.fill }} />{item.label} · Lv.{level}</li>)}
      <li><i className="legend-land" />탐험 데이터 준비 중</li>
      <li className="legend-recommend"><i />테라코타 테두리: 추천 동네</li>
    </ul>
    <p className="map-note">
      실제 좌표 기반 · {geoSource.label.replace(/ ·.*/, '')} 2013년 행정경계(최신 경계 아님)로 그렸어요. 탐험권역은 그 권역이 속한 행정동 면으로 표시합니다.{' '}
      <a href={geoSource.url} target="_blank" rel="noreferrer">경계 데이터 출처</a>
    </p>
  </section>;
}

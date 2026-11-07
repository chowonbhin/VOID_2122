import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { memoriesInDong } from '../../data/sampleMemories';
import type { Region, RegionRecommendation } from '../../domain/types';
import { centreOf, dongByCode, dongs, dongsOfRegion, geoSource, mapAreas, pathOf, wholeBox } from './ansanGeo';
import { HomeIcon } from './DongMap';
import './map.css';

interface Props {
  regions: Region[];
  recommendations: RegionRecommendation[];
  /** Region Lv from the shared engine (initial familiarity combined with visits). */
  levels: Record<string, 0 | 1 | 2>;
  homeDongCode?: string;
  onRegionSelect: (id: string) => void;
  onDongSelect: (code: string) => void;
}

// Familiarity is shown as the fill of the real area; recommendation as a terracotta outline.
export const FAMILIARITY = [
  { label: '잘 몰라요', fill: '#E1EBDD' },
  { label: '가끔 가요', fill: '#B6CFB5' },
  { label: '자주 가요', fill: '#82AE98' },
] as const;
const LAND = '#EEE6D6';
/** 동네 without exploration data: shade by recorded memories with the same 1–2 / 3+ steps as region Lv. */
const memoryLevel = (count: number) => (count >= 3 ? 2 : count >= 1 ? 1 : null);

export function ExplorationMap({ regions, recommendations, levels, homeDongCode, onRegionSelect, onDongSelect }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const slider = useRef<HTMLDivElement>(null);
  const home = homeDongCode ? dongByCode(homeDongCode) : undefined;
  const [active, setActive] = useState(home?.code === mapAreas[1].dongs[0]?.code ? 1 : 0);
  const [initial] = useState(active);
  const positioned = useRef(false);

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
    const scoreText = score === null ? '추천 조건 미충족' : score > 0 ? `${score.toFixed(1)}점 · ${rank}순위` : '추천 점수 0점';
    return {
      region, level, score, scoreText, recommended: score !== null && score > 0,
      path: regionDongs.map(d => pathOf(d.ring)).join(''),
      codes: regionDongs.map(d => d.code),
      label: `지도 ${region.name} · 친밀도 ${FAMILIARITY[level].label} (Lv.${level}) · ${score === null ? '추천 조건 미충족' : `추천 점수 ${score.toFixed(1)} · ${rank}순위`}${region.dongCodes?.includes(homeDongCode ?? '') ? ' · 내 동네' : ''} · 동네로 들어가기`,
    };
  });
  const regionCodes = new Set(shapes.flatMap(shape => shape.codes));
  const others = dongs.filter(d => !regionCodes.has(d.code)).map(dong => {
    const count = memoriesInDong(dong.code).length;
    const level = memoryLevel(count);
    return {
      dong, level, fill: level === null ? LAND : FAMILIARITY[level].fill,
      label: `지도 ${dong.name} · ${count ? `추억 ${count}개` : '아직 기록 없음'}${dong.code === homeDongCode ? ' · 내 동네' : ''} · 동네로 들어가기`,
    };
  });

  const activate = (event: KeyboardEvent, open: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };
  const homeCentre = home ? centreOf(home.ring) : null;

  return <section className="exploration-map ansan-map" aria-label="안산 탐험 지도">
    <div className="ansan-map-heading">
      <div>
        <span className="score-map-kicker">ANSAN · MY NEIGHBORHOODS</span>
        <h2>나의 안산 지도</h2>
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

    <div className="ansan-slider" aria-label="좌우로 넘기는 지역 지도"
      ref={element => {
        slider.current = element;
        // Start on 대부도 when it is 내 동네; only once, so scrolling back is never undone.
        if (element && initial && !positioned.current) { positioned.current = true; element.scrollLeft = initial * element.clientWidth; }
      }}
      onScroll={event => setActive(Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))}>
      {mapAreas.map((area, index) => <div className="ansan-slide" role="group" aria-label={`${area.label} 지도 · ${index + 1} / ${mapAreas.length}`} key={area.id}>
        <svg viewBox={area.box.join(' ')} className="ansan-svg">
          <defs>
            <pattern id={`${uid}dots${index}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#c9b99a" opacity=".55" />
            </pattern>
          </defs>
          {others.filter(item => area.dongs.includes(item.dong)).map(item =>
            <g key={item.dong.code} role="button" tabIndex={0} aria-label={item.label} className="ansan-region ansan-other"
              onClick={() => onDongSelect(item.dong.code)} onKeyDown={event => activate(event, () => onDongSelect(item.dong.code))}>
              <title>{item.label.replace(/^지도 /, '').replace(/ · 동네로 들어가기$/, '')}</title>
              <path className="ansan-region-fill" d={pathOf(item.dong.ring)} data-dong-code={item.dong.code} fill={item.fill} />
            </g>)}
          {shapes.filter(shape => area.dongs.some(d => shape.codes.includes(d.code))).map(shape =>
            <g key={shape.region.id} role="button" tabIndex={0} aria-label={shape.label}
              className={`ansan-region${shape.recommended ? ' recommended' : ''}`}
              onClick={() => onRegionSelect(shape.region.id)} onKeyDown={event => activate(event, () => onRegionSelect(shape.region.id))}>
              <title>{`${shape.region.name} · ${FAMILIARITY[shape.level].label} · ${shape.scoreText}`}</title>
              <path className="ansan-region-fill" d={shape.path} data-region-id={shape.region.id}
                data-score={shape.score ?? 'unavailable'} data-level={shape.level} fill={FAMILIARITY[shape.level].fill} />
            </g>)}
          {area.dongs.map(d => <path key={d.code} d={pathOf(d.ring)} fill={`url(#${uid}dots${index})`} pointerEvents="none" aria-hidden="true" />)}
          {home && homeCentre && area.dongs.includes(home) && <g className="ansan-home" role="img" aria-label={`내 동네 · ${home.name}`}
            transform={`translate(${homeCentre[0]} ${homeCentre[1]}) scale(${area.box[2] / 420})`}>
            <circle r="17" />
            <path d="M0 -10 -11 -1h3v10h6v-6h4v6h6v-10h3z" />
          </g>}
        </svg>
      </div>)}
    </div>

    <ul className="ansan-legend" aria-label="지도 범례">
      {FAMILIARITY.map((item, level) => <li key={level}><i style={{ background: item.fill }} />{item.label} · Lv.{level}</li>)}
      <li><i className="legend-land" />아직 기록 없음</li>
      <li className="legend-recommend"><i />테라코타 테두리: 추천 동네</li>
      <li className="legend-home"><HomeIcon size={16} />내 동네</li>
    </ul>
    <p className="map-note">
      실제 좌표 기반 2013년 행정경계(최신 경계 아님) · 탐험권역은 엔진 Lv, 다른 동네는 남긴 추억 수로 색칠해요 ·{' '}
      <a href={geoSource.url} target="_blank" rel="noreferrer">경계 데이터 출처</a>
    </p>
  </section>;
}

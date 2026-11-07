import { useRef, useState, type KeyboardEvent } from 'react';
import type { Region, RegionRecommendation } from '../../domain/types';
import { dongByCode, dongs, dongsOfRegion, mapAreas, pathOfDong, project, wholeBox } from './ansanGeo';
import { scoreColor } from './scoreColor';
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

// Keep the team's familiarity palette and hatched home area. The user's score
// map remains the default; both views share the same real recommendations.
export const FAMILIARITY = [
  { label: '아직 낯선 동네', fill: '#E1EBDD' },
  { label: '정이 드는 동네', fill: '#B6CFB5' },
  { label: '내가 좋아하는 동네', fill: '#82AE98' },
] as const;

export function ExplorationMap({ regions, recommendations, levels, homeDongCode, onRegionSelect, searchConfigured, exclusions }: Props) {
  const [mode, setMode] = useState<'score' | 'familiarity'>('score');
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
    const status = item ? `${score!.toFixed(1)}점 · ${rank}순위 · ${item.placeIds.length}/${item.placeLimit}개${item.shortfallCount ? ' · 후보 부족' : ''}`
      : !searchConfigured ? '시각·조건 미선택' : exclusion?.reason === 'too_far' ? '선택한 거리 밖'
        : region.placeIds.length ? '점수 확인 중 · 조건 충족 0/20' : '데이터 준비 중';
    const displayStatus = mode === 'score' ? status : `친밀도 ${FAMILIARITY[level].label}${item && score! > 0 ? ` · 오늘의 추천 ${rank}순위` : ''}`;
    return [{ region, dong, item, rank, score, level, status: displayStatus, color: mode === 'score' ? scoreColor(score) : { fill: FAMILIARITY[level].fill, text: '#293e39' },
      centre: project([dong.labelPoint.lng, dong.labelPoint.lat]),
      label: `지도 ${region.name} · ${displayStatus} · Lv.${level}${home?.code === dong.code ? ' · 내 동네' : ''} · 동네로 들어가기` }];
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
        <p className="score-map-intro">{mode === 'score' ? '25개 행정동을 눌러보세요. 추천 점수가 높을수록 색이 짙어요.' : '색이 짙을수록 내가 좋아하는 동네예요.'}</p>
      </div>
      <svg className="ansan-overview" viewBox={wholeBox.join(' ')} aria-hidden="true">
        {dongs.map(d => <path key={d.code} d={pathOfDong(d)} fillRule="evenodd" />)}
        <rect x={mapAreas[active].box[0]} y={mapAreas[active].box[1]} width={mapAreas[active].box[2]} height={mapAreas[active].box[3]} rx="8" />
      </svg>
    </div>
    <div className="ansan-area-tabs" role="group" aria-label="지도 색상 기준">
      <button type="button" aria-pressed={mode === 'score'} onClick={() => setMode('score')}>점수 보기</button>
      <button type="button" aria-pressed={mode === 'familiarity'} onClick={() => setMode('familiarity')}>친밀도 보기</button>
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
              className={`ansan-region${mode === 'familiarity' && shape.item && shape.score! > 0 ? ' recommended' : ''}`}
              onMouseEnter={() => setHovered(shape.region.id)} onFocus={() => setHovered(shape.region.id)}
              onClick={() => onRegionSelect(shape.region.id)} onKeyDown={event => onKey(event, shape.region.id)}>
              <title>{`${shape.region.name} · ${shape.status} · Lv.${shape.level}`}</title>
              <path className="ansan-region-fill" d={pathOfDong(shape.dong)} fillRule="evenodd" data-region-id={shape.region.id}
                data-score={shape.score ?? 'unavailable'} data-level={shape.level} fill={shape.color.fill} />
            </g>)}
          {home && area.dongs.some(d => d.code === home.code) && <path className="ansan-home-hatch" d={pathOfDong(home)} fillRule="evenodd"
            fill={`url(#home-hatch-${area.id})`} role="img" aria-label={`내 동네 · ${home.name}`} />}
          {/* Paint labels after every polygon so neighbours cannot cover the text. */}
          {shapes.filter(shape => area.dongs.some(d => d.code === shape.dong.code)).map(shape =>
            <text key={shape.region.id} className="ansan-region-label" x={shape.centre[0]} y={shape.centre[1]} textAnchor="middle"
              fontSize={area.box[2] / 88} fill={shape.color.text} aria-hidden="true">
              <tspan x={shape.centre[0]}>{shape.region.name}</tspan>
              {mode === 'score' && <tspan x={shape.centre[0]} dy="1.25em">{shape.item ? shape.score!.toFixed(1) : '—'}</tspan>}
            </text>)}
        </svg>
      </div>)}
    </div>
    <p className="ansan-slide-caption">{mapAreas[active].label} · {active + 1} / {mapAreas.length} · 옆으로 넘기면 {mapAreas[1 - active].label}{active === 0 ? '가' : '이'} 보여요. 각 지역은 별도 배율로 확대했어요.</p>
    <p className="map-hover" aria-live="polite">{focus ? `${focus.region.name} · ${focus.status} · Lv.${focus.level}` : '작은 동은 아래 동 목록에서 선택하세요.'}</p>
    {mode === 'score' && <div className="score-map-legend" aria-label="추천 점수 색상 범례">
      <div className="score-scale"><span>낮은 추천 점수</span><span>높은 추천 점수</span><i className="score-scale-gradient" />
        <div className="score-scale-ticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      </div>
      <span className="score-no-data"><i />회색 · 점수 미제공 (0점과 구분)</span>
    </div>}
    <ul className="ansan-legend" aria-label="지도 범례">
      {mode === 'score' ? <li>숫자: 100점 만점 지역 점수 · 반영 장소 수는 동을 선택해 확인</li> : <>
        {FAMILIARITY.map((item, level) => <li key={level}><i style={{ background: item.fill }} />{item.label}</li>)}
        <li className="legend-recommend"><i />테라코타 테두리: 오늘의 추천</li>
      </>}
      <li className="legend-home"><i />빗금: 내 동네</li>
    </ul>
    <details className="dong-directory" aria-label="25개 행정동 목록"><summary>동 이름으로 찾기</summary>
      {(['단원구', '상록구'] as const).map(district => <details key={district} open>
        <summary>{district} · {shapes.filter(s => s.region.district === district).length}개 동</summary>
        <div className="dong-buttons">{shapes.filter(s => s.region.district === district).map(shape =>
          <button key={shape.region.id} aria-label={`${shape.region.name} 행정동 선택 · ${shape.status}`} onClick={() => onRegionSelect(shape.region.id)}>
            <i style={{ background: shape.color.fill }} /><span>{shape.region.name}</span>
            <small>{mode === 'familiarity' ? FAMILIARITY[shape.level].label : shape.item ? `${shape.score!.toFixed(1)}점 · ${shape.item.placeIds.length}/20` : !searchConfigured ? '조건 미선택' : '점수 미제공'}</small>
          </button>)}</div>
      </details>)}
    </details>
  </section>;
}

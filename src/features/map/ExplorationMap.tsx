import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon';
import type { Region, RegionRecommendation } from '../../domain/types';
import { dongByCode, dongsOfRegion, mapAreas, pathOfDong, project } from './ansanGeo';
import type { RecommendResult } from '../../domain/score';
import { useExitTransition } from '../navigation/useExitTransition';
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

// Familiarity fills retain the original green scale. Only the top three picks
// get an accent outline and a rank pin; the rest stay quiet geographic context.
// Scores stay off screen; data-score is a hidden test hook.
export const FAMILIARITY = [
  { label: '아직 낯선 동네', fill: 'var(--color-map-familiarity-0)' },
  { label: '정이 드는 동네', fill: 'var(--color-map-familiarity-1)' },
  { label: '내가 좋아하는 동네', fill: 'var(--color-map-familiarity-2)' },
] as const;

export function ExplorationMap({ regions, recommendations, levels, homeDongCode, onRegionSelect, searchConfigured, exclusions }: Props) {
  const slider = useRef<HTMLDivElement>(null);
  const home = homeDongCode ? dongByCode(homeDongCode) : undefined;
  const [active, setActive] = useState(home?.code === mapAreas[1].dongs[0]?.code ? 1 : 0);
  const [initial] = useState(active);
  const positioned = useRef(false);
  const [hovered, setHovered] = useState<string>();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [mapWidth, setMapWidth] = useState(320);
  const regionElements = useRef(new Map<string, SVGGElement>());
  const pendingFocus = useRef<string | null>(null);
  const { exit, pending } = useExitTransition();
  useEffect(() => {
    const element = slider.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setMapWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pendingFocus.current) return;
    const element = regionElements.current.get(pendingFocus.current);
    if (element && !element.closest('[inert]')) {
      element.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [selected, active]);
  const show = (index: number, animate = true) => {
    const element = slider.current;
    if (!element) return;
    // onScroll owns the active slide. Switching it before a smooth scroll starts
    // briefly makes the focused target inert again on the first scroll frame.
    const smooth = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    const note = searchConfigured && exclusion?.reason === 'too_far' ? ' · 선택한 거리 밖'
        : region.placeIds.length ? '' : ' · 장소 준비 중';
    const status = `${FAMILIARITY[level].label}${note}`;
    return [{ region, dong, recommended, rank, score, level, status, fill: FAMILIARITY[level].fill,
      label: `지도 ${region.name} · ${status}${recommended ? ` · 오늘의 추천 ${rank}순위` : ''}${home?.code === dong.code ? ' · 내 동네' : ''} · 동네로 들어가기` }];
  });
  const enterRegion = (id: string) => {
    const region = regionElements.current.get(id);
    const svg = region?.ownerSVGElement;
    let center = 'translate(0px, 0px)';
    if (region && svg) {
      const bounds = region.getBoundingClientRect(), frame = svg.getBoundingClientRect();
      const x = bounds.x + bounds.width / 2 - frame.x, y = bounds.y + bounds.height / 2 - frame.y;
      svg.style.transformOrigin = `${x}px ${y}px`;
      center = `translate(${frame.width / 2 - x}px, ${frame.height / 2 - y}px)`;
    }
    exit(svg ?? null, [
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      { transform: `${center} scale(2.1)`, opacity: 1, offset: .8 },
      { transform: `${center} scale(2.4)`, opacity: 0 },
    ], () => onRegionSelect(id), 320);
  };
  const onKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enterRegion(id); }
  };
  const focus = shapes.find(shape => shape.region.id === hovered);
  const normalizedQuery = query.replace(/\s/g, '').toLocaleLowerCase('ko-KR');
  const matches = normalizedQuery ? shapes.filter(shape =>
    `${shape.dong.district}${shape.region.name}`.includes(normalizedQuery)
    || (normalizedQuery === '대부도' && shape.region.name === '대부동'))
    .sort((a, b) => a.region.name.localeCompare(b.region.name, 'ko')) : [];
  const selectResult = (shape: typeof shapes[number]) => {
    const index = mapAreas.findIndex(area => area.dongs.some(dong => dong.code === shape.dong.code));
    pendingFocus.current = shape.region.id;
    setSelected(shape.region.id);
    setHovered(shape.region.id);
    setQuery(shape.region.name);
    setSearchOpen(false);
    show(index, false);
    setActive(index);
    // Re-selecting the same result does not trigger the focus effect again.
    if (index === active) {
      regionElements.current.get(shape.region.id)?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  };

  return <section className="exploration-map ansan-map" aria-label="안산 탐험 지도">
    <div className="ansan-map-heading">
      <div>
        <h2><span className="title-prefix">나의 </span><span className="title-accent">안산 지도</span></h2>
      </div>
      <form className="map-search" role="search" aria-label="지도 지역 검색"
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}
        onKeyDown={event => { if (event.key === 'Escape') setSearchOpen(false); }}
        onSubmit={event => {
          event.preventDefault();
          const exact = matches.find(shape => shape.region.name === normalizedQuery);
          if (exact || matches.length === 1) selectResult(exact ?? matches[0]);
          else setSearchOpen(true);
        }}>
        <div className="map-search-field">
          <input type="search" aria-label="지역 검색" placeholder="지역 검색" value={query}
            aria-controls="map-search-results" autoComplete="off"
            onFocus={() => setSearchOpen(true)} onChange={event => {
              setQuery(event.target.value);
              setSearchOpen(true);
              setSelected(undefined);
              setHovered(undefined);
              pendingFocus.current = null;
            }} />
          <button type="submit" aria-label="지역 찾기">
            <Icon name="search" size={20} />
          </button>
        </div>
        {searchOpen && normalizedQuery && <div className="map-search-dropdown">
          {matches.length ? <ul id="map-search-results" aria-label="지역 검색 결과">
            {matches.map(shape => <li key={shape.region.id}><button type="button" onClick={() => selectResult(shape)}>
              <strong>{shape.region.name}</strong><span>{shape.dong.district}</span>
            </button></li>)}
          </ul> : <p role="status">일치하는 동네가 없어요.</p>}
        </div>}
      </form>
    </div>
    <div className={`ansan-map-stage${pending ? ' is-entering' : ''}`} aria-busy={pending} onMouseLeave={() => setHovered(undefined)}>
    <div className="ansan-slider" ref={element => {
      slider.current = element;
      if (element && initial && !positioned.current) { positioned.current = true; element.scrollLeft = initial * element.clientWidth; }
    }} aria-label="좌우로 넘기는 지역 지도"
      onScroll={event => setActive(Math.min(mapAreas.length - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))))}>
      {mapAreas.map((area, index) => {
        // Keep pins readable at any viewport, including SVG letterboxing on wide screens.
        const unit = Math.max(area.box[2] / Math.max(1, mapWidth), area.box[3] / Math.min(Math.max(1, mapWidth) * .75, 640));
        const pins = shapes.filter(shape => shape.recommended && shape.rank <= 3 && area.dongs.some(dong => dong.code === shape.dong.code))
          .sort((a, b) => a.rank - b.rank)
          .map(shape => { const [x, y] = project([shape.dong.labelPoint.lng, shape.dong.labelPoint.lat]); return { shape, x, y, anchorX: x, anchorY: y }; });
        // Nudge nearby pins apart; leader lines retain the real dong positions.
        for (let round = 0; round < 40; round++) {
          for (let a = 0; a < pins.length; a++) for (let b = a + 1; b < pins.length; b++) {
            const left = pins[a], right = pins[b];
            const dx = right.x - left.x || .001, dy = right.y - left.y;
            const distance = Math.hypot(dx, dy), gap = 64 * unit;
            if (distance < gap) {
              const push = (gap - distance) / 2;
              left.x -= dx / distance * push; left.y -= dy / distance * push;
              right.x += dx / distance * push; right.y += dy / distance * push;
            }
          }
          for (const pin of pins) {
            pin.x = Math.max(area.box[0] + 24 * unit, Math.min(area.box[0] + area.box[2] - 24 * unit, pin.x));
            pin.y = Math.max(area.box[1] + 24 * unit, Math.min(area.box[1] + area.box[3] - 24 * unit, pin.y));
          }
        }
        return <div className="ansan-slide" role="group" aria-label={`${area.label} 지도 · ${index + 1} / ${mapAreas.length}`}
        aria-hidden={index !== active} inert={index !== active} key={area.id}>
        <svg viewBox={area.box.join(' ')} className="ansan-svg">
          <defs><pattern id={`home-hatch-${area.id}`} width={area.box[2] / 70} height={area.box[2] / 70} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={area.box[2] / 200} height={area.box[2] / 70} fill="var(--color-map-hatch)" opacity=".55" />
          </pattern></defs>
          {shapes.filter(shape => area.dongs.some(d => d.code === shape.dong.code)).map(shape =>
            <g key={shape.region.id} role="button" tabIndex={0} aria-label={shape.label}
              ref={element => { if (element) regionElements.current.set(shape.region.id, element); else regionElements.current.delete(shape.region.id); }}
              className={`ansan-region${shape.recommended && shape.rank <= 3 ? ' recommended' : ''}${shape.region.id === selected ? ' search-selected' : ''}`}
              onMouseEnter={() => setHovered(shape.region.id)} onFocus={() => setHovered(shape.region.id)}
              onMouseLeave={() => setHovered(undefined)} onBlur={() => setHovered(undefined)}
              onClick={() => enterRegion(shape.region.id)} onKeyDown={event => onKey(event, shape.region.id)}>
              <title>{`${shape.region.name} · ${shape.status}`}</title>
              <path className="ansan-region-fill" d={pathOfDong(shape.dong)} fillRule="evenodd" data-region-id={shape.region.id}
                data-score={shape.score ?? 'unavailable'} data-level={shape.level} fill={shape.fill} />
            </g>)}
          {home && area.dongs.some(d => d.code === home.code) && <path className="ansan-home-hatch" d={pathOfDong(home)} fillRule="evenodd"
            fill={`url(#home-hatch-${area.id})`} role="img" aria-label={`내 동네 · ${home.name}`} />}
          {shapes.filter(shape => shape.region.id === selected && area.dongs.some(d => d.code === shape.dong.code)).map(shape =>
            <g key={shape.region.id} className="map-search-highlight" aria-hidden="true">
              <path d={pathOfDong(shape.dong)} className="map-search-halo" />
              <path d={pathOfDong(shape.dong)} className="map-search-outline" />
            </g>)}
          {pins.map(pin => <g key={pin.shape.region.id} className="map-rank-marker">
            <line x1={pin.anchorX} y1={pin.anchorY} x2={pin.x} y2={pin.y} className="map-rank-leader" />
            <circle cx={pin.anchorX} cy={pin.anchorY} r={2.5 * unit} className="map-rank-anchor" />
            <g role="button" tabIndex={0} className="map-rank-pin" aria-label={`추천 ${pin.shape.rank}위 ${pin.shape.region.name} 동네로 들어가기`}
              transform={`translate(${pin.x} ${pin.y}) scale(${unit})`}
              onMouseEnter={() => setHovered(pin.shape.region.id)} onFocus={() => setHovered(pin.shape.region.id)}
              onMouseLeave={() => setHovered(undefined)} onBlur={() => setHovered(undefined)}
              onClick={() => enterRegion(pin.shape.region.id)} onKeyDown={event => onKey(event, pin.shape.region.id)}>
              <circle r="22" className="map-rank-hit" />
              <circle r="21" className="map-rank-face" />
              <text textAnchor="middle" dominantBaseline="central" aria-hidden="true">{pin.shape.rank}</text>
            </g>
          </g>)}
        </svg>
      </div>; })}
    </div>
      <button type="button" className="map-area-arrow previous" aria-label="이전 지도" title="안산 도심"
        disabled={active === 0} onClick={() => { setHovered(undefined); show(active - 1); }}>
        <Icon name="chevronLeft" size={24} />
      </button>
      <button type="button" className="map-area-arrow next" aria-label="다음 지도" title="대부도"
        disabled={active === mapAreas.length - 1} onClick={() => { setHovered(undefined); show(active + 1); }}>
        <Icon name="chevronRight" size={24} />
      </button>
      <p className="map-hover" aria-live="polite">{focus ? `${focus.region.name} · ${focus.status}` : ''}</p>
    </div>
    <ul className="ansan-legend" aria-label="지도 범례">
      {FAMILIARITY.map((item, level) => <li key={level}><i style={{ background: item.fill }} />{item.label}</li>)}
      <li className="legend-recommend"><i />오늘의 추천</li>
      <li className="legend-home"><i><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M-3 5 5-3M-3 11 11-3M1 13 13 1M7 13 13 7" /></svg></i>내 동네</li>
    </ul>
  </section>;
}

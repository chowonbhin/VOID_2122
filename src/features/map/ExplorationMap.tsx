import { useId } from 'react';
import type { Place, Region, RegionRecommendation } from '../../domain/types';
import { scoreColor } from './scoreColor';
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

// Schematic, enlarged exploration areas; retain polygon edges and soften only the corners.
function softenedPolygon(points: [number, number][], radius = 7) {
  const corners = points.map((point, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const approach = (other: [number, number]) => {
      const distance = Math.hypot(other[0] - point[0], other[1] - point[1]);
      const ratio = Math.min(radius / distance, 0.25);
      return [point[0] + (other[0] - point[0]) * ratio, point[1] + (other[1] - point[1]) * ratio];
    };
    return { point, before: approach(previous), after: approach(next) };
  });
  return corners.map(({ point, before, after }, i) => `${i ? 'L' : 'M'}${before.join(' ')} Q${point.join(' ')} ${after.join(' ')}`).join(' ') + ' Z';
}
const areas: Record<string, { path: string; x: number; y: number }> = {
  'region-b': { path: softenedPolygon([[232, 167], [351, 142], [408, 190], [426, 281], [374, 318], [249, 309], [231, 254]]), x: 326, y: 233 },
  'region-a': { path: softenedPolygon([[435, 194], [537, 167], [591, 203], [624, 271], [586, 336], [473, 350], [445, 304]]), x: 529, y: 263 },
};
const mainland = softenedPolygon([[212, 187], [220, 142], [299, 91], [347, 76], [402, 105], [439, 90], [486, 54], [523, 70], [575, 112], [646, 96], [675, 125], [681, 166], [726, 196], [735, 222], [711, 285], [726, 338], [664, 392], [627, 407], [567, 400], [520, 443], [485, 440], [438, 412], [355, 429], [325, 408], [293, 372], [251, 359], [196, 372], [202, 314], [218, 284], [186, 238]]);
const island = softenedPolygon([[78, 342], [101, 324], [151, 342], [183, 325], [216, 363], [218, 389], [183, 412], [191, 443], [145, 467], [111, 450], [100, 425], [58, 434], [46, 391], [64, 366]]);
const detailShape = softenedPolygon([[91, 111], [280, 82], [386, 65], [499, 119], [551, 269], [466, 367], [297, 388], [148, 348], [86, 284]], 9);

// Stable slots rather than geographic pins: every numbered place remains reachable on a phone.
// Sorting by ID keeps a place in the same slot when recommendation order changes.
const placeSlots = [[29, 38], [53, 34], [74, 52], [60, 75], [30, 72]];
function placePosition(place: Place, places: Place[]) {
  const index = [...places].sort((a, b) => a.id.localeCompare(b.id)).findIndex(item => item.id === place.id);
  const [left, top] = placeSlots[index] ?? [25 + (index % 3) * 25, 38 + Math.floor(index / 3) * 20];
  return { left: `${left}%`, top: `${top}%` };
}

export function ExplorationMap(props: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const selected = props.regions.find(region => region.id === props.selectedRegionId);
  const visibleRegions = selected ? [selected] : props.regions.filter(region => areas[region.id]);
  const labels = visibleRegions.map(region => {
    const recommendation = props.recommendations.find(item => item.regionId === region.id);
    const rank = props.recommendations.findIndex(item => item.regionId === region.id) + 1;
    const score = recommendation?.score ?? null;
    const color = scoreColor(score);
    const layout = selected ? { path: detailShape, x: 320, y: 75 } : areas[region.id];
    const label = `${region.name} · ${score === null ? '추천 조건 미충족' : `추천 점수 ${score.toFixed(1)} · ${rank}순위`} · 상세 보기`;
    return { region, rank, score, color, layout, label };
  });

  return <section className={`exploration-map score-map${selected ? ' score-map-detail' : ''}`} aria-label="안산 탐험 지도">
    <div className="score-map-heading">
      <div><span className="score-map-kicker">ANSAN · EXPLORE</span><h2 id={titleId}>{selected ? '이 권역의 탐험 장소' : '안산의 탐험 점수'}</h2></div>
      <span className="score-map-city">안산시</span>
    </div>
    <p className="score-map-intro" id={descriptionId}>{selected ? '장소 번호를 누르면 해당 추천 카드를 볼 수 있어요.' : '마음이 가는 동네를 눌러보세요. 점수가 높을수록 색이 짙어요.'}</p>
    <div className={`map-canvas score-map-canvas${selected ? ' score-map-canvas-detail' : ''}`} aria-busy="false">
      <svg viewBox={selected ? '0 0 640 440' : '0 0 760 500'} className="score-map-svg" aria-labelledby={titleId} aria-describedby={descriptionId}>
        {!selected && <g className="score-map-context" aria-hidden="true">
          <path d={mainland} className="city-silhouette" />
          <path d={island} className="city-island" />
          <path d="M224 383 Q250 401 278 389" className="city-connector" />
          <text x="469" y="127" className="context-label">그 외 안산 권역</text>
          <text x="481" y="412" className="context-label context-small">추천 데이터 준비 중</text>
          <text x="132" y="386" className="context-label">대부도</text>
          <text x="133" y="408" className="context-label context-small">준비 중</text>
          <path d="M690 50 L690 23 M682 32 L690 23 L698 32" className="north-arrow" />
          <text x="690" y="71" className="context-label context-small">북</text>
        </g>}
        {labels.map(({ region, color, layout, label, score }) => <g key={region.id}
          className="score-region" aria-hidden="true" onClick={() => props.onRegionSelect(region.id)}>
          <title>{label}</title>
          <path className="score-region-fill" data-region-id={region.id} data-score={score ?? 'unavailable'} d={layout.path} fill={color.fill} />
        </g>)}
      </svg>
      {labels.map(({ region, color, layout, score, rank, label }) => <button type="button" key={region.id}
        className={`score-area-label${selected ? ' score-detail-label' : ''}`}
        style={selected ? { color: '#193e30' } : { left: `${layout.x / 760 * 100}%`, top: `${layout.y / 500 * 100}%`, color: color.text }}
        aria-label={`지도 ${label}`} aria-pressed={selected?.id === region.id} onClick={() => props.onRegionSelect(region.id)}>
        <span className="score-area-title">{region.name.replace(/^[AB]권역 · /, '').split('·').map((word, index) => <span key={index}>{word}</span>)}</span>
        <strong className="score-area-value">{score === null ? '—' : score.toFixed(1)}<small>{score === null ? '' : '점'}</small></strong>
        <span className="score-area-rank">{score === null ? '조건 미충족' : score > 0 ? `${rank}순위` : '추천 점수 0점'}</span>
      </button>)}
      {selected && (props.places ?? []).map((place, index) => <button type="button" key={place.id}
        className={`map-place-marker${place.id === props.selectedPlaceId ? ' active' : ''}`}
        style={placePosition(place, props.places ?? [])} aria-label={`${place.name} 지도에서 선택`}
        aria-pressed={place.id === props.selectedPlaceId} onClick={() => props.onPlaceSelect?.(place.id)}>{index + 1}</button>)}
    </div>
    <div className="score-map-legend" aria-label="점수 색상 범례">
      <div className="score-scale"><span>낮은 추천 점수</span><span>높은 추천 점수</span>
        <div className="score-scale-gradient" /><div className="score-scale-ticks"><span>0</span><span>100</span><span>200</span><span>300+</span></div>
      </div>
      <span className="score-no-data"><i /> 회색 · 미제공 / 조건 미충족</span>
    </div>
    <p className="map-note">{selected ? '장소 번호는 추천 목록과 연결되며 실제 위치·거리를 나타내지 않습니다.' : '안산의 위치·크기를 단순화한 탐험권역도입니다. 실제 행정 경계와 다르며, 회색 영역은 0점이 아닙니다.'}</p>
  </section>;
}

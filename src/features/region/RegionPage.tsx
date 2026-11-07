// Region map/detail; score and visit state come from the shared engine.
import { useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { content, placesOfRegion, regionById } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { eventState, recommend, scorePlaces } from '../../domain/score';
import { go } from '../../route';
import { ExplorationMap } from '../map/ExplorationMap';
import { VisitPanel } from '../visits/VisitPanel';

const statusLabel = { open: '운영 중', closed: '휴무·이용 마감', unknown: '운영정보 미확인' };
const eventLabel = { active: '진행 중', cancelled: '취소', ended: '종료', upcoming: '예정', not_now: '선택 시각 외', condition_unknown: '참여 조건 확인 필요' };

export function RegionPage({ regionId }: { regionId: string }) {
  const { state } = useAppState();
  const [selectedId, setSelectedId] = useState<string>();
  const cards = useRef<Record<string, HTMLLIElement | null>>({});
  const region = regionById(regionId);
  if (!region) return <section>
    <h1>권역을 찾을 수 없어요</h1>
    <button onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
  </section>;
  const scores = state.search ? scorePlaces(region, content, state.profile, state.visits, state.search) : [];
  const places = [...placesOfRegion(region.id)].sort((a, b) => {
    const left = scores.find((score) => score.placeId === a.id);
    const right = scores.find((score) => score.placeId === b.id);
    return Number(right?.eligible ?? false) - Number(left?.eligible ?? false)
      || (right?.score ?? 0) - (left?.score ?? 0) || a.id.localeCompare(b.id);
  });
  const selectedPlaceId = places.some((place) => place.id === selectedId) ? selectedId : places[0]?.id;
  const result = state.search ? recommend(content, state.profile, state.visits, state.search) : null;

  return <section>
    <button className="region-back" onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
    <p className="eyebrow">지도에서 고른 동네를 둘러보세요</p>
    <h1>{region.name}</h1>
    <p>{region.description}</p>
    {region.source && <p className="region-place-meta"><a href={region.source.url} target="_blank" rel="noreferrer">{region.source.label}</a> · 확인 {region.source.checkedAt}</p>}
    <p>{state.search ? `${state.search.when.replace('T', ' ')} (한국 시간) 기준 장소 추천` : '조건을 설정하면 추천순으로 표시합니다.'}</p>
    <div className="region-layout">
      <ExplorationMap regions={content.regions} recommendations={result?.recommendations ?? []}
        selectedRegionId={region.id} places={places} selectedPlaceId={selectedPlaceId}
        onRegionSelect={(id) => go({ name: 'region', regionId: id })}
        onPlaceSelect={(id) => { setSelectedId(id); cards.current[id]?.scrollIntoView({ behavior: 'instant', block: 'nearest' }); }} />
      <ul className="places region-place-list" aria-label="권역 장소 추천">
        {places.map((place, index) => {
          const scored = scores.find((score) => score.placeId === place.id);
          const events = content.events.filter((event) => event.placeId === place.id);
          return <li key={place.id} ref={(element) => { cards.current[place.id] = element; }}
            className={`place${place.id === selectedPlaceId ? ' selected-place' : ''}`}>
            <div className="region-place-heading">
              <h2>{index + 1}. {place.name}</h2>
              <button aria-label={`${place.name} 카드에서 선택`} aria-pressed={place.id === selectedPlaceId}
                onClick={() => setSelectedId(place.id)}>지도에서 강조</button>
            </div>
            <p>{CATEGORY_LABELS[place.category]} · {scored ? statusLabel[scored.status.status] : '시각 미선택'}</p>
            {scored?.eligible ? <p>장소 추천 점수 {scored.score.toFixed(1)} · 관심 활동과 운영 조건에 맞아요.</p>
              : <p>직접 탐색 · 현재 추천 점수에서 제외됩니다.</p>}
            {scored?.status.note && <p className="region-place-meta">{scored.status.note}</p>}
            <p className="region-place-meta">{place.opening.entryCondition ?? '이용 조건 확인 필요'} · 도착 후 입장 가능 여부는 별도 확인이 필요합니다.</p>
            {place.isVirtual && <p className="region-place-meta">시연용 가상 장소 · 위치와 운영정보도 가상입니다.</p>}
            <p className="region-place-meta">출처: {place.source?.label ?? '확인 필요'}{place.source && ` · 확인일 ${place.source.checkedAt}`}</p>
            {events.map((event) => <div className="region-place-meta" key={event.id}>
              <strong>{event.name}{event.isVirtual ? ' (시연용)' : ''}</strong>
              <p>{state.search ? eventLabel[eventState(event, state.search.when)] : '시각 미선택'} · {event.condition.text ?? '참여 조건 확인 필요'}</p>
              {event.sessions.map((session, n) => <p key={n}>{session.start} ~ {session.end}</p>)}
            </div>)}
            <VisitPanel placeId={place.id} />
          </li>;
        })}
      </ul>
    </div>
  </section>;
}

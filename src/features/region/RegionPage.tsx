// Region map/detail; score and visit state come from the shared engine.
import { useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { content, eventsOfPlace, placesOfRegion, regionById } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { franchiseStatus } from '../../domain/placeEligibility';
import { eventState, scorePlaces } from '../../domain/score';
import { go } from '../../route';
import { RegionMap } from './RegionMap';
import { VisitPanel } from '../visits/VisitPanel';
import './region.css';

const statusLabel = { open: '운영 중', closed: '휴무·이용 마감', unknown: '운영정보 미확인' };
const eventLabel = { active: '진행 중', cancelled: '취소', ended: '종료', upcoming: '예정', not_now: '선택 시각 외', condition_unknown: '참여 조건 확인 필요' };
const eventDate = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });

export function RegionPage({ regionId }: { regionId: string }) {
  return <RegionDetail key={regionId} regionId={regionId} />;
}

function RegionDetail({ regionId }: { regionId: string }) {
  const { state } = useAppState();
  const [filter, setFilter] = useState<'all' | 'visited' | 'recommended'>('all');
  const [selectedId, setSelectedId] = useState<string>();
  const cards = useRef<Record<string, HTMLLIElement | null>>({});
  const region = regionById(regionId);
  if (!region) return <section>
    <h1>권역을 찾을 수 없어요</h1>
    <button onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
  </section>;
  const scores = state.search ? scorePlaces(region, content, state.profile, state.visits, state.search) : [];
  const classifications = content.places.filter((place) => place.regionId === region.id).map(franchiseStatus);
  const places = [...placesOfRegion(region.id)].sort((a, b) => {
    const left = scores.find((score) => score.placeId === a.id);
    const right = scores.find((score) => score.placeId === b.id);
    return Number(right?.eligible ?? false) - Number(left?.eligible ?? false)
      || (right?.score ?? 0) - (left?.score ?? 0) || a.id.localeCompare(b.id);
  });
  const visitedIds = new Set(state.visits.map((visit) => visit.placeId));
  const visiblePlaces = places.filter((place) => filter === 'all' || (filter === 'visited'
    ? visitedIds.has(place.id) : scores.some((score) => score.placeId === place.id && score.eligible)));
  const selectedPlaceId = visiblePlaces.some((place) => place.id === selectedId) ? selectedId : visiblePlaces[0]?.id;

  return <section className="region-detail">
    <button className="region-back" onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
    <p className="eyebrow">동네 둘러보기</p>
    <h1>{region.name}</h1>
    <p className="region-lead">이 동네의 새로운 곳과 나의 발걸음을 함께 살펴보세요.</p>
    <p>{region.description}</p>
    <div className="region-summary"><span>탐색할 장소 {places.length}곳</span><span>방문 기록이 있는 장소 {places.filter((place) => visitedIds.has(place.id)).length}곳</span></div>
    {region.source && <p className="region-place-meta"><a href={region.source.url} target="_blank" rel="noreferrer">{region.source.label}</a> · 확인 {region.source.checkedAt}</p>}
    <p>{state.search ? `${state.search.when.replace('T', ' ')} (한국 시간) 기준 장소 추천` : '조건을 설정하면 추천순으로 표시합니다.'}</p>
    <p className="region-place-meta">프랜차이즈 {classifications.filter((status) => status === 'franchise').length}곳 · 분류 미확인 {classifications.filter((status) => status === 'unknown').length}곳은 목록·지도·점수에서 제외했습니다.</p>
    {places.length === 0 && <p role="status">비프랜차이즈로 확인된 장소가 아직 없어요.</p>}
    <div className="region-filters" role="group" aria-label="동네 안 장소 필터">
      {([['all', '전체 장소'], ['visited', '가본 장소'], ['recommended', '추천 장소']] as const).map(([value, label]) =>
        <button key={value} aria-pressed={filter === value} disabled={value === 'recommended' && !state.search}
          onClick={() => { setFilter(value); setSelectedId(undefined); }}>{label}</button>)}
    </div>
    {!state.search && <p className="region-note">조건을 설정하면 추천 장소를 골라볼 수 있어요.</p>}
    <p className="region-note" role="status">표시된 장소 {visiblePlaces.length}곳</p>
    {visiblePlaces.length === 0 && places.length > 0 && <div className="region-empty">
      <p>{filter === 'visited' ? '아직 이 동네에 남긴 방문 기록이 없어요.' : '선택한 조건에 맞는 추천 장소가 없어요.'}</p>
      <button onClick={() => setFilter('all')}>전체 장소 보기</button>
    </div>}
    <div className="region-design-layout">
      <RegionMap region={region} places={visiblePlaces} boundsPlaces={places} selectedId={selectedPlaceId ?? null}
        onSelect={(id) => { setSelectedId(id); cards.current[id]?.scrollIntoView({ behavior: 'instant', block: 'nearest' }); }} />
      <h2 className="region-list-heading">{filter === 'visited' ? '다시 떠올리는 발걸음' : '동네 안에서 발견하기'}</h2>
      <ul className="places region-place-list" aria-label="권역 장소 추천">
        {visiblePlaces.map((place, index) => {
          const scored = scores.find((score) => score.placeId === place.id);
          const events = eventsOfPlace(place.id);
          return <li key={place.id} ref={(element) => { cards.current[place.id] = element; }}
            className={`place${place.id === selectedPlaceId ? ' selected-place' : ''}`}>
            <p className="region-category">{visitedIds.has(place.id) ? '가본 장소 · 자기 신고' : '남긴 방문 기록 없음'}</p>
            <div className="region-place-heading">
              <h2>{index + 1}. {place.name}</h2>
              <button aria-label={`${place.name} 카드에서 선택`} aria-pressed={place.id === selectedPlaceId}
                onClick={() => setSelectedId(place.id)}>지도에서 강조</button>
            </div>
            <p>{CATEGORY_LABELS[place.category]} · {scored ? statusLabel[scored.status.status] : '시각 미선택'}</p>
            {scored?.eligible ? <p>관심 활동과 운영 조건에 맞아요.</p>
              : <p>직접 탐색 · 현재 추천 점수에서 제외됩니다.</p>}
            {scored?.status.note && <p className="region-place-meta">{scored.status.note}</p>}
            <p className="region-place-meta">{place.opening.entryCondition ?? '이용 조건 확인 필요'} · 도착 후 입장 가능 여부는 별도 확인이 필요합니다.</p>
            {place.isVirtual && <p className="region-place-meta">시연용 가상 장소 · 위치와 운영정보도 가상입니다.</p>}
            <p className="region-place-meta">{place.isVirtual ? '비프랜차이즈 설정 (시연용)' : <>
              비프랜차이즈 확인 · {place.franchise.source?.url
                ? <a href={place.franchise.source.url} target="_blank" rel="noreferrer">{place.franchise.source.label}</a>
                : place.franchise.source?.label} · {place.franchise.source?.checkedAt}
            </>}</p>
            <p className="region-place-meta">출처: {place.source?.url ? <a href={place.source.url} target="_blank" rel="noreferrer">{place.source.label}</a> : place.source?.label ?? '확인 필요'}{place.source && ` · 확인일 ${place.source.checkedAt}`}</p>
            {events.map((event) => <div className="region-place-meta" key={event.id}>
              <strong>{event.name}{event.isVirtual ? ' (시연용)' : ''}</strong>
              <p>{state.search ? eventLabel[eventState(event, state.search.when)] : '시각 미선택'} · {event.condition.text ?? '참여 조건 확인 필요'}</p>
              {event.sessions.map((session, n) => <p key={n}>{eventDate.format(new Date(session.start))} ~ {eventDate.format(new Date(session.end))} (한국 시간)</p>)}
              <p>출처: {event.source?.url ? <a href={event.source.url} target="_blank" rel="noreferrer">{event.source.label}</a> : event.source?.label ?? '확인 필요'} · 확인일 {event.source?.checkedAt ?? '미확인'}</p>
            </div>)}
            <VisitPanel placeId={place.id} />
          </li>;
        })}
      </ul>
    </div>
  </section>;
}

// Region map/detail; score and visit state come from the shared engine.
import { useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { content, eventsOfPlace, placesOfRegion, regionById } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { franchiseStatus } from '../../domain/placeEligibility';
import { distanceKm, eventState, scorePlaces } from '../../domain/score';
import { placePopularity, POPULARITY_LABELS } from '../../domain/popularity';
import { go } from '../../route';
import { memoriesInDong } from '../../data/sampleMemories';
import { centreLatLng, dongByCode, dongsOfRegion } from '../map/ansanGeo';
import { DongMap, type MapMarker } from '../map/DongMap';
import { Memories, type MemoryItem } from './Memories';
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
  const [memoryId, setMemoryId] = useState<string>();
  const cards = useRef<Record<string, HTMLLIElement | null>>({});
  const region = regionById(regionId);
  if (!region) return <section>
    <h1>행정동을 찾을 수 없어요</h1>
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
    ? visitedIds.has(place.id) : scores.some((score) => score.placeId === place.id && score.selected)));
  const selectedPlaceId = visiblePlaces.some((place) => place.id === selectedId) ? selectedId : visiblePlaces[0]?.id;
  const regionDongs = dongsOfRegion(region);
  // Memories: the user's own visit records (newest first) plus labelled demo memories in this 동네.
  const visitMemories: MemoryItem[] = places.flatMap((place) => {
    const dates = state.visits.filter((visit) => visit.placeId === place.id).map((visit) => visit.date).sort().reverse();
    return dates.length ? [{ id: place.id, title: place.name, dates }] : [];
  });
  const samples = regionDongs.flatMap((dong) => memoriesInDong(dong.code));
  const memoryItems: MemoryItem[] = [...visitMemories, ...samples.map((memory) => ({ id: memory.id, title: memory.title, dates: [memory.date], memo: memory.memo, sample: true }))];
  const home = regionDongs.find((dong) => dong.code === dongByCode(state.profile.homeDongCode ?? '')?.code);
  const markers: MapMarker[] = [
    ...(home ? [{ id: 'home', kind: 'home' as const, ...centreLatLng(home), label: `내 동네 · ${home.name}` }] : []),
    ...visiblePlaces.flatMap((place, index) => place.location ? [{ id: place.id, kind: 'place' as const, ...place.location, text: String(index + 1),
      label: `${place.name} 지도에서 선택`, pressed: place.id === selectedPlaceId, remembered: visitedIds.has(place.id) }] : []),
    ...samples.map((memory) => ({ id: memory.id, kind: 'memory' as const, ...memory.location, label: `${memory.title} 추억 보기`, pressed: memory.id === memoryId })),
  ];
  const selectPlace = (id: string) => {
    if (!visiblePlaces.some((place) => place.id === id)) setFilter('all');
    setSelectedId(id);
    setMemoryId(id);
    requestAnimationFrame(() => cards.current[id]?.scrollIntoView({ behavior: 'instant', block: 'nearest' }));
  };
  const selectMemory = (id: string) => samples.some((memory) => memory.id === id) ? setMemoryId(id) : selectPlace(id);
  const selectedCount = scores.filter(score => score.selected).length;
  const eligibleCount = scores.filter(score => score.eligible).length;

  return <section className="region-detail">
    <button className="region-back" onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
    <p className="eyebrow">동네 둘러보기</p>
    <h1>{region.name}</h1>
    <p className="region-lead">이 동네의 새로운 곳과 나의 발걸음을 함께 살펴보세요.</p>
    <p>{region.description}</p>
    <div className="region-summary"><span>탐색할 장소 {places.length}곳</span><span>방문 기록이 있는 장소 {places.filter((place) => visitedIds.has(place.id)).length}곳</span></div>
    {region.source && <p className="region-place-meta"><a href={region.source.url} target="_blank" rel="noreferrer">{region.source.label}</a> · 확인 {region.source.checkedAt}</p>}
    <p>{state.search ? `${state.search.when.replace('T', ' ')} (한국 시간) 기준 장소 추천` : '조건을 설정하면 추천순으로 표시합니다.'}</p>
    {state.search && <p className="region-note">지역 점수 합산 {selectedCount}/20개 · 조건 충족 후보 {eligibleCount}개에서 현재 점수순으로 선정합니다.
      {selectedCount < 20 && ' 후보 부족 · 확보한 장소만 합산한 점수입니다.'} 방문 기록이 바뀌면 전체 후보에서 다시 선정합니다.</p>}
    <p className="region-place-meta">프랜차이즈 {classifications.filter((status) => status === 'franchise').length}곳 · 분류 미확인 {classifications.filter((status) => status === 'unknown').length}곳은 목록·지도·점수에서 제외했습니다.</p>
    {places.length === 0 && <p role="status">데이터 준비 중 · 비프랜차이즈로 확인된 실제 장소를 조사한 뒤 반영합니다.</p>}
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
      <DongMap target={regionDongs} markers={markers}
        onSelect={(marker) => marker.kind === 'memory' ? setMemoryId(marker.id) : selectPlace(marker.id)} />
      <p className="region-note">실제 좌표 기반 · 2026-10-01 행정동 경계 · 번호: 아래 장소 목록 순서 · 하트: 기록한 추억 · 점: 실제 위치</p>
      <p className="region-note">경계: SGIS 공공누리 제1유형 · <a href="https://github.com/vuski/admdongkor" target="_blank" rel="noreferrer">vuski/admdongkor</a> 가공 · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
      {visiblePlaces.some(place => !place.location) && <p className="region-note">정밀 좌표 미확인 장소는 지도 마커 없이 목록에서 안내합니다.</p>}
      <Memories items={memoryItems} selectedId={memoryId} onSelect={selectMemory} />
      {places.length === 0 && <section className="region-recommend" aria-labelledby="nearby-title">
        <h2 id="nearby-title" className="region-list-heading">가까운 탐험 동네</h2>
        <p className="region-note">이 동의 장소 데이터는 준비 중이에요. 장소가 있는 주변 동네를 직접 둘러보세요.</p>
        <ul className="cards">{content.regions.filter(item => item.id !== region.id && placesOfRegion(item.id).length > 0)
          .map(item => ({ item, km: distanceKm(region.start, item.start) })).sort((a, b) => a.km - b.km).slice(0, 3)
          .map(({ item, km }) => <li key={item.id}><button className="card region-nearby" onClick={() => go({ name: 'region', regionId: item.id })}>
            <strong>{item.name}</strong><span>대표 지점 사이 직선거리 {km.toFixed(1)} km</span>
            <span className="region-nearby-link">이 동네 알아보기 →</span>
          </button></li>)}</ul>
      </section>}
      <section className="region-recommend" aria-labelledby="region-recommend-title">
      <p className="region-recommend-kicker">동네 추천</p>
      <h2 className="region-list-heading" id="region-recommend-title">{filter === 'visited' ? '다시 떠올리는 발걸음' : '이 동네에서 발견하기'}</h2>
      <p className="region-note">관심 활동과 선택한 시각의 운영 조건에 맞는 곳부터 보여드려요.</p>
      <ul className="places region-place-list" aria-label="행정동 장소 추천">
        {visiblePlaces.map((place, index) => {
          const scored = scores.find((score) => score.placeId === place.id);
          const popularity = scored?.popularity ?? placePopularity(place, content.places);
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
            {scored?.eligible ? <p>장소 추천 점수 {scored.score.toFixed(1)} · {scored.rank}위 · {scored.selected ? '상위 20개 · 지역 점수에 포함' : '상위 20개 밖 · 지역 점수에 미포함'}</p>
              : <p>직접 탐색 · 현재 추천 점수에서 제외됩니다.</p>}
            {scored?.status.note && <p className="region-place-meta">{scored.status.note}</p>}
            <p className="region-place-meta">{place.opening.entryCondition ?? '이용 조건 확인 필요'} · 도착 후 입장 가능 여부는 별도 확인이 필요합니다.</p>
            {place.isVirtual && <p className="region-place-meta">시연용 가상 장소 · 위치와 운영정보도 가상입니다.</p>}
            {!place.isVirtual && <p className="region-place-meta">실제 조사 장소 · {place.address} · <a href={place.regionSource?.url} target="_blank" rel="noreferrer">행정동 소속 근거</a></p>}
            {place.searchSource && <p className="region-place-meta"><a href={place.searchSource.url} target="_blank" rel="noreferrer">네이버에서 장소 보기</a> · 후보 확인 {place.searchSource.checkedAt}</p>}
            <p className="region-place-meta">기본 가치 {place.baseValue}는 검증 전 시연값입니다.</p>
            <p className="region-place-meta">{popularity.status === 'measured' ? <>
              {POPULARITY_LABELS[popularity.evidence.metric]} {popularity.evidence.count.toLocaleString('ko-KR')}건 · {popularity.evidence.period === 'cumulative' ? '누적' : popularity.evidence.period}
              {' '}· <a href={popularity.evidence.source.url} target="_blank" rel="noreferrer">수치 출처</a> · 확인 {popularity.evidence.source.checkedAt}
              {popularity.evidence.metric === 'visitor_reviews' && ' · 방문자 리뷰는 실제 총방문자 수가 아닙니다.'}
            </> : popularity.status === 'simulated' ? `인지도 ${popularity.value} · 시연용 가상값` : '방문·리뷰 수 확인 필요 · 인지도 미확인으로 지역 점수에서 제외'}</p>
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
      </section>
    </div>
  </section>;
}

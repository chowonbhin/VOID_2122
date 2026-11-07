// Region map/detail; score and visit state come from the shared engine.
import { useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { content, eventsOfPlace, placesOfRegion, regionById } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { distanceKm, eventState, placeStatus } from '../../domain/score';
import { placePopularity, POPULARITY_LABELS } from '../../domain/popularity';
import { go } from '../../route';
import { discoverPlaces } from '../../domain/discovery';
import { centreLatLng, dongByCode, dongsOfRegion } from '../map/ansanGeo';
import { DongMap, type MapMarker } from '../map/DongMap';
import { Memories, type MemoryItem } from './Memories';
import { loadSadongMemoryPreview, pickSadongMemoryPlaces, SADONG_ID, SADONG_MEMORY_KEY, type SadongMemoryPreview } from './sadongMemories';
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
  const [filter, setFilter] = useState<'all' | 'visited' | 'recommended' | 'pool'>('all');
  const [mapPage, setMapPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [memoryId, setMemoryId] = useState<string>();
  const [preview, setPreview] = useState(() => regionId === SADONG_ID
    ? loadSadongMemoryPreview(content.places)
    : { value: { enabled: false, placeIds: [] } as SadongMemoryPreview, error: '' });
  const cards = useRef<Record<string, HTMLLIElement | null>>({});
  const region = regionById(regionId);
  if (!region) return <section>
    <h1>행정동을 찾을 수 없어요</h1>
    <button onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
  </section>;
  const { candidates: places, displayed, scores } = discoverPlaces(region, content, state.profile, state.visits, state.search);
  const visitedIds = new Set(state.visits.map(visit => visit.placeId));
  const visiblePlaces = filter === 'all' ? displayed : places.filter(place => filter === 'pool' || (filter === 'visited'
    ? visitedIds.has(place.id) : scores.some(score => score.placeId === place.id && score.selected)));
  const selectedPlaceId = visiblePlaces.some((place) => place.id === selectedId) ? selectedId : visiblePlaces[0]?.id;
  const locatedPlaces = visiblePlaces.filter(place => place.location);
  const mapPages = Math.ceil(locatedPlaces.length / 8);
  const currentMapPage = Math.min(mapPage, Math.max(0, mapPages - 1));
  const regionDongs = dongsOfRegion(region);
  // Only the user's actual self-reported visit records (newest first).
  const visitMemories: MemoryItem[] = places.flatMap((place) => {
    const dates = state.visits.filter((visit) => visit.placeId === place.id).map((visit) => visit.date).sort().reverse();
    return dates.length ? [{ id: place.id, title: place.name, dates }] : [];
  });
  const examplePlaces = preview.value.enabled ? places.filter(place => preview.value.placeIds.includes(place.id) && !visitedIds.has(place.id)) : [];
  const exampleIds = new Set(examplePlaces.map(place => place.id));
  const memoryItems: MemoryItem[] = [...visitMemories, ...examplePlaces.map(place => ({
    id: place.id, title: place.name, dates: [], memo: place.address, sample: true,
  }))];
  const pagePlaces = locatedPlaces.slice(currentMapPage * 8, (currentMapPage + 1) * 8);
  const home = regionDongs.find((dong) => dong.code === dongByCode(state.profile.homeDongCode ?? '')?.code);
  const markers: MapMarker[] = [
    ...(home ? [{ id: 'home', kind: 'home' as const, ...centreLatLng(home), label: `내 동네 · ${home.name}` }] : []),
    ...pagePlaces.filter(place => !exampleIds.has(place.id)).flatMap(place => place.location ? [{ id: place.id, kind: 'place' as const, ...place.location, text: String(visiblePlaces.indexOf(place) + 1),
      label: `${place.name} 지도에서 선택`, pressed: place.id === selectedPlaceId, remembered: visitedIds.has(place.id) }] : []),
    // Preview hearts remain visible across marker pages, once per actual place.
    ...examplePlaces.flatMap(place => place.location ? [{ id: place.id, kind: 'memory' as const, ...place.location,
      label: `${place.name} 추억 예시 지도에서 선택`, pressed: place.id === selectedPlaceId }] : []),
  ];
  const selectPlace = (id: string, scrollToCard = true) => {
    const nextPlaces = visiblePlaces.some(place => place.id === id) ? visiblePlaces : places;
    if (nextPlaces !== visiblePlaces) setFilter('pool');
    setMapPage(Math.max(0, Math.floor(nextPlaces.filter(place => place.location).findIndex(place => place.id === id) / 8)));
    setSelectedId(id);
    setMemoryId(id);
    if (scrollToCard) requestAnimationFrame(() => cards.current[id]?.scrollIntoView({ behavior: 'instant', block: 'nearest' }));
  };
  const selectMemory = (id: string) => selectPlace(id, !exampleIds.has(id));
  const changePreview = (value: SadongMemoryPreview) => {
    try {
      localStorage.setItem(SADONG_MEMORY_KEY, JSON.stringify(value));
      setPreview({ value, error: '' });
      setMemoryId(undefined);
    } catch {
      setPreview(previous => ({ ...previous, error: '추억 예시 설정을 저장하지 못했어요. 다시 시도해 주세요.' }));
    }
  };

  return <section className="region-detail">
    <button className="region-back" onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
    <p className="eyebrow">동네 둘러보기</p>
    <h1>{region.name}</h1>
    <p className="region-lead">이 동네의 새로운 곳과 나의 발걸음을 함께 살펴보세요.</p>
    <div className="region-summary"><span>방문 기록이 있는 장소 {places.filter((place) => visitedIds.has(place.id)).length}곳</span></div>
    {places.length === 0 && <p role="status">이 동네의 장소는 준비 중이에요.</p>}
    <div className="region-filters" role="group" aria-label="동네 안 장소 필터">
      {([['all', '발견할 20곳'], ['recommended', '추천 장소'], ['visited', '가본 장소'], ['pool', '전체 후보']] as const).map(([value, label]) =>
        <button key={value} aria-pressed={filter === value} disabled={value === 'recommended' && !state.search}
          onClick={() => { setFilter(value); setSelectedId(undefined); setMapPage(0); }}>{label}</button>)}
    </div>
    {!state.search && <p className="region-note">조건을 설정하면 추천 장소를 골라볼 수 있어요.</p>}
    <p className="region-note" role="status">표시된 장소 {visiblePlaces.length}곳</p>
    {filter === 'all' && visitMemories.length > 0 && <p className="region-note" role="status">방문 기록을 반영해 20곳을 다시 구성했어요. 기록한 장소는 ‘가본 장소’에서 확인·수정·삭제할 수 있어요.</p>}
    {filter === 'recommended' && places.some(place => visitedIds.has(place.id) && !visiblePlaces.some(visible => visible.id === place.id)) &&
      <p className="region-note" role="status">방문 기록을 반영해 추천을 다시 골랐어요. 추천 밖으로 이동한 장소의 기록은 ‘가본 장소’에서 확인·수정·삭제할 수 있어요.</p>}
    {visiblePlaces.length === 0 && places.length > 0 && <div className="region-empty">
      <p>{filter === 'visited' ? '아직 이 동네에 남긴 방문 기록이 없어요.' : '선택한 조건에 맞는 추천 장소가 없어요.'}</p>
      <button onClick={() => setFilter('all')}>발견할 20곳 보기</button>
    </div>}
    <div className="region-design-layout">
      <DongMap target={regionDongs} markers={markers}
        onSelect={(marker) => selectPlace(marker.id, marker.kind !== 'memory')} />
      {mapPages > 1 && <nav className="region-filters" aria-label="지도 장소 페이지">
        <button disabled={currentMapPage === 0} onClick={() => setMapPage(currentMapPage - 1)}>이전 지도 장소</button>
        <span>{currentMapPage + 1} / {mapPages} · 지도에 {currentMapPage * 8 + 1}–{Math.min((currentMapPage + 1) * 8, locatedPlaces.length)}번 표시</span>
        <button disabled={currentMapPage + 1 >= mapPages} onClick={() => setMapPage(currentMapPage + 1)}>다음 지도 장소</button>
      </nav>}
      <p className="region-note">번호: 아래 장소 목록 순서 · {examplePlaces.length > 0 ? '하트: 추억 예시 (방문 기록 아님)' : '하트: 기록한 추억'} · 점: 실제 위치</p>
      {visiblePlaces.some(place => !place.location) && <p className="region-note">정밀 좌표 미확인 장소는 지도 마커 없이 목록에서 안내합니다.</p>}
      <Memories items={memoryItems} selectedId={memoryId} onSelect={selectMemory} controls={regionId === SADONG_ID && <>
        <div className="memory-preview-actions">
          <button type="button" onClick={() => changePreview({ enabled: true, placeIds: pickSadongMemoryPlaces(content.places,
            [...preview.value.placeIds, ...visitedIds]).map(place => place.id) })}>다른 예시 보기</button>
          <button type="button" onClick={() => changePreview({ ...preview.value, enabled: !preview.value.enabled })}>{preview.value.enabled ? '예시 숨기기' : '예시 보기'}</button>
        </div>
        {preview.error && <p role="alert" className="region-note">{preview.error}</p>}
      </>} />
      {places.length === 0 && <section className="region-recommend" aria-labelledby="nearby-title">
        <h2 id="nearby-title" className="region-list-heading">가까운 탐험 동네</h2>
        <p className="region-note">이 동의 장소 데이터는 준비 중이에요. 장소가 있는 주변 동네를 직접 둘러보세요.</p>
        <ul className="cards">{content.regions.filter(item => item.id !== region.id && placesOfRegion(item.id).length > 0)
          .map(item => ({ item, km: distanceKm(region.start, item.start) })).sort((a, b) => a.km - b.km).slice(0, 3)
          .map(({ item, km }) => <li key={item.id}><button className="card region-nearby" onClick={() => go({ name: 'region', regionId: item.id })}>
            <strong>{item.name}</strong><span>직선거리 {km.toFixed(1)} km</span>
            <span className="region-nearby-link">이 동네 알아보기 →</span>
          </button></li>)}</ul>
      </section>}
      <section className="region-recommend" aria-labelledby="region-recommend-title">
      <p className="region-recommend-kicker">동네 추천</p>
      <h2 className="region-list-heading" id="region-recommend-title">{filter === 'visited' ? '다시 떠올리는 발걸음' : '이 동네에서 발견하기'}</h2>
      <p className="region-note">관심 활동과 지금 시각에 맞는 곳부터 보여드려요. 운영정보가 확인되지 않은 곳은 방문 전에 확인해 주세요.</p>
      <ul className="places region-place-list" aria-label="행정동 장소 추천">
        {visiblePlaces.map((place, index) => {
          const scored = scores.find((score) => score.placeId === place.id);
          const status = scored?.status ?? (state.search ? placeStatus(place, state.search.when) : null);
          const popularity = scored?.popularity ?? placePopularity(place, content.places);
          const events = eventsOfPlace(place.id);
          return <li key={place.id} ref={(element) => { cards.current[place.id] = element; }}
            className={`place${place.id === selectedPlaceId ? ' selected-place' : ''}`}>
            <p className="region-category">{visitedIds.has(place.id) ? '가본 장소 · 자기 신고' : '남긴 방문 기록 없음'}</p>
            <div className="region-place-heading">
              <h2>{index + 1}. {place.name}</h2>
              <button aria-label={`${place.name} 카드에서 선택`} aria-pressed={place.id === selectedPlaceId}
                onClick={() => { setSelectedId(place.id); setMapPage(Math.max(0, Math.floor(locatedPlaces.findIndex(item => item.id === place.id) / 8))); }}>지도에서 강조</button>
            </div>
            <p>{CATEGORY_LABELS[place.category]} · {status ? statusLabel[status.status] : '시각 미선택'}</p>
            {!scored?.eligible && state.search && <p>지금 조건에서는 추천하지 않지만 둘러볼 수 있어요.</p>}
            {status?.note && <p className="region-place-meta">{status.note}</p>}
            {place.opening.entryCondition && <p className="region-place-meta">{place.opening.entryCondition}</p>}
            {place.isVirtual && <p className="region-place-meta">시연용 가상 장소 · 위치와 운영정보도 가상입니다.</p>}
            {(place.address || place.searchSource) && <p className="region-place-meta">{place.address}{place.address && place.searchSource && ' · '}{place.searchSource && <a href={place.searchSource.url} target="_blank" rel="noreferrer">네이버에서 장소 보기</a>}</p>}
            {popularity.status === 'measured' && <p className="region-place-meta">{POPULARITY_LABELS[popularity.evidence.metric]} {popularity.evidence.count.toLocaleString('ko-KR')}건</p>}
            {events.map((event) => <div className="region-place-meta" key={event.id}>
              <strong>{event.name}{event.isVirtual ? ' (시연용)' : ''}</strong>
              <p>{state.search ? eventLabel[eventState(event, state.search.when)] : '시각 미선택'} · {event.condition.text ?? '참여 조건 확인 필요'}</p>
              {event.sessions.map((session, n) => <p key={n}>{eventDate.format(new Date(session.start))} ~ {eventDate.format(new Date(session.end))} (한국 시간)</p>)}
            </div>)}
            <VisitPanel placeId={place.id} />
          </li>;
        })}
      </ul>
      </section>
    </div>
  </section>;
}

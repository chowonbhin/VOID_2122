// Region map/detail; score and visit state come from the shared engine.
import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { content, eventsOfPlace, placesOfRegion, regionById } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { distanceKm, eventState, placeStatus } from '../../domain/score';
import { placeRating } from '../../domain/rating';
import { openingOnDate } from '../../domain/opening';
import { go } from '../../route';
import { discoverPlaces } from '../../domain/discovery';
import { centreLatLng, dongByCode, dongsOfRegion } from '../map/ansanGeo';
import { DongMap, type MapMarker } from '../map/DongMap';
import { Memories, type MemoryItem } from './Memories';
import { loadSadongMemoryPreview, SADONG_ID, SADONG_MEMORY_KEY, type SadongMemoryPreview } from './sadongMemories';
import { VisitDialog } from '../visits/VisitDialog';
import './region.css';

const statusLabel = { open: '운영 중', closed: '휴무·이용 마감', unknown: '운영정보 미확인' };
const eventLabel = { active: '진행 중', cancelled: '취소', ended: '종료', upcoming: '예정', not_now: '선택 시각 외', condition_unknown: '참여 조건 확인 필요' };
/** Current time in Korea as 'YYYY-MM-DDTHH:MM', so opening info always reflects today. */
function nowKst(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
const todayLabel = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
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
  const [visitPlaceId, setVisitPlaceId] = useState<string>();
  const [now, setNow] = useState(nowKst);
  useEffect(() => {
    const refresh = () => setNow(nowKst());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
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

  const visitPlace = places.find(place => place.id === visitPlaceId);

  return <section className="region-detail">
    <p className="eyebrow">동네 둘러보기</p>
    <h1>{region.name}</h1>
    {places.length === 0 && <p role="status">이 동네의 장소는 준비 중이에요.</p>}
    <div className="region-filters" role="group" aria-label="동네 안 장소 필터">
      {([['all', '발견할 20곳'], ['recommended', '추천 장소'], ['visited', '가본 장소'], ['pool', '전체 후보']] as const).map(([value, label]) =>
        <button key={value} aria-pressed={filter === value} disabled={value === 'recommended' && !state.search}
          onClick={() => { setFilter(value); setSelectedId(undefined); setMapPage(0); }}>{label}</button>)}
    </div>
    {!state.search && <p className="region-note">조건을 설정하면 추천 장소를 골라볼 수 있어요.</p>}
    <p className="region-note" role="status">{visiblePlaces.length}곳</p>
    {visiblePlaces.length === 0 && places.length > 0 && <div className="region-empty">
      <p>{filter === 'visited' ? '아직 이 동네에 남긴 방문 기록이 없어요.' : '선택한 조건에 맞는 추천 장소가 없어요.'}</p>
      <button onClick={() => setFilter('all')}>발견할 20곳 보기</button>
    </div>}
    <div className="region-design-layout">
      <DongMap target={regionDongs} markers={markers}
        onSelect={(marker) => selectPlace(marker.id, marker.kind !== 'memory')} />
      {/* The map shows 8 places at a time; choosing a place card moves it to that place. */}
      <p className="region-note">번호: 장소 · {examplePlaces.length > 0 ? '하트: 추억 예시' : '하트: 추억'} · 점: 실제 위치</p>
      {visiblePlaces.some(place => !place.location) && <p className="region-note">위치 미확인 장소는 목록에만 표시돼요.</p>}
      <Memories items={memoryItems} selectedId={memoryId} onSelect={selectMemory} controls={regionId === SADONG_ID && <>
        <div className="memory-preview-actions">
          <button type="button" onClick={() => changePreview({ ...preview.value, enabled: !preview.value.enabled })}>{preview.value.enabled ? '예시 숨기기' : '예시 보기'}</button>
        </div>
        {preview.error && <p role="alert" className="region-note">{preview.error}</p>}
      </>} />
      {places.length === 0 && <section className="region-recommend" aria-labelledby="nearby-title">
        <h2 id="nearby-title" className="region-list-heading">가까운 탐험 동네</h2>
        <ul className="cards">{content.regions.filter(item => item.id !== region.id && placesOfRegion(item.id).length > 0)
          .map(item => ({ item, km: distanceKm(region.start, item.start) })).sort((a, b) => a.km - b.km).slice(0, 3)
          .map(({ item, km }) => <li key={item.id}><button className="card region-nearby" onClick={() => go({ name: 'region', regionId: item.id })}>
            <strong>{item.name}</strong><span>직선거리 {km.toFixed(1)} km</span>
            <span className="region-nearby-link">이 동네 알아보기 →</span>
          </button></li>)}</ul>
      </section>}
      <section className="region-recommend" aria-labelledby="region-recommend-title">
      <h2 className="region-list-heading" id="region-recommend-title">{filter === 'visited' ? '다시 떠올리는 발걸음' : '이 동네에서 발견하기'}</h2>
      <p className="region-note">운영정보 · {todayLabel.format(new Date(now + '+09:00'))} 기준</p>
      <ul className="places region-place-list" aria-label="행정동 장소 추천">
        {/* Opening status always follows today's Korean time, not the time saved with the search. */}
        {visiblePlaces.map((place, index) => {
          const scored = scores.find((score) => score.placeId === place.id);
          const status = placeStatus(place, now);
          const hours = openingOnDate(place.opening, now.slice(0, 10));
          const events = eventsOfPlace(place.id);
          return <li key={place.id} ref={(element) => { cards.current[place.id] = element; }}
            className={`place${place.id === selectedPlaceId ? ' selected-place' : ''}`}
            data-rated={(scored?.rating ?? placeRating(place)).status === 'measured'}>
            <p className="region-category">{visitedIds.has(place.id) ? '내가 다녀온 곳' : '아직 안 가본 곳'}</p>
            <div className="region-place-heading">
              <h2>{index + 1}. {place.name}</h2>
              <div className="region-place-actions">
              <button type="button" className="region-visit-trigger" aria-label={`${place.name} 방문 날짜 설정`} aria-haspopup="dialog"
                onClick={() => setVisitPlaceId(place.id)}>방문 기록</button>
              <button className="region-map-focus" aria-label={`${place.name} 카드에서 선택`} title="지도에서 강조" aria-pressed={place.id === selectedPlaceId}
                onClick={() => { setSelectedId(place.id); setMapPage(Math.max(0, Math.floor(locatedPlaces.findIndex(item => item.id === place.id) / 8))); }}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M12 2.5a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z" fill="currentColor" />
                </svg>
              </button>
              </div>
            </div>
            <p>{CATEGORY_LABELS[place.category]}{status.status !== 'unknown' && <> · {statusLabel[status.status]}</>}</p>
            <div className="region-today-hours" aria-label={`${place.name} 오늘 운영시간`}>
              <p><strong>오늘 운영시간</strong> <time dateTime={now.slice(0, 10)}>{now.slice(5, 10).replace('-', '.')}</time></p>
              {hours.status === 'unknown' ? <p>{hours.note.startsWith('운영정보 검토 기간 밖') ? '운영정보 재확인 필요' : '운영시간 미확인'}</p> : hours.ranges.length === 0 ? <p>오늘 휴무</p>
                : <ul>{hours.ranges.map((range, slot) => <li key={slot}><span>{range.open}–{range.close}</span>
                  {range.lastEntry && <small>입장·주문 마감 {range.lastEntry}</small>}</li>)}</ul>}
            </div>
            {!scored?.eligible && state.search && <p className="region-place-meta">현재 추천 조건 밖</p>}
            {hours.status === 'known' && hours.note && <p className="region-place-meta">{hours.note}</p>}
            {place.opening.entryCondition && status.status !== 'unknown'
              && !/^(공개 시간표 기준|일반 전시 관람 기준)/.test(place.opening.entryCondition)
              && <p className="region-place-meta">{place.opening.entryCondition}</p>}
            {place.isVirtual && <p className="region-place-meta">시연용 가상 장소 · 위치와 운영정보도 가상입니다.</p>}
            {(place.address || place.searchSource) && <p className="region-place-meta">{place.address}{place.address && place.searchSource && ' · '}{place.searchSource && <a href={place.searchSource.url} target="_blank" rel="noreferrer">네이버에서 장소 보기</a>}</p>}
            {events.map((event) => <div className="region-place-meta" key={event.id}>
              <strong>{event.name}{event.isVirtual ? ' (시연용)' : ''}</strong>
              <p>{eventLabel[eventState(event, now)]} · {event.condition.text ?? '참여 조건 확인 필요'}</p>
              {event.sessions.map((session, n) => <p key={n}>{eventDate.format(new Date(session.start))} ~ {eventDate.format(new Date(session.end))} (한국 시간)</p>)}
            </div>)}
          </li>;
        })}
      </ul>
      </section>
    </div>
    {visitPlace && <VisitDialog key={visitPlace.id} place={visitPlace} onClose={() => setVisitPlaceId(undefined)} />}
  </section>;
}

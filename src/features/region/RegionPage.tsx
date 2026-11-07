// Region map/detail; score and visit state come from the shared engine.
import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { Icon } from '../../components/Icon';
import { content, eventsOfPlace, placesOfRegion, regionById } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { distanceKm, eventState, placeStatus } from '../../domain/score';
import { placeRating } from '../../domain/rating';
import { openingOnDate } from '../../domain/opening';
import type { Place } from '../../domain/types';
import { go } from '../../route';
import { discoverPlaces } from '../../domain/discovery';
import { centreLatLng, dongByCode, dongsOfRegion } from '../map/ansanGeo';
import { DongMap, type MapMarker } from '../map/DongMap';
import { Memories, type MemoryItem } from './Memories';
import { loadSadongMemoryPreview, SADONG_ID, SADONG_MEMORY_KEY, type SadongMemoryPreview } from './sadongMemories';
import { VisitDialog } from '../visits/VisitDialog';
import { placeImage, usePlaceThumbnails } from './placeImages';
import './region.css';

const statusLabel = { open: '운영 중', closed: '휴무·이용 마감', unknown: '운영정보 미확인' };
const eventLabel = { active: '진행 중', cancelled: '취소', ended: '종료', upcoming: '예정', not_now: '선택 시각 외', condition_unknown: '참여 조건 확인 필요' };
/** Current time in Korea as 'YYYY-MM-DDTHH:MM', so opening info always reflects today. */
function nowKst(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
/** Display-only wording for the engine's status notes (the engine strings stay unchanged). */
function friendlyNote(note: string): string {
  if (note === '운영정보 미확인') return '운영 시간을 아직 확인하지 못했어요. 가기 전에 한 번 확인해 주세요.';
  if (note === '선택한 요일의 운영정보 미확인') return '오늘 요일의 운영 시간은 아직 확인하지 못했어요. 가기 전에 한 번 확인해 주세요.';
  if (note.startsWith('운영정보 검토 기간 밖')) return '운영 정보가 오래됐어요. 가기 전에 공식 안내를 다시 확인해 주세요.';
  if (note === '휴무일') return '오늘은 쉬는 날이에요.';
  if (note === '운영 시간 아님') return '지금은 운영 시간이 아니에요.';
  const cutoff = note.match(/^입장·주문 마감 (\d{2}:\d{2})$/);
  if (cutoff) return `${cutoff[1]}에 입장·주문이 마감됐어요.`;
  return note;
}
const todayLabel = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const eventDate = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });

const naverMapUrl = (place: Place) => place.searchSource?.url
  ?? `https://map.naver.com/p/search/${encodeURIComponent(`${place.address ?? '안산시'} ${place.name}`)}`;

function revealMapLocation(map: HTMLDivElement | null) {
  if (!map) return;
  const pin = map.querySelector<HTMLElement>('[aria-current="location"]');
  // Keep keyboard navigation at the newly revealed place, without a second scroll.
  (pin ?? map).focus({ preventScroll: true });
  const inset = (document.querySelector('.appbar')?.getBoundingClientRect().height ?? 56) + 16;
  const mapTop = map.getBoundingClientRect().top + window.scrollY;
  let top = mapTop - inset;
  if (pin) {
    const bounds = pin.getBoundingClientRect();
    const pinTop = bounds.top + window.scrollY;
    // A tall district map can extend below the viewport. Keep the selected pin
    // fully visible instead of stopping at the top with its location offscreen.
    if (pinTop + bounds.height - top > window.innerHeight - 16) {
      top = pinTop + bounds.height / 2 - (window.innerHeight + inset) / 2;
    }
  }
  window.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

export function RegionPage({ regionId }: { regionId: string }) {
  return <RegionDetail key={regionId} regionId={regionId} />;
}

function RegionDetail({ regionId }: { regionId: string }) {
  const { state } = useAppState();
  const [expandedForMemory, setExpandedForMemory] = useState(false);
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
  const mapRef = useRef<HTMLDivElement>(null);
  const thumbnails = usePlaceThumbnails();
  const region = regionById(regionId);
  if (!region) return <section>
    <h1>행정동을 찾을 수 없어요</h1>
    <button onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
  </section>;
  const { candidates: places, displayed, scores } = discoverPlaces(region, content, state.profile, state.visits, state.search);
  const visitedIds = new Set(state.visits.map(visit => visit.placeId));
  // Keep the default 20-place recommendation. A remembered place outside those
  // results can still reveal its card for reviewing and editing visit records.
  const visiblePlaces = expandedForMemory ? places : displayed;
  // Nothing is pinned until the user picks a place; then only that place is pinned.
  const selectedPlaceId = visiblePlaces.some((place) => place.id === selectedId) ? selectedId : undefined;
  const locatedPlaces = visiblePlaces.filter(place => place.location);
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
  const shownPlace = locatedPlaces.find(place => place.id === selectedPlaceId && !exampleIds.has(place.id));
  const home = regionDongs.find((dong) => dong.code === dongByCode(state.profile.homeDongCode ?? '')?.code);
  const markers: MapMarker[] = [
    ...(home ? [{ id: 'home', kind: 'home' as const, ...centreLatLng(home), label: `내 동네 · ${home.name}` }] : []),
    ...(shownPlace?.location ? [{ id: shownPlace.id, kind: 'place' as const, ...shownPlace.location, text: String(visiblePlaces.indexOf(shownPlace) + 1),
      image: placeImage(shownPlace.id, thumbnails[shownPlace.id]), label: `${shownPlace.name} 네이버지도에서 보기 (새 탭)`,
      href: naverMapUrl(shownPlace), pressed: true, remembered: visitedIds.has(shownPlace.id) }] : []),
    // Fixed memory examples remain visible; only the chosen one expands to a photo pin.
    ...examplePlaces.flatMap(place => place.location ? [{ id: place.id, kind: 'memory' as const, ...place.location,
      label: `${place.name} 추억 예시 네이버지도에서 보기 (새 탭)`, href: naverMapUrl(place), pressed: place.id === selectedPlaceId,
      image: place.id === selectedPlaceId ? placeImage(place.id, thumbnails[place.id]) : undefined }] : []),
  ];
  const selectPlace = (id: string, scrollToCard = true) => {
    const nextPlaces = visiblePlaces.some(place => place.id === id) ? visiblePlaces : places;
    if (nextPlaces !== visiblePlaces) setExpandedForMemory(true);
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
    <h1 tabIndex={-1}>{region.name}</h1>
    {places.length === 0 && <p role="status">이 동네의 장소는 준비 중이에요.</p>}
    {!state.search && <p className="region-note">조건을 설정하면 추천 장소를 골라볼 수 있어요.</p>}
    <p className="region-note" role="status">{visiblePlaces.length}곳</p>
    {visiblePlaces.length === 0 && places.length > 0 && <div className="region-empty">
      <p>선택한 조건에 맞는 추천 장소가 없어요.</p>
    </div>}
    <div className="region-design-layout">
      <DongMap ref={mapRef} target={regionDongs} markers={markers} />
      {visiblePlaces.some(place => !place.location) && <p className="region-note">위치 미확인 장소는 목록에만 표시돼요.</p>}
      <Memories items={memoryItems} selectedId={memoryId} onSelect={selectMemory} controls={regionId === SADONG_ID && <>
        <div className="memory-preview-actions">
          <button type="button" onClick={() => changePreview({ ...preview.value, enabled: !preview.value.enabled })}>{preview.value.enabled ? '예시 숨기기' : '예시 보기'}</button>
        </div>
        {preview.error && <p role="alert" className="region-note"><Icon name="alert" size={18} />{preview.error}</p>}
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
      <h2 className="region-list-heading" id="region-recommend-title">이 동네에서 발견하기</h2>
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
              <button className="region-map-focus" aria-label={`${place.name} 지도에서 위치 보기`} title="지도에서 위치 보기" aria-pressed={place.id === selectedPlaceId}
                disabled={!place.location}
                onClick={() => {
                  selectPlace(place.id, false);
                  requestAnimationFrame(() => revealMapLocation(mapRef.current));
                }}>
                <Icon name="pin" />
              </button>
              </div>
            </div>
            <p>{CATEGORY_LABELS[place.category]}{status.status !== 'unknown' && <> · {statusLabel[status.status]}</>}</p>
            {/* One place explains unconfirmed hours: the today-hours box, in conversational wording. */}
            <div className="region-today-hours" aria-label={`${place.name} 오늘 운영시간`}>
              <p><strong>오늘 운영시간</strong> <time dateTime={now.slice(0, 10)}>{now.slice(5, 10).replace('-', '.')}</time></p>
              {hours.status === 'unknown' ? <p>{friendlyNote(hours.note)}</p> : hours.ranges.length === 0 ? <p>오늘 휴무</p>
                : <ul>{hours.ranges.map((range, slot) => <li key={slot}><span>{range.open}–{range.close}</span>
                  {range.lastEntry && <small>입장·주문 마감 {range.lastEntry}</small>}</li>)}</ul>}
            </div>
            {!scored?.eligible && state.search && <p className="region-place-meta">지금 조건에서는 추천하지 않지만 둘러볼 수 있어요.</p>}
            {status.status !== 'unknown' && status.note && <p className="region-place-meta">{friendlyNote(status.note)}</p>}
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

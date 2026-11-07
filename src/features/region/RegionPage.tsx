// Region map/detail; score and visit state come from the shared engine.
import { useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { content, eventsOfPlace, placesOfRegion, regionById } from '../../data/content';
import { CATEGORY_LABELS, FOOTFALL_MAX_PENALTY_RATE } from '../../domain/policy';
import { franchiseStatus } from '../../domain/placeEligibility';
import { distanceKm, eventState, normalizeRegionBase, placeStatus, recommend, regionLevel } from '../../domain/score';
import { footfallAdjustment } from '../../domain/footfall';
import { placePopularity, POPULARITY_LABELS } from '../../domain/popularity';
import { go } from '../../route';
import { discoverPlaces } from '../../domain/discovery';
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
  const [filter, setFilter] = useState<'all' | 'visited' | 'recommended' | 'pool'>('all');
  const [mapPage, setMapPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [memoryId, setMemoryId] = useState<string>();
  const cards = useRef<Record<string, HTMLLIElement | null>>({});
  const region = regionById(regionId);
  if (!region) return <section>
    <h1>행정동을 찾을 수 없어요</h1>
    <button onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
  </section>;
  const { candidates: places, displayed, scores } = discoverPlaces(region, content, state.profile, state.visits, state.search);
  const classifications = content.places.filter(place => place.regionId === region.id).map(franchiseStatus);
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
  const memoryItems = visitMemories;
  const home = regionDongs.find((dong) => dong.code === dongByCode(state.profile.homeDongCode ?? '')?.code);
  const markers: MapMarker[] = [
    ...(home ? [{ id: 'home', kind: 'home' as const, ...centreLatLng(home), label: `내 동네 · ${home.name}` }] : []),
    ...locatedPlaces.slice(currentMapPage * 8, (currentMapPage + 1) * 8).flatMap(place => place.location ? [{ id: place.id, kind: 'place' as const, ...place.location, text: String(visiblePlaces.indexOf(place) + 1),
      label: `${place.name} 지도에서 선택`, pressed: place.id === selectedPlaceId, remembered: visitedIds.has(place.id) }] : []),
  ];
  const selectPlace = (id: string) => {
    const nextPlaces = visiblePlaces.some(place => place.id === id) ? visiblePlaces : places;
    if (nextPlaces !== visiblePlaces) setFilter('pool');
    setMapPage(Math.max(0, Math.floor(nextPlaces.filter(place => place.location).findIndex(place => place.id === id) / 8)));
    setSelectedId(id);
    setMemoryId(id);
    requestAnimationFrame(() => cards.current[id]?.scrollIntoView({ behavior: 'instant', block: 'nearest' }));
  };
  const selectMemory = selectPlace;
  const selectedCount = scores.filter(score => score.selected).length;
  const eligibleCount = scores.filter(score => score.eligible).length;
  const level = regionLevel(region.id, state.profile, state.visits, content.places);
  const placeScoreSum = scores.filter(score => score.selected).reduce((sum, score) => sum + score.score, 0);
  const normalizedBase = normalizeRegionBase(placeScoreSum);
  const recommendation = state.search ? recommend({ ...content, regions: [region] }, state.profile, state.visits, state.search).recommendations[0] : undefined;
  const footfall = footfallAdjustment(region, level, content.footfall, normalizedBase);
  const markets = content.footfall?.markets.filter(market => region.footfallMarketIds?.includes(market.id)) ?? [];

  return <section className="region-detail">
    <button className="region-back" onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
    <p className="eyebrow">동네 둘러보기</p>
    <h1>{region.name}</h1>
    <p className="region-lead">이 동네의 새로운 곳과 나의 발걸음을 함께 살펴보세요.</p>
    <p>{region.description}</p>
    {recommendation && <p className="region-summary">지역 추천 점수 {recommendation.score.toFixed(1)} / 100 · 반영 장소 {selectedCount}/20곳 · 정보 검토 중 {recommendation.provisionalPlaceCount}곳</p>}
    <details className="region-note">
      <summary>유동인구 반영 내역</summary>
      <p>장소 {selectedCount}곳 점수 합계 {placeScoreSum.toFixed(2)} / 2,200 × 100 = 정규화 기본 {normalizedBase.toFixed(2)}점</p>
      {footfall.status === 'available' ? <>
        <p>{footfall.period} · {region.name}으로 표시된 상권 {markets.length}곳 · 일평균 수치 합계 {footfall.dailyAverage.toLocaleString('ko-KR')}명</p>
        <p>{markets.map(market => market.name).join(' · ')}</p>
        <p>수집 상권 내 비중 {(100 * footfall.normalizedShare).toFixed(2)}% = {footfall.dailyAverage.toLocaleString('ko-KR')} / {footfall.referenceTotal.toLocaleString('ko-KR')}</p>
        <p>감점 기준: 수집 자료의 최대 동별 합계 {footfall.referenceMax.toLocaleString('ko-KR')}명 대비 {(100 * footfall.normalizedIntensity).toFixed(2)}%</p>
        <p>지역 Lv.{level} · 유동인구 감점률 {(100 * footfall.penaltyRate).toFixed(2)}% (최대 {100 * FOOTFALL_MAX_PENALTY_RATE[level]}%){level === 0 && ' · Lv.0 감점 없음'}</p>
        <p>정규화 기본 점수 {normalizedBase.toFixed(2)}점 × 감점률 = 유동인구 감점 {Math.abs(footfall.adjustment).toFixed(2)}점</p>
        <p>{state.search && selectedCount > 0 ? '20곳 점수를 고정 기준으로 0~100점으로 바꾼 뒤 유동인구·새로움·거리를 반영합니다.' : '점수에 반영할 장소가 없어 아직 차감하지 않습니다. 위 감점률은 장소 점수를 계산할 때 적용합니다.'}</p>
        <p>원자료의 동 이름으로 묶은 상권 대리지표입니다. 상권 경계를 행정동별로 나누거나 동 전체 인구를 측정한 값이 아닙니다.</p>
        <a href={footfall.source.url} target="_blank" rel="noreferrer">유동인구 원자료 출처</a>
      </> : <p>유동인구 미반영 · 제공 자료에 연결된 상권이 없습니다. 0명으로 측정된 동이라는 뜻은 아닙니다.</p>}
    </details>
    <div className="region-summary"><span>실제 검색 장소 {displayed.length}/20곳 · 전체 후보 {places.length}곳</span><span>방문 기록이 있는 장소 {places.filter((place) => visitedIds.has(place.id)).length}곳</span></div>
    {region.source && <p className="region-place-meta"><a href={region.source.url} target="_blank" rel="noreferrer">{region.source.label}</a> · 확인 {region.source.checkedAt}</p>}
    <p>{state.search ? `${state.search.when.replace('T', ' ')} (한국 시간) 기준 장소 추천` : '조건을 설정하면 추천순으로 표시합니다.'}</p>
    {state.search && <p className="region-note">지역 점수 반영 {selectedCount}/20개 · 화면의 추천 장소와 점수에 넣는 장소가 같습니다. 조건 충족 후보 {eligibleCount}개에서 현재 점수순으로 선정합니다.
      {selectedCount < 20 && ' 조건에 맞는 후보 부족 · 20곳 만점 기준을 유지합니다.'} 방문 기록이 바뀌면 전체 후보에서 다시 선정합니다.</p>}
    <p className="region-place-meta">확인된 프랜차이즈와 체인 의심 후보는 제외합니다. 운영·리뷰·분류 미확인 후보도 잠정 점수에 포함하며 영업 중·비프랜차이즈로 확정한 것은 아닙니다. 분류 미확인 {classifications.filter(status => status === 'unknown').length}곳.</p>
    {places.length === 0 && <p role="status">데이터 준비 중 · 비프랜차이즈로 확인된 실제 장소를 조사한 뒤 반영합니다.</p>}
    <div className="region-filters" role="group" aria-label="동네 안 장소 필터">
      {([['all', '발견할 20곳'], ['recommended', '점수 반영 장소'], ['visited', '가본 장소'], ['pool', '전체 후보']] as const).map(([value, label]) =>
        <button key={value} aria-pressed={filter === value} disabled={value === 'recommended' && !state.search}
          onClick={() => { setFilter(value); setSelectedId(undefined); setMapPage(0); }}>{label}</button>)}
    </div>
    {!state.search && <p className="region-note">조건을 설정하면 추천 장소를 골라볼 수 있어요.</p>}
    <p className="region-note" role="status">표시된 장소 {visiblePlaces.length}곳</p>
    {filter === 'all' && visitMemories.length > 0 && <p className="region-note" role="status">방문 기록을 반영해 20곳을 다시 구성했어요. 기록한 장소는 ‘가본 장소’에서 확인·수정·삭제할 수 있어요.</p>}
    {filter === 'recommended' && places.some(place => visitedIds.has(place.id) && !visiblePlaces.some(visible => visible.id === place.id)) &&
      <p className="region-note" role="status">방문 기록을 반영해 상위 20개를 다시 골랐어요. 추천 밖으로 이동한 장소의 기록은 ‘가본 장소’에서 확인·수정·삭제할 수 있어요.</p>}
    {visiblePlaces.length === 0 && places.length > 0 && <div className="region-empty">
      <p>{filter === 'visited' ? '아직 이 동네에 남긴 방문 기록이 없어요.' : '선택한 조건에 맞는 추천 장소가 없어요.'}</p>
      <button onClick={() => setFilter('all')}>발견할 20곳 보기</button>
    </div>}
    <div className="region-design-layout">
      <DongMap target={regionDongs} markers={markers}
        onSelect={(marker) => marker.kind === 'memory' ? setMemoryId(marker.id) : selectPlace(marker.id)} />
      {mapPages > 1 && <nav className="region-filters" aria-label="지도 장소 페이지">
        <button disabled={currentMapPage === 0} onClick={() => setMapPage(currentMapPage - 1)}>이전 지도 장소</button>
        <span>{currentMapPage + 1} / {mapPages} · 지도에 {currentMapPage * 8 + 1}–{Math.min((currentMapPage + 1) * 8, locatedPlaces.length)}번 표시</span>
        <button disabled={currentMapPage + 1 >= mapPages} onClick={() => setMapPage(currentMapPage + 1)}>다음 지도 장소</button>
      </nav>}
      <p className="region-note">2026-10-01 실제 행정동 경계 · 네이버 검색 응답의 실제 장소 좌표입니다. 번호: 아래 장소 목록 순서 · 하트: 기록한 추억 · 점: 장소 좌표</p>
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
      <p className="region-note">현재 장소 점수 상위 20곳입니다. 리뷰 미확인은 인기가 적다는 뜻으로 처리하지 않고 보수적인 인지도 감점을 적용합니다. 운영정보가 미확인이면 방문 전에 확인해 주세요.</p>
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
            {scored?.eligible ? <p>장소 추천 점수 {scored.score.toFixed(1)}{scored.provisional && ' · 정보 검토 중인 잠정 점수'} · {scored.rank}위 · {scored.selected ? '상위 20개 · 지역 점수에 포함' : '상위 20개 밖 · 지역 점수에 미포함'}</p>
              : <p>직접 탐색 · 현재 추천 점수에서 제외됩니다.</p>}
            {status?.note && <p className="region-place-meta">{status.note}</p>}
            <p className="region-place-meta">{place.opening.entryCondition ?? '이용 조건 확인 필요'} · 도착 후 입장 가능 여부는 별도 확인이 필요합니다.</p>
            {place.isVirtual && <p className="region-place-meta">시연용 가상 장소 · 위치와 운영정보도 가상입니다.</p>}
            {!place.isVirtual && <p className="region-place-meta">실제 검색 장소 · {place.address} · <a href={place.regionSource?.url} target="_blank" rel="noreferrer">행정동 소속 근거</a></p>}
            {place.searchSource && <p className="region-place-meta"><a href={place.searchSource.url} target="_blank" rel="noreferrer">네이버에서 장소 보기</a> · 후보 확인 {place.searchSource.checkedAt}</p>}
            <p className="region-place-meta">공통 기본값 B={place.baseValue} · 별점이나 조사된 품질 점수가 아닙니다.</p>
            <p className="region-place-meta">{popularity.status === 'measured' ? <>
              {POPULARITY_LABELS[popularity.evidence.metric]} {popularity.evidence.count.toLocaleString('ko-KR')}건 · {popularity.evidence.period === 'cumulative' ? '누적' : popularity.evidence.period}
              {' '}· <a href={popularity.evidence.source.url} target="_blank" rel="noreferrer">{popularity.evidence.source.label}</a> · 조회 {popularity.evidence.source.checkedAt}{popularity.evidence.observedAt && ` · 출처 갱신 ${popularity.evidence.observedAt}`}
              {popularity.evidence.metric === 'visitor_reviews' && ' · 방문자 리뷰는 실제 총방문자 수가 아닙니다.'}
            </> : popularity.status === 'simulated' ? `인지도 ${popularity.value} · 시연용 가상값` : '방문·리뷰 수 미확인 · 실제 건수는 없으며 인지도 감점은 최대 수준으로 보수적 적용 (Lv.0은 감점 없음)'}</p>
            <p className="region-place-meta">{franchiseStatus(place) === 'non_franchise' ? <>
              비프랜차이즈 분류 · {place.franchise.source?.url
                ? <a href={place.franchise.source.url} target="_blank" rel="noreferrer">{place.franchise.source.label}</a>
                : place.franchise.source?.label} · {place.franchise.source?.checkedAt}
            </> : '프랜차이즈 여부 검토 중 · 잠정 추천 점수·Lv에 반영하며 비프랜차이즈 확정은 아닙니다'}</p>
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

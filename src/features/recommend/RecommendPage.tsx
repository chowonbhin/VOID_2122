// Golden-path step 2 and the screen step 5 returns to. Owner: chowonbhin.
import { useAppState } from '../../AppState';
import { content, naverCandidateStatus } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { recommend, regionLevel } from '../../domain/score';
import { go } from '../../route';
import { ExplorationMap, FAMILIARITY } from '../map/ExplorationMap';
import './recommend.css';

export function RecommendPage() {
  const { state } = useAppState();
  const { search } = state;
  if (!search) {
    return (
      <section className="recommend">
        <p className="eyebrow">동네 발견</p>
        <h1>추천 행정동</h1>
        <p className="recommend-hero">오늘은 어느 동네에<br />마음을 남겨볼까요?</p>
        <ExplorationMap regions={content.regions} recommendations={[]}
          levels={Object.fromEntries(content.regions.map((region) => [region.id, regionLevel(region.id, state.profile, state.visits, content.places)]))}
          homeDongCode={state.profile.homeDongCode}
          onRegionSelect={(regionId) => go({ name: 'region', regionId })} onDongSelect={(code) => go({ name: 'dong', code })} />
        <div className="recommend-empty">
          <p>먼저 탐험 조건을 입력해 주세요.</p>
          <p className="recommend-note">출발지와 시간, 관심 활동을 알려주면 지금 운영 중인 곳을 기준으로 동네를 추천해요.</p>
          <button className="primary" onClick={() => go({ name: 'setup' })}>조건 설정</button>
        </div>
      </section>
    );
  }

  // Contract: current persisted Profile + Visit[] + SearchContext → RecommendResult.
  // Recompute on every state change and reload; all scoring and ordering belong to the shared engine.
  const result = recommend(content, state.profile, state.visits, search);
  const ranked = result.allZero ? [] : result.recommendations;
  const explore = result.allZero
    ? content.regions
    : content.regions.filter((region) => result.excluded.some((item) => item.regionId === region.id));

  // 장소 추천: the top places (engine order) of each recommended 동네, in recommendation order.
  const picks = ranked.flatMap((item, index) => {
    const region = content.regions.find((candidate) => candidate.id === item.regionId)!;
    return item.placeIds.slice(0, 2).flatMap((id) => {
      const place = content.places.find((candidate) => candidate.id === id);
      return place ? [{ place, region, rank: index + 1, level: item.level, item }] : [];
    });
  });

  return (
    <section className="recommend">
      <p className="eyebrow">동네 발견</p>
      <h1>추천 행정동</h1>
      <p className="recommend-hero">오늘은 어느 동네에<br />마음을 남겨볼까요?</p>
      <p className="recommend-sub">나의 발자국 사이로, 새로운 발견 하나.</p>
      <p className="recommend-note">네이버 실제 검색 후보 {naverCandidateStatus.rawCandidateCount.toLocaleString('ko-KR')}곳 · {naverCandidateStatus.checkedAt} 확인.
        각 동에서 실제 장소 20곳을 탐색할 수 있습니다. 리뷰 수를 연결한 장소는 {naverCandidateStatus.reviewCount}곳입니다.</p>
      {state.needsDongLevelReview && <p role="status">행정동별 익숙함을 다시 확인해 주세요. 이전 A·B권역의 초기 설정은 보관했고 방문 기록은 유지했습니다. ‘조건 변경’에서 새로 설정할 수 있습니다.</p>}
      <p className="recommend-note">지역 점수는 화면에 추천하는 실제 20곳을 모두 반영한 0~100점입니다. 운영·리뷰·분류 미확인도 잠정 계산에 포함하므로 방문 전에 정보를 확인해 주세요.</p>
      <div className="recommend-summary" aria-label="현재 탐험 조건">
        <p>{search.origin.label} 출발 · 최대 직선거리 {search.maxDistanceKm} km</p>
        <p>{search.when.replace('T', ' ')} (한국 시간)</p>
        <p>관심 활동: {search.interests.length ? search.interests.map((category) => CATEGORY_LABELS[category]).join(', ') : '전체'}</p>
        <button onClick={() => go({ name: 'setup' })}>조건 변경</button>
      </div>
      <p className="recommend-note">확인된 휴무 장소는 제외하고 운영 미확인은 별도 표시합니다. 직선거리는 실제 이동 거리·도착 시간이 아니며, 모든 장소를 한 번에 방문할 수 있다는 뜻은 아닙니다.</p>
      <p className="recommend-note">확인된 프랜차이즈와 체인 의심 후보는 제외합니다. 분류 미확인은 잠정 점수임을 표시합니다.</p>

      <ExplorationMap regions={content.regions} recommendations={result.recommendations} exclusions={result.excluded} searchConfigured
        levels={Object.fromEntries(content.regions.map((region) => [region.id, regionLevel(region.id, state.profile, state.visits, content.places)]))}
        homeDongCode={state.profile.homeDongCode}
        onRegionSelect={(regionId) => go({ name: 'region', regionId })} onDongSelect={(code) => go({ name: 'dong', code })} />

      {picks.length > 0 ? (
        <section className="place-recommend" aria-labelledby="place-recommend-title">
          <div className="recommend-section-head">
            <h2 id="place-recommend-title">장소 추천</h2>
            <span>오늘의 추천 동네에서 골랐어요</span>
          </div>
          <ol className="place-recommend-list" aria-label="장소 추천">
            {picks.map(({ place, region, rank, level, item }) => <li key={place.id}>
              <button className="place-pick" aria-label={`${place.name} · ${region.name} 장소 보기`} onClick={() => go({ name: 'region', regionId: region.id })}>
                <span className="place-pick-kicker">{CATEGORY_LABELS[place.category]} · {region.name}</span>
                <strong>{place.name}</strong>
                <span className="place-pick-meta">오늘의 추천 {rank}순위 동네 · {FAMILIARITY[level].label}</span>
                <span className="place-pick-meta">동 점수 {item.score.toFixed(1)} / 100 · {item.placeIds.length}/20곳 반영 · 정보 검토 중 {item.provisionalPlaceCount}곳</span>
              </button>
            </li>)}
          </ol>
        </section>
      ) : (
        <div className="recommend-empty" role="status">
          <h2>{result.allZero ? '추천을 정하기 어려워요' : '조건에 맞는 추천 행정동이 없어요'}</h2>
          <p>{result.allZero ? '모든 후보의 추천 점수가 0점입니다. 조건을 변경하거나 행정동을 직접 탐색해 주세요.' : '날짜·시각, 관심 활동 또는 최대 거리를 변경해 보세요. 입력한 조건은 그대로 유지됩니다.'}</p>
        </div>
      )}

      {content.footfall && <p className="recommend-note">
        유동인구 기준: {content.footfall.period}, 수집한 {content.footfall.markets.length}개 상권 내 비중입니다.
        원자료의 동 이름으로 {content.regions.filter(region => region.footfallMarketIds?.length).length}/25개 동에 연결한 상권 대리지표입니다.
        행정동 전체 통계·중복을 제거한 실인원·실시간 혼잡도가 아닙니다. 장소 합계에서 Lv.1 최대 15%, Lv.2 최대 30%를 감점하며 Lv.0은 감점하지 않습니다.{' '}
        <a href={content.footfall.source.url} target="_blank" rel="noreferrer">소상공인365 출처</a>
        {' '}· 자료 조회일 {content.footfall.source.checkedAt}
      </p>}

      {explore.length > 0 && <section aria-label="직접 탐색" className="recommend-explore">
        <h2>행정동 직접 탐색</h2>
        <p className="recommend-note">추천 조건과 관계없이 장소 정보를 살펴볼 수 있습니다.</p>
        <ul className="cards">
          {explore.map((region) => {
            const excluded = result.excluded.find((item) => item.regionId === region.id);
            return <li key={region.id}>
              <button className="card" onClick={() => go({ name: 'region', regionId: region.id })}>
                <strong>{region.name}</strong>
                <span>{excluded?.reason === 'no_data' ? '데이터 준비 중 · 실제 장소 조사 후 반영합니다'
                  : excluded?.reason === 'too_far'
                  ? `최대 거리 밖 · 시작점 직선거리 ${excluded.distanceKm.toFixed(1)} km`
                  : excluded?.reason === 'no_eligible_places'
                    ? '선택 시각의 휴무·관심 활동·제외 조건을 반영한 후보가 없어요'
                    : '추천 점수 0점 · 직접 탐색 가능'}</span>
                <span className="recommend-link">장소 살펴보기 →</span>
              </button>
            </li>;
          })}
        </ul>
      </section>}
    </section>
  );
}

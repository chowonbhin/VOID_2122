// Golden-path step 2 and the screen step 5 returns to. Owner: chowonbhin.
import { useAppState } from '../../AppState';
import { content } from '../../data/content';
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
        <h1 className="visually-hidden">추천 행정동</h1>
        <ExplorationMap regions={content.regions} recommendations={[]}
          levels={Object.fromEntries(content.regions.map((region) => [region.id, regionLevel(region.id, state.profile, state.visits, content.places)]))}
          homeDongCode={state.profile.homeDongCode}
          onRegionSelect={(regionId) => go({ name: 'region', regionId })} onDongSelect={(code) => go({ name: 'dong', code })} />
        <div className="recommend-empty">
          <p>먼저 간단한 질문에 답해 주세요.</p>
          <p className="recommend-note">내 동네와 가본 곳, 관심 활동을 알려주면 내 동네에서 출발하는 동네를 추천해요.</p>
          <button className="primary" onClick={() => go({ name: 'onboarding' })}>시작 설정하기</button>
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
      return place ? [{ place, region, rank: index + 1, level: item.level }] : [];
    });
  });

  return (
    <section className="recommend">
      {/* The welcome copy lives in the launch splash (Splash.tsx); this heading names the page. */}
      <h1 className="visually-hidden">추천 행정동</h1>
      {state.needsDongLevelReview && <p role="status">행정동별 익숙함을 다시 확인해 주세요. 이전 A·B권역의 초기 설정은 보관했고 방문 기록은 유지했습니다. ‘다시 설정하기’에서 새로 설정할 수 있습니다.</p>}
      <div className="recommend-summary" aria-label="현재 탐험 조건">
        <p>{search.origin.label} 출발 · 최대 직선거리 {search.maxDistanceKm} km</p>
        <p>{search.when.replace('T', ' ')} (한국 시간)</p>
        <p>관심 활동: {search.interests.length ? search.interests.map((category) => CATEGORY_LABELS[category]).join(', ') : '전체'}</p>
      </div>

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
            {picks.map(({ place, region, rank, level }) => <li key={place.id}>
              <button className="place-pick" aria-label={`${place.name} · ${region.name} 장소 보기`} onClick={() => go({ name: 'region', regionId: region.id })}>
                <span className="place-pick-kicker">{CATEGORY_LABELS[place.category]} · {region.name}</span>
                <strong>{place.name}</strong>
                <span className="place-pick-meta">오늘의 추천 {rank}순위 동네 · {FAMILIARITY[level].label}</span>
              </button>
            </li>)}
          </ol>
        </section>
      ) : (
        <div className="recommend-empty" role="status">
          <h2>{result.allZero ? '추천을 정하기 어려워요' : '조건에 맞는 추천 행정동이 없어요'}</h2>
          <p>{result.allZero ? '지금 조건으로는 추천할 동네가 없어요. 조건을 바꾸거나 동네를 직접 둘러보세요.' : '날짜·시각, 관심 활동 또는 최대 거리를 변경해 보세요. 입력한 조건은 그대로 유지됩니다.'}</p>
        </div>
      )}


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
                  ? `최대 거리 밖 · 출발지에서 ${excluded.distanceKm.toFixed(1)} km`
                  : excluded?.reason === 'no_eligible_places'
                    ? '지금 시각·관심 활동에 맞는 장소가 없어요'
                    : '직접 둘러볼 수 있어요'}</span>
                <span className="recommend-link">장소 살펴보기 →</span>
              </button>
            </li>;
          })}
        </ul>
      </section>}
    </section>
  );
}

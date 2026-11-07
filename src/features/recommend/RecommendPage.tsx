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
          <button className="primary" onClick={() => go({ name: 'onboarding' })}>시작 설정하기</button>
        </div>
      </section>
    );
  }

  // Contract: current persisted Profile + Visit[] + SearchContext → RecommendResult.
  // Recompute on every state change and reload; all scoring and ordering belong to the shared engine.
  const result = recommend(content, state.profile, state.visits, search);
  const ranked = result.allZero ? [] : result.recommendations;
  // Show up to five places, preserving the engine's dong order and two picks per dong.
  const picks = ranked.flatMap((item, index) => {
    const region = content.regions.find((candidate) => candidate.id === item.regionId)!;
    return item.placeIds.slice(0, 2).flatMap((id) => {
      const place = content.places.find((candidate) => candidate.id === id);
      return place ? [{ place, region, rank: index + 1, level: item.level }] : [];
    });
  }).slice(0, 5);

  return (
    <section className="recommend">
      {/* The welcome copy lives in the launch splash (Splash.tsx); this heading names the page. */}
      <h1 className="visually-hidden">추천 행정동</h1>
      {state.needsDongLevelReview && <p role="status">‘다시 설정하기’에서 동네 설정을 확인해 주세요. 방문 기록은 유지됩니다.</p>}
      <ExplorationMap regions={content.regions} recommendations={result.recommendations} exclusions={result.excluded} searchConfigured
        levels={Object.fromEntries(content.regions.map((region) => [region.id, regionLevel(region.id, state.profile, state.visits, content.places)]))}
        homeDongCode={state.profile.homeDongCode}
        onRegionSelect={(regionId) => go({ name: 'region', regionId })} onDongSelect={(code) => go({ name: 'dong', code })} />

      {picks.length > 0 ? (
        <section className="place-recommend" aria-labelledby="place-recommend-title">
          <div className="recommend-section-head">
            <h2 id="place-recommend-title">장소 추천</h2>
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
          <p>조건을 바꾸거나 위 지도에서 동네를 선택해 둘러보세요.</p>
        </div>
      )}
    </section>
  );
}

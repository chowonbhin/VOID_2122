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

  return (
    <section className="recommend">
      <p className="eyebrow">동네 발견</p>
      <h1>추천 행정동</h1>
      <p className="recommend-hero">오늘은 어느 동네에<br />마음을 남겨볼까요?</p>
      <p className="recommend-sub">나의 발자국 사이로, 새로운 발견 하나.</p>
      {state.needsDongLevelReview && <p role="status">행정동별 익숙함을 다시 확인해 주세요. 이전 A·B권역의 초기 설정은 보관했고 방문 기록은 유지했습니다. ‘조건 변경’에서 새로 설정할 수 있습니다.</p>}
      <div className="recommend-summary" aria-label="현재 탐험 조건">
        <p>{search.origin.label} 출발 · 최대 직선거리 {search.maxDistanceKm} km</p>
        <p>{search.when.replace('T', ' ')} (한국 시간)</p>
        <p>관심 활동: {search.interests.length ? search.interests.map((category) => CATEGORY_LABELS[category]).join(', ') : '전체'}</p>
        <button onClick={() => go({ name: 'setup' })}>조건 변경</button>
      </div>

      <ExplorationMap regions={content.regions} recommendations={result.recommendations}
        levels={Object.fromEntries(content.regions.map((region) => [region.id, regionLevel(region.id, state.profile, state.visits, content.places)]))}
        homeDongCode={state.profile.homeDongCode}
        onRegionSelect={(regionId) => go({ name: 'region', regionId })} onDongSelect={(code) => go({ name: 'dong', code })} />

      {ranked.length > 0 && <div className="recommend-section-head">
        <h2>오늘은 이 동네 어때요?</h2>
        <span>낯선 동네의 발견</span>
      </div>}
      {ranked.length > 0 ? (
        <ol className="cards" aria-label="추천 순위">
          {ranked.map((item, index) => {
            const region = content.regions.find((candidate) => candidate.id === item.regionId)!;
            return (
              <li key={region.id}>
                <button className="card recommend-card" aria-label={`${index + 1}순위 ${region.name} 상세 보기`} onClick={() => go({ name: 'region', regionId: region.id })}>
                  <span className="recommend-rank">{index + 1}순위 · 친밀도 {FAMILIARITY[item.level].label}</span>
                  <strong className="recommend-title">{region.name}</strong>
                  <span>{region.features.join(' · ')}</span>
                  {region.isVirtual && <span className="recommend-note">개발용 가상 데이터</span>}
                  <span>출발지에서 직선거리 {item.distanceKm.toFixed(1)} km</span>
                  <span className="recommend-reasons">
                    <strong>추천 이유</strong>
                    {item.reasons.filter((reason) => !reason.includes('합산')).map((reason, reasonIndex) => <span key={reasonIndex}>{reason}</span>)}
                  </span>
                  <span className="recommend-link">행정동 자세히 보기 →</span>
                </button>
              </li>
            );
          })}
        </ol>
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

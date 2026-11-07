// Golden-path step 2 and the screen step 5 returns to. Owner: chowonbhin.
import { useAppState } from '../../AppState';
import { content } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { recommend } from '../../domain/score';
import { go } from '../../route';
import './recommend.css';

export function RecommendPage() {
  const { state } = useAppState();
  const { search } = state;
  if (!search) {
    return (
      <section className="recommend">
        <h1>추천 권역</h1>
        <p>먼저 탐험 조건을 입력해 주세요.</p>
        <button className="primary" onClick={() => go({ name: 'setup' })}>조건 설정</button>
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
      <p className="eyebrow">다음 탐험을 골라보세요</p>
      <h1>추천 권역</h1>
      <div className="recommend-summary" aria-label="현재 탐험 조건">
        <p>{search.origin.label} 출발 · 최대 직선거리 {search.maxDistanceKm} km</p>
        <p>{search.when.replace('T', ' ')} (한국 시간)</p>
        <p>관심 활동: {search.interests.length ? search.interests.map((category) => CATEGORY_LABELS[category]).join(', ') : '전체'}</p>
        <button onClick={() => go({ name: 'setup' })}>조건 변경</button>
      </div>
      <p className="recommend-note">선택한 시각의 운영정보를 기준으로 계산합니다. 직선거리는 실제 이동 거리·도착 시간이 아니며, 모든 장소를 한 번에 방문할 수 있다는 뜻은 아닙니다.</p>

      {ranked.length > 0 ? (
        <ol className="cards" aria-label="추천 순위">
          {ranked.map((item, index) => {
            const region = content.regions.find((candidate) => candidate.id === item.regionId)!;
            return (
              <li key={region.id}>
                <button className="card recommend-card" aria-label={`${index + 1}순위 ${region.name} 상세 보기`} onClick={() => go({ name: 'region', regionId: region.id })}>
                  <span className="recommend-rank">{index + 1}순위 · 지역 Lv.{item.level}</span>
                  <strong className="recommend-title">{region.name}</strong>
                  <span>{region.features.join(' · ')}</span>
                  {region.isVirtual && <span className="recommend-note">개발용 가상 데이터</span>}
                  <span>시작점 직선거리 {item.distanceKm.toFixed(1)} km · 추천 점수 {item.score.toFixed(1)}</span>
                  <span>운영 확인 장소 수 {item.openPlaceCount}곳 · 관심 활동 일치 {item.placeIds.length}곳</span>
                  <span className="recommend-note">운영정보 미확인 {item.unknownPlaceCount}곳은 점수에서 제외됩니다.</span>
                  <span className="recommend-reasons">
                    <strong>추천 이유</strong>
                    {item.reasons.map((reason, reasonIndex) => <span key={reasonIndex}>{reason}</span>)}
                  </span>
                  <span className="recommend-link">권역 자세히 보기 →</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="recommend-empty" role="status">
          <h2>{result.allZero ? '추천을 정하기 어려워요' : '조건에 맞는 추천 권역이 없어요'}</h2>
          <p>{result.allZero ? '모든 후보의 추천 점수가 0점입니다. 조건을 변경하거나 권역을 직접 탐색해 주세요.' : '날짜·시각, 관심 활동 또는 최대 거리를 변경해 보세요. 입력한 조건은 그대로 유지됩니다.'}</p>
        </div>
      )}

      {explore.length > 0 && <section aria-label="직접 탐색" className="recommend-explore">
        <h2>권역 직접 탐색</h2>
        <p className="recommend-note">추천 조건과 관계없이 장소 정보를 살펴볼 수 있습니다.</p>
        <ul className="cards">
          {explore.map((region) => {
            const excluded = result.excluded.find((item) => item.regionId === region.id);
            return <li key={region.id}>
              <button className="card" onClick={() => go({ name: 'region', regionId: region.id })}>
                <strong>{region.name}</strong>
                <span>{excluded?.reason === 'too_far'
                  ? `최대 거리 밖 · 시작점 직선거리 ${excluded.distanceKm.toFixed(1)} km`
                  : excluded?.reason === 'no_eligible_places'
                    ? '선택한 시각·관심 활동에 맞는 운영 확인 장소가 없어요'
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

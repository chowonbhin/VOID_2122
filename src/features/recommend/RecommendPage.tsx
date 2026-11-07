// Golden-path step 2 and the screen step 5 returns to. Owner: chowonbhin.
import { useAppState } from '../../AppState';
import { content } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { recommend, regionLevel } from '../../domain/score';
import { go } from '../../route';
import { ExplorationMap } from '../map/ExplorationMap';
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
      <p className="eyebrow">동네 발견</p>
      <h1>추천 권역</h1>
      <p className="recommend-hero">오늘은 어느 동네에<br />마음을 남겨볼까요?</p>
      <p className="recommend-sub">나의 발자국 사이로, 새로운 발견 하나.</p>
      <div className="recommend-summary" aria-label="현재 탐험 조건">
        <p>{search.origin.label} 출발 · 최대 직선거리 {search.maxDistanceKm} km</p>
        <p>{search.when.replace('T', ' ')} (한국 시간)</p>
        <p>관심 활동: {search.interests.length ? search.interests.map((category) => CATEGORY_LABELS[category]).join(', ') : '전체'}</p>
        <button onClick={() => go({ name: 'setup' })}>조건 변경</button>
      </div>
      <p className="recommend-note">선택한 시각의 운영정보를 기준으로 계산합니다. 직선거리는 실제 이동 거리·도착 시간이 아니며, 모든 장소를 한 번에 방문할 수 있다는 뜻은 아닙니다.</p>
      <p className="recommend-note">프랜차이즈와 분류 미확인 장소는 추천·점수에서 제외합니다.</p>

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
                  <span className="recommend-rank">{index + 1}순위 · 지역 Lv.{item.level}</span>
                  <strong className="recommend-title">{region.name}</strong>
                  <span>{region.features.join(' · ')}</span>
                  {region.isVirtual && <span className="recommend-note">개발용 가상 데이터</span>}
                  <span>시작점 직선거리 {item.distanceKm.toFixed(1)} km · 추천 점수 {item.score.toFixed(1)}</span>
                  {item.footfall.status === 'available' ? <>
                    <span>{item.footfall.period} 상권 유동인구 지표 {item.footfall.dailyAverage.toLocaleString('ko-KR')}명 · 일평균 수치 합계</span>
                    <span>유동인구 감점 {Math.abs(item.footfall.adjustment).toFixed(2)}점{item.level === 0 ? ' · Lv.0 감점 없음' : ' · 새로움·거리 가중치 적용 전'}</span>
                  </> : <span className="recommend-note">유동인구 미반영 · 권역과 상권 자료 연결을 확인해야 합니다.</span>}
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

      {content.footfall && <p className="recommend-note">
        유동인구 기준: {content.footfall.period}, 수집한 {content.footfall.markets.length}개 상권 내 비중입니다.
        안산 전체 비중·중복을 제거한 실인원·실시간 혼잡도가 아닙니다.{' '}
        <a href={content.footfall.source.url} target="_blank" rel="noreferrer">소상공인365 출처</a>
        {' '}· 자료 조회일 {content.footfall.source.checkedAt}
      </p>}

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

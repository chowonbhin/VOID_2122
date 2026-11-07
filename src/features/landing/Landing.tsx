// Golden-path step 1. Owner: Byeunghee02.
import { go } from '../../route';

export function Landing() {
  return (
    <section className="landing">
      <p className="eyebrow">안산 탐험</p>
      <h1>익숙한 동네 밖, 아직 덜 가본 안산을 지금 조건에 맞춰 추천해요</h1>
      <p className="lead">
        출발지와 시간, 관심 활동을 고르면 그 시각에 운영 중인 장소를 기준으로 권역을 계산해 추천합니다. 다녀온 곳을 기록하면 익숙함(Lv)이 오르고, 추천이
        새로운 곳 쪽으로 다시 계산됩니다.
      </p>
      <button className="primary" onClick={() => go({ name: 'setup' })}>
        탐험 시작
      </button>
    </section>
  );
}

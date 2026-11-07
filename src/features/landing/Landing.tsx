// Golden-path step 1. Owner: Byeunghee02.
import { go } from '../../route';

export function Landing() {
  return (
    <section className="landing">
      <p className="eyebrow">ANSAN · LITTLE TRAVEL JOURNAL</p>
      <h1><span>한 걸음, 한 장면.</span><span>안산이 내 이야기가 돼요.</span></h1>
      <p className="landing-sub">익숙한 동네 밖, 아직 덜 가본 안산을 지금 조건에 맞춰 추천해요.</p>
      <p className="lead">
        출발지와 시간, 관심 활동을 고르면 그 시각에 운영 중인 장소를 기준으로 행정동을 계산해 추천합니다. 다녀온 곳을 기록하면 익숙함(Lv)이 오르고, 추천이
        새로운 곳 쪽으로 다시 계산됩니다.
      </p>
      <ul className="landing-stamps" aria-label="이렇게 쓰여요">
        <li>동네 고르기</li><li>장소 둘러보기</li><li>발자국 남기기</li>
      </ul>
      <button className="primary" onClick={() => go({ name: 'setup' })}>
        탐험 시작
      </button>
    </section>
  );
}

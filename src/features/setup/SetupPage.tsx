// Golden-path step 2 (조건 입력). Owner: chowonbhin. PLACEHOLDER: replace with the real form.
import { go } from '../../route';

export function SetupPage() {
  return (
    <section>
      <h1>탐험 조건</h1>
      <p className="placeholder">준비 중 · 지역별 익숙함, 관심 활동, 출발지, 날짜·시각, 최대 거리 입력 (owner: chowonbhin)</p>
      <button className="primary" onClick={() => go({ name: 'recommend' })}>
        추천 받기
      </button>
    </section>
  );
}

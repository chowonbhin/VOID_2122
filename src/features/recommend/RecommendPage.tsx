// Golden-path step 2 (추천 카드) and the screen step 5 returns to. Owner: chowonbhin. PLACEHOLDER: not scored yet.
import { content } from '../../data/content';
import { go } from '../../route';

export function RecommendPage() {
  return (
    <section>
      <h1>추천 권역</h1>
      <p className="placeholder">준비 중 · 점수 계산 전, 데이터 순서 그대로 표시 (owner: chowonbhin)</p>
      <ul className="cards">
        {content.regions.map((r) => (
          <li key={r.id}>
            <button className="card" onClick={() => go({ name: 'region', regionId: r.id })}>
              <strong>{r.name}</strong>
              <span>{r.description}</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => go({ name: 'setup' })}>조건 변경</button>
    </section>
  );
}

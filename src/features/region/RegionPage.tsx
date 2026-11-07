// Golden-path step 3 (지역 상세·행사·지도). Owner: iwtkmn0219. PLACEHOLDER: list only, no status/map/events yet.
import { placesOfRegion, regionById } from '../../data/content';
import { go } from '../../route';
import { VisitPanel } from '../visits/VisitPanel';

export function RegionPage({ regionId }: { regionId: string }) {
  const region = regionById(regionId);
  if (!region) {
    return (
      <section>
        <h1>권역을 찾을 수 없어요</h1>
        <button onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
      </section>
    );
  }
  return (
    <section>
      <h1>{region.name}</h1>
      <p>{region.description}</p>
      <p className="placeholder">준비 중 · 운영 상태, 출처, 행사 카드, 지도 (owner: iwtkmn0219)</p>
      <ul className="places">
        {placesOfRegion(region.id).map((p) => (
          <li key={p.id} className="place">
            <strong>{p.name}</strong>
            <VisitPanel placeId={p.id} />
          </li>
        ))}
      </ul>
      <button onClick={() => go({ name: 'recommend' })}>추천으로 돌아가기</button>
    </section>
  );
}

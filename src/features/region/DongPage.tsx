import { content } from '../../data/content';
import { go } from '../../route';
import { dongByCode } from '../map/ansanGeo';
import { RegionPage } from './RegionPage';

export function DongPage({ code }: { code: string }) {
  const dong = dongByCode(code);
  const region = content.regions.find(item => item.adminCode === dong?.code);
  return region ? <RegionPage regionId={region.id} /> : <section className="region-detail">
    <h1>동네를 찾을 수 없어요</h1>
    <button onClick={() => go({ name: 'recommend' })}>지도로 돌아가기</button>
  </section>;
}

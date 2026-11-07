// 동네 screen for an Ansan 행정동 without its own exploration data yet: real outline, memories,
// and the nearest exploration areas as recommendations.
import { useState } from 'react';
import { useAppState } from '../../AppState';
import { content } from '../../data/content';
import { memoriesInDong } from '../../data/sampleMemories';
import { distanceKm } from '../../domain/score';
import { go } from '../../route';
import { centreLatLng, dongByCode, dongsOfRegion } from '../map/ansanGeo';
import { DongMap, type MapMarker } from '../map/DongMap';
import { Memories } from './Memories';
import { RegionPage } from './RegionPage';
import './region.css';

export function DongPage({ code }: { code: string }) {
  return <DongDetail key={code} code={code} />;
}

function DongDetail({ code }: { code: string }) {
  const { state } = useAppState();
  const [memoryId, setMemoryId] = useState<string>();
  const dong = dongByCode(code);
  if (!dong) return <section className="region-detail">
    <h1>동네를 찾을 수 없어요</h1>
    <button onClick={() => go({ name: 'recommend' })}>지도로 돌아가기</button>
  </section>;
  // The main map links exploration-area 동네 straight to their region screen; this covers old links.
  const region = content.regions.find((item) => item.adminCode === dong.code);
  if (region) return <RegionPage regionId={region.id} />;
  const centre = centreLatLng(dong);
  const memories = memoriesInDong(code);
  const isHome = state.profile.homeDongCode === code;
  const markers: MapMarker[] = [
    ...(isHome ? [{ id: 'home', kind: 'home' as const, ...centre, label: `내 동네 · ${dong.name}` }] : []),
    ...memories.map((memory) => ({ id: memory.id, kind: 'memory' as const, ...memory.location, label: `${memory.title} 추억 보기`, pressed: memory.id === memoryId })),
  ];
  const nearby = content.regions
    .filter((item) => dongsOfRegion(item).length)
    .map((item) => ({ region: item, km: distanceKm(centre, centreLatLng(dongsOfRegion(item)[0])) }))
    .sort((a, b) => a.km - b.km);

  return <section className="region-detail">
    <button className="region-back" onClick={() => go({ name: 'recommend' })}>지도로 돌아가기</button>
    <p className="eyebrow">동네 둘러보기{isHome ? ' · 내 동네' : ''}</p>
    <h1>{dong.name}</h1>
    <p className="region-lead">{memories.length ? `이 동네에 남긴 추억 ${memories.length}개를 다시 꺼내 보세요.` : '아직 이 동네의 이야기가 비어 있어요. 첫 발걸음을 남겨보세요.'}</p>
    <div className="region-design-layout">
      <DongMap target={[dong]} markers={markers} onSelect={(marker) => setMemoryId(marker.id)} />
      <p className="region-note">실제 좌표 기반 · 2026-10-01 행정동 경계 · 하트: 기록한 추억 · 점: 실제 위치</p>
      <Memories items={memories.map((memory) => ({ id: memory.id, title: memory.title, dates: [memory.date], memo: memory.memo, sample: true }))}
        selectedId={memoryId} onSelect={setMemoryId} />
      <section className="region-recommend" aria-labelledby="dong-recommend-title">
        <p className="region-recommend-kicker">동네 추천</p>
        <h2 className="region-list-heading" id="dong-recommend-title">가까운 탐험 동네</h2>
        <p className="region-note">{dong.name}의 탐험 장소 데이터는 준비 중이에요. 대신 가까운 탐험권역을 둘러보세요.</p>
        <ul className="cards">
          {nearby.map(({ region: item, km }) => <li key={item.id}>
            <button className="card region-nearby" onClick={() => go({ name: 'region', regionId: item.id })}>
              <strong>{item.name}</strong>
              <span>{item.features.join(' · ')}</span>
              <span className="region-note">{dong.name} 중심에서 직선거리 {km.toFixed(1)} km</span>
              <span className="region-nearby-link">이 동네 알아보기 →</span>
            </button>
          </li>)}
        </ul>
      </section>
    </div>
  </section>;
}

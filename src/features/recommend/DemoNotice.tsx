import { useState } from 'react';
import { useAppState } from '../../AppState';
import { baseContent, demoEnabled } from '../../data/content';
import { DEMO_MODE_KEY, demoSearch } from '../../data/demoPlaces';
import { go } from '../../route';

export function DemoNotice() {
  const { state, update } = useAppState();
  const [error, setError] = useState('');
  function toggle() {
    try {
      localStorage.setItem(DEMO_MODE_KEY, demoEnabled ? 'off' : 'on');
      window.location.reload();
    } catch { setError('시연 설정을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); }
  }
  function applyPreset() {
    const saved = update(previous => ({ ...previous, search: demoSearch(baseContent.regions[0].start, state.search?.when) }));
    if (!saved) { setError('시연 조건을 저장하지 못했습니다. 다시 시도해 주세요.'); return; }
    go({ name: 'recommend' });
  }
  return <aside className="demo-notice" aria-label="시연 데이터 설정">
    <strong>{demoEnabled ? '25개 동 · 상위 20개 추천 시연 중' : '추가 시연 장소 사용 안 함'}</strong>
    <p>{demoEnabled
      ? '동마다 가상 후보 25곳 · 실제 방문 대상이 아닙니다.'
      : '기존 조사 자료와 이전 시연 장소만 표시합니다. 미확인 정보는 점수에서 제외합니다.'}</p>
    {demoEnabled && <details><summary>시연 데이터와 조건 안내</summary>
      <p>장소·위치·운영·인지도는 시연값입니다. 전체 활동에서 상위 20곳을 합산하고 방문 후 다시 선정합니다.</p>
      <p>거리·관심 활동을 좁히면 일부 동이나 장소가 제외될 수 있어요. 조건 적용 버튼은 전체 활동·100 km로 바꾸며 방문 기록과 익숙함은 유지합니다.</p>
    </details>}
    <div className="demo-actions">
      {demoEnabled && <button onClick={applyPreset}>25개 동 시연 조건 적용</button>}
      <button onClick={toggle}>{demoEnabled ? '추가 시연 장소 끄기' : '추가 시연 장소 켜기'}</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </aside>;
}

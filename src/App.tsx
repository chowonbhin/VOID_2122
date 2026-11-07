import { useAppState } from './AppState';
import { useRoute } from './route';
import { Onboarding } from './features/onboarding/Onboarding';
import { SetupPage } from './features/setup/SetupPage';
import { RecommendPage } from './features/recommend/RecommendPage';
import { RegionPage } from './features/region/RegionPage';
import { DongPage } from './features/region/DongPage';

export function App() {
  const route = useRoute();
  const { state } = useAppState();
  // First run only: nothing saved yet. Everyone else opens straight onto the main map.
  const onboarding = route.name === 'landing' && !state.profile.onboarding && !state.search && state.visits.length === 0;
  const main = route.name === 'landing' && !onboarding;
  const discovering = main || route.name === 'recommend' || route.name === 'region' || route.name === 'dong';
  const showTabs = !onboarding;
  return (
    <div className={`app${showTabs ? ' has-tabbar' : ''}`}>
      <header className="appbar">
        <div className="appbar-inner">
          <a className="appbar-brand" href="#/">안산에 스며들다</a>
          <a className="appbar-link" href="#/setup">나의 동네 수첩</a>
        </div>
      </header>
      <main className={`page${discovering ? ' page-map' : ''}`}>
        {onboarding && <Onboarding />}
        {route.name === 'setup' && <SetupPage />}
        {(main || route.name === 'recommend') && <RecommendPage />}
        {route.name === 'region' && <RegionPage regionId={route.regionId} />}
        {route.name === 'dong' && <DongPage code={route.code} />}
      </main>
      <footer className="footer">실제 권역과 2026년 8월 상권 유동인구 자료를 사용합니다. 장소·행사·운영시간·인지도는 시연용 가상 데이터입니다. 역 위치: © OpenStreetMap contributors (ODbL).</footer>
      {showTabs && <nav className="tabbar" aria-label="주요 화면">
        <div className="tabbar-inner">
          <a href="#/recommend" aria-current={discovering ? 'page' : undefined}>동네 발견</a>
          <a href="#/setup" aria-current={route.name === 'setup' ? 'page' : undefined}>내 동네 설정</a>
        </div>
      </nav>}
    </div>
  );
}

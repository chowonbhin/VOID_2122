import { useRoute } from './route';
import { Landing } from './features/landing/Landing';
import { SetupPage } from './features/setup/SetupPage';
import { RecommendPage } from './features/recommend/RecommendPage';
import { RegionPage } from './features/region/RegionPage';
import { DongPage } from './features/region/DongPage';

export function App() {
  const route = useRoute();
  const discovering = route.name === 'recommend' || route.name === 'region' || route.name === 'dong';
  const showTabs = route.name !== 'landing';
  return (
    <div className={`app${showTabs ? ' has-tabbar' : ''}`}>
      <header className="appbar">
        <div className="appbar-inner">
          <a className="appbar-brand" href="#/">안산에 스며들다</a>
          <a className="appbar-link" href="#/setup">나의 동네 수첩</a>
        </div>
      </header>
      <main className={`page${discovering ? ' page-map' : ''}`}>
        {route.name === 'landing' && <Landing />}
        {route.name === 'setup' && <SetupPage />}
        {route.name === 'recommend' && <RecommendPage />}
        {route.name === 'region' && <RegionPage regionId={route.regionId} />}
        {route.name === 'dong' && <DongPage code={route.code} />}
      </main>
      <footer className="footer">25개 행정동 · 현재 점수 상위 20개 장소 합산. 실제 장소 인지도는 출처가 있는 방문·리뷰 수로 계산합니다. 기본 가치와 시연 장소 인지도는 가상값입니다. 유동인구는 2026년 8월 수집 상권 자료입니다. 기존 역 시작점: © OpenStreetMap contributors (ODbL).</footer>
      {showTabs && <nav className="tabbar" aria-label="주요 화면">
        <div className="tabbar-inner">
          <a href="#/recommend" aria-current={discovering ? 'page' : undefined}>동네 발견</a>
          <a href="#/setup" aria-current={route.name === 'setup' ? 'page' : undefined}>내 동네 설정</a>
        </div>
      </nav>}
    </div>
  );
}

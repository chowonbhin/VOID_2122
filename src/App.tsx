import { useRoute } from './route';
import { Landing } from './features/landing/Landing';
import { SetupPage } from './features/setup/SetupPage';
import { RecommendPage } from './features/recommend/RecommendPage';
import { RegionPage } from './features/region/RegionPage';

export function App() {
  const route = useRoute();
  return (
    <div className="app">
      <main className={`page${route.name === 'recommend' || route.name === 'region' ? ' page-map' : ''}`}>
        {route.name === 'landing' && <Landing />}
        {route.name === 'setup' && <SetupPage />}
        {route.name === 'recommend' && <RecommendPage />}
        {route.name === 'region' && <RegionPage regionId={route.regionId} />}
      </main>
      <footer className="footer">실제 권역과 2026년 8월 상권 유동인구 자료를 사용합니다. 장소·행사·운영시간·인지도는 시연용 가상 데이터입니다. 역 위치: © OpenStreetMap contributors (ODbL).</footer>
    </div>
  );
}

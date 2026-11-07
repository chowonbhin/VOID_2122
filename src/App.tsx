import { useRoute } from './route';
import { Landing } from './features/landing/Landing';
import { SetupPage } from './features/setup/SetupPage';
import { RecommendPage } from './features/recommend/RecommendPage';
import { RegionPage } from './features/region/RegionPage';

export function App() {
  const route = useRoute();
  return (
    <div className="app">
      <main className="page">
        {route.name === 'landing' && <Landing />}
        {route.name === 'setup' && <SetupPage />}
        {route.name === 'recommend' && <RecommendPage />}
        {route.name === 'region' && <RegionPage regionId={route.regionId} />}
      </main>
      <footer className="footer">개발용 가상 데이터로 동작하는 시연판입니다. 인지도 값은 시연용 가상값입니다.</footer>
    </div>
  );
}

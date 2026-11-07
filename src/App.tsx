import { useAppState } from './AppState';
import { useRoute, type Route } from './route';
import { Onboarding } from './features/onboarding/Onboarding';
import { RecommendPage } from './features/recommend/RecommendPage';
import { RegionPage } from './features/region/RegionPage';
import { DongPage } from './features/region/DongPage';
import { DataNotice } from './features/recommend/DemoNotice';
import { Splash } from './features/splash/Splash';
import { AppMenu } from './features/navigation/AppMenu';
import { NotebookPage } from './features/notebook/NotebookPage';

export function App() {
  const requestedRoute = useRoute();
  const { state } = useAppState();
  // Old search/visit records are not proof of onboarding completion. Gate every
  // entry route without changing or deleting those records.
  const route: Route = state.profile.onboarding?.completedAt ? requestedRoute : { name: 'onboarding' };
  const onboarding = route.name === 'onboarding';
  const main = route.name === 'landing' && !onboarding;
  const discovering = main || route.name === 'recommend' || route.name === 'region' || route.name === 'dong';
  return (
    <div className="app">
      <Splash />
      <header className="appbar">
        <div className="appbar-inner">
          <a className="appbar-brand" href="#/">안산에 스며들다</a>
          <AppMenu />
        </div>
      </header>
      <main className={`page${discovering ? ' page-map' : ''}${route.name === 'notebook' ? ' page-notebook' : ''}`}>
        {discovering && <DataNotice />}
        {onboarding && <Onboarding />}
        {(main || route.name === 'recommend') && <RecommendPage />}
        {route.name === 'region' && <RegionPage regionId={route.regionId} />}
        {route.name === 'dong' && <DongPage code={route.code} />}
        {route.name === 'notebook' && <NotebookPage />}
      </main>
      {!onboarding && route.name !== 'notebook' && <footer className="footer"><details><summary>지도 출처</summary>
        <p>경계: SGIS 공공누리 제1유형 · <a href="https://github.com/vuski/admdongkor" target="_blank" rel="noreferrer">vuski/admdongkor</a> 가공 · 2026-10-01 · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a><br />
        역 시작점: © OpenStreetMap contributors (ODbL)</p>
      </details></footer>}
    </div>
  );
}

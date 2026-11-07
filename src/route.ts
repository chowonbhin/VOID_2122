// Hash routes: #/ landing, #/setup, #/recommend, #/region/<regionId>. Owner: Byeunghee02.
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'setup' }
  | { name: 'recommend' }
  | { name: 'region'; regionId: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'setup') return { name: 'setup' };
  if (parts[0] === 'recommend') return { name: 'recommend' };
  if (parts[0] === 'region' && parts[1]) return { name: 'region', regionId: decodeURIComponent(parts[1]) };
  return { name: 'landing' };
}

export function go(route: Route): void {
  if (route.name === 'landing') window.location.hash = '#/';
  else if (route.name === 'region') window.location.hash = '#/region/' + encodeURIComponent(route.regionId);
  else window.location.hash = '#/' + route.name;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

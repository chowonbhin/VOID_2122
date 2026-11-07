// Hash routes: #/ landing, #/onboarding (#/setup kept as an alias), #/recommend, #/region/<regionId>, #/dong/<administrative code>. Owner: Byeunghee02.
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'onboarding' }
  | { name: 'recommend' }
  | { name: 'notebook' }
  | { name: 'region'; regionId: string }
  | { name: 'dong'; code: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'onboarding' || parts[0] === 'setup') return { name: 'onboarding' };
  if (parts[0] === 'recommend') return { name: 'recommend' };
  if (parts[0] === 'notebook') return { name: 'notebook' };
  if (parts[0] === 'region' && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    const legacy: Record<string, string> = { 'region-a': 'dong-4127353200', 'region-b': 'dong-4127354500' };
    return { name: 'region', regionId: legacy[id] ?? id };
  }
  if (parts[0] === 'dong' && parts[1]) return { name: 'dong', code: decodeURIComponent(parts[1]) };
  return { name: 'landing' };
}

export function go(route: Route): void {
  if (route.name === 'landing') window.location.hash = '#/';
  else if (route.name === 'region') window.location.hash = '#/region/' + encodeURIComponent(route.regionId);
  else if (route.name === 'dong') window.location.hash = '#/dong/' + encodeURIComponent(route.code);
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

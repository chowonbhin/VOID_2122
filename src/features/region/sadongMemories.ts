import type { Place } from '../../domain/types';
import { isRecommendationCandidate } from '../../domain/placeEligibility';

export const SADONG_ID = 'dong-4127152500';
export const SADONG_MEMORY_KEY = 'ansan-explore/sadong-memory-preview/v1';

export interface SadongMemoryPreview {
  enabled: boolean;
  placeIds: string[];
}

/** Display examples only. Never creates Visit records or changes recommendation inputs. */
export function pickSadongMemoryPlaces(places: Place[], previousIds: string[] = [], random = Math.random): Place[] {
  const available = places.filter(place => place.regionId === SADONG_ID && !place.isVirtual
    && place.location && isRecommendationCandidate(place));
  const different = available.filter(place => !previousIds.includes(place.id));
  const pool = [...(different.length >= 2 ? different : available)];
  const picked: Place[] = [];
  while (pool.length && picked.length < 2) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return picked;
}

export function loadSadongMemoryPreview(places: Place[]): { value: SadongMemoryPreview; error: string } {
  const fresh = () => ({ enabled: true, placeIds: pickSadongMemoryPlaces(places).map(place => place.id) });
  let value: SadongMemoryPreview;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SADONG_MEMORY_KEY) ?? 'null');
    const validIds = new Set(places.filter(place => place.regionId === SADONG_ID && !place.isVirtual
      && place.location && isRecommendationCandidate(place)).map(place => place.id));
    if (raw && typeof raw === 'object' && 'enabled' in raw && typeof raw.enabled === 'boolean'
      && 'placeIds' in raw && Array.isArray(raw.placeIds) && raw.placeIds.length >= 1 && raw.placeIds.length <= 2
      && new Set(raw.placeIds).size === raw.placeIds.length && raw.placeIds.every(id => typeof id === 'string' && validIds.has(id))) {
      return { value: raw as SadongMemoryPreview, error: '' };
    }
    value = fresh();
    localStorage.setItem(SADONG_MEMORY_KEY, JSON.stringify(value));
    return { value, error: '' };
  } catch {
    return { value: fresh(), error: '추억 예시 설정을 저장하지 못했어요. 새로고침하면 예시가 달라질 수 있어요.' };
  }
}

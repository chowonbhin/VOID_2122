import type { Place } from '../../domain/types';
import { isRecommendationCandidate } from '../../domain/placeEligibility';
import { MEMORY_PHOTOS } from '../../data/memoryPhotos';

export const SADONG_ID = 'dong-4127152500';
export const SADONG_MEMORY_KEY = 'ansan-explore/sadong-memory-preview/v2';
const LEGACY_KEY = 'ansan-explore/sadong-memory-preview/v1';
export interface SadongMemoryPreview { enabled: boolean; placeIds: string[] }

/** Fixed storefronts shared by the map and gallery. Never adds Visit records. */
export function fixedSadongMemoryPlaces(places: Place[]): Place[] {
  return MEMORY_PHOTOS.flatMap(photo => {
    const place = places.find(item => item.id === photo.placeId && item.regionId === SADONG_ID
      && !item.isVirtual && item.location && isRecommendationCandidate(item));
    return place ? [place] : [];
  });
}

export function loadSadongMemoryPreview(places: Place[]): { value: SadongMemoryPreview; error: string } {
  const placeIds = fixedSadongMemoryPlaces(places).map(place => place.id);
  try {
    // Retain hidden/visible preference; migrate old random IDs only.
    const raw: unknown = JSON.parse(localStorage.getItem(SADONG_MEMORY_KEY) ?? localStorage.getItem(LEGACY_KEY) ?? 'null');
    const enabled = raw && typeof raw === 'object' && 'enabled' in raw && typeof raw.enabled === 'boolean' ? raw.enabled : true;
    const value = { enabled, placeIds };
    const serialized = JSON.stringify(value);
    if (localStorage.getItem(SADONG_MEMORY_KEY) !== serialized) localStorage.setItem(SADONG_MEMORY_KEY, serialized);
    return { value, error: '' };
  } catch {
    return { value: { enabled: true, placeIds }, error: '추억 예시 표시 설정을 저장하지 못했어요. 새로고침하면 숨김 설정이 초기화될 수 있어요.' };
  }
}

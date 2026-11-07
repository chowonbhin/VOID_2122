// Images for the map's chosen-place pin: the user's latest notebook photo, else a known store photo.
import { useEffect, useState } from 'react';
import { MEMORY_PHOTOS } from '../../data/memoryPhotos';
import { PLACE_PHOTOS } from '../../data/placePhotos';
import { listPhotos } from '../notebook/photoStorage';

/** One IndexedDB read per page: latest personal thumbnail per place, as object URLs. */
export function usePlaceThumbnails(): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    listPhotos().then(photos => {
      if (!alive) return;
      const latest: Record<string, string> = {};
      for (const photo of [...photos].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        const url = URL.createObjectURL(photo.thumbnail);
        made.push(url);
        latest[photo.placeId] = url;
      }
      setUrls(latest);
    }).catch(() => { /* no storage: fall back to examples and empty slots */ });
    return () => { alive = false; made.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  return urls;
}

/** Image for a place: the user's latest photo, else the fixed storefront example. */
export const placeImage = (placeId: string, personalUrl?: string) => personalUrl
  ?? PLACE_PHOTOS.find(photo => photo.placeId === placeId)?.src
  ?? MEMORY_PHOTOS.find(photo => photo.placeId === placeId)?.src;

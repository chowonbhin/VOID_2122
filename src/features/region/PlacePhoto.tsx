// Photo space on each place card: the user's latest notebook photo, else a fixed example, else an empty slot.
// Tapping it shows the place on the map (the cards' only map control now that paging buttons are gone).
import { useEffect, useState } from 'react';
import { MEMORY_PHOTOS } from '../../data/memoryPhotos';
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
export const placeImage = (placeId: string, personalUrl?: string) => personalUrl ?? MEMORY_PHOTOS.find(photo => photo.placeId === placeId)?.src;

const SmallHeart = () => <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
  <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor" />
</svg>;

export function PlacePhoto({ placeId, name, personalUrl, pressed, memory = false, onSelect }: {
  placeId: string; name: string; personalUrl?: string; pressed: boolean; memory?: boolean; onSelect: () => void;
}) {
  const example = MEMORY_PHOTOS.find(photo => photo.placeId === placeId);
  const src = placeImage(placeId, personalUrl);
  return <button type="button" className={`place-photo${src ? '' : ' empty'}`} aria-label={`${name} 카드에서 선택`} aria-pressed={pressed}
    title="지도에서 위치 보기" onClick={onSelect}>
    {src ? <img src={src} alt={personalUrl ? `${name}에서 남긴 사진` : example!.alt} loading="lazy" />
      : <span className="place-photo-empty" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 7h3l1.6-2h6.8L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm8 2.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z" fill="currentColor" /></svg>
        사진
      </span>}
    {memory && <span className="photo-heart" aria-hidden="true"><SmallHeart /></span>}
  </button>;
}

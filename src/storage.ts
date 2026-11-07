// Browser storage for user state. Owner: Byeunghee02.
// Same browser and site only; no account or device sync.
import type { Profile, SearchContext, Visit } from './domain/types';

const KEY = 'ansan-explore/v1';

export interface UserState {
  profile: Profile;
  visits: Visit[];
  search: SearchContext | null;
}

export const emptyState = (): UserState => ({
  profile: { initialLevels: {}, interests: [], experiencedEventIds: [] },
  visits: [],
  search: null,
});

export function loadState(): UserState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<UserState>) };
  } catch {
    return emptyState();
  }
}

/** Returns false when the write failed, so the UI never shows a save as successful when it was not. */
export function saveState(state: UserState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

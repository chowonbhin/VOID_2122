// Browser storage for user state. Owner: Byeunghee02.
// Same browser and site only; no account or device sync.
import type { Profile, SearchContext, Visit } from './domain/types';

const KEY = 'ansan-explore/v1';

export interface UserState {
  profile: Profile;
  visits: Visit[];
  search: SearchContext | null;
  legacyInitialLevels?: Record<string, 0 | 1 | 2>;
  needsDongLevelReview?: boolean;
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
    return migrateState({ ...emptyState(), ...(JSON.parse(raw) as Partial<UserState>) });
  } catch {
    return emptyState();
  }
}

/** A/B covered several dongs. Preserve records, archive old levels; never broadcast them. */
export function migrateState(state: UserState): UserState {
  const initialLevels = { ...state.profile.initialLevels };
  const legacy = Object.fromEntries(Object.entries(initialLevels).filter(([id]) => id === 'region-a' || id === 'region-b'));
  if (!Object.keys(legacy).length) return state;
  delete initialLevels['region-a'];
  delete initialLevels['region-b'];
  return { ...state, profile: { ...state.profile, initialLevels },
    legacyInitialLevels: { ...state.legacyInitialLevels, ...legacy }, needsDongLevelReview: true };
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

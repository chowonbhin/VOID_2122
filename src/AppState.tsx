// User state shared by all screens, persisted to browser storage. Owner: Byeunghee02.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { loadState, saveState, type UserState } from './storage';

interface AppStateValue {
  state: UserState;
  /** Applies the change and persists it. Returns false if saving failed (state is not changed then). */
  update: (change: (prev: UserState) => UserState) => boolean;
}

const Ctx = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>(loadState);
  const update = useCallback((change: (prev: UserState) => UserState) => {
    const next = change(loadState());
    if (!saveState(next)) return false;
    setState(next);
    return true;
  }, []);
  return <Ctx.Provider value={{ state, update }}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside AppStateProvider');
  return v;
}

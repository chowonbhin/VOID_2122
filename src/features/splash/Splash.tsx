// Launch splash: the welcome copy, shown once per app session for 1.5 s. Tap to skip.
import { useEffect, useState } from 'react';
import './splash.css';

const SEEN = 'ansan-explore/splash-seen';
export const SPLASH_MS = 1500;

function seen(): boolean {
  try { return sessionStorage.getItem(SEEN) === '1'; } catch { return false; }
}

export function Splash() {
  const [visible, setVisible] = useState(() => !seen());
  useEffect(() => {
    if (!visible) return;
    try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode: show again next time */ }
    const timer = setTimeout(() => setVisible(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, [visible]);
  if (!visible) return null;
  return <div className="splash" role="status" aria-label="안산에 스며들다를 여는 중" onClick={() => setVisible(false)}>
    <div className="splash-body">
      <p className="splash-brand">안산에 스며들다</p>
      <p className="splash-eyebrow">동네 발견</p>
      <p className="splash-title">오늘은 어느 동네에<br />마음을 남겨볼까요?</p>
      <p className="splash-sub">나의 발자국 사이로, 새로운 발견 하나.</p>
      <div className="splash-progress" aria-hidden="true"><i style={{ animationDuration: `${SPLASH_MS}ms` }} /></div>
    </div>
  </div>;
}

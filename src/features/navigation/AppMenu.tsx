import { useEffect, useRef, useState } from 'react';
import './menu.css';

/** Disclosure navigation with native links, Tab, outside press and Escape. */
export function AppMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('hashchange', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('hashchange', close);
    };
  }, [open]);
  return <div className="app-menu" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} className="app-menu-trigger" aria-label="메뉴" aria-expanded={open}
      aria-controls="app-menu-panel" onClick={() => setOpen(value => !value)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      <span>메뉴</span>
    </button>
    <nav id="app-menu-panel" className="app-menu-panel" aria-label="내 탐험 메뉴" hidden={!open}>
      <a href="#/notebook" onClick={() => setOpen(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM9 3v18M3 7h4M3 12h4M3 17h4M12 8h4M12 12h4" /></svg>
        <span><strong>나의 동네수첩</strong></span><span aria-hidden="true">↗</span>
      </a>
      <a href="#/onboarding" onClick={() => setOpen(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6M15 14v6" /></svg>
        <span><strong>다시 설정하기</strong></span><span aria-hidden="true">↗</span>
      </a>
    </nav>
  </div>;
}

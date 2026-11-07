import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
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
      <Icon name="menu" />
      <span>메뉴</span>
    </button>
    <nav id="app-menu-panel" className="app-menu-panel" aria-label="내 탐험 메뉴" hidden={!open}>
      <a href="#/notebook" onClick={() => setOpen(false)}>
        <Icon name="notebook" />
        <span><strong>나의 동네수첩</strong></span><Icon name="arrowUpRight" size={16} />
      </a>
      <a href="#/onboarding" onClick={() => setOpen(false)}>
        <Icon name="settings" />
        <span><strong>다시 설정하기</strong></span><Icon name="arrowUpRight" size={16} />
      </a>
    </nav>
  </div>;
}

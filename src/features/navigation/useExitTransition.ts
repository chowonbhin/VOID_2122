import { useEffect, useRef, useState } from 'react';

/** Keep the current screen mounted for its exit; navigation elsewhere cancels it. */
export function useExitTransition() {
  const running = useRef<Animation | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const cancel = () => { running.current?.cancel(); running.current = null; setPending(false); };
    window.addEventListener('hashchange', cancel);
    return () => { window.removeEventListener('hashchange', cancel); running.current?.cancel(); };
  }, []);
  const exit = (element: Element | null, frames: Keyframe[], complete: () => void | boolean, duration: number) => {
    if (running.current) return;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !element.animate) {
      complete();
      return;
    }
    setPending(true);
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.32,0,.18,1)', fill: 'forwards' });
    running.current = animation;
    animation.finished.then(() => {
      if (running.current !== animation) return;
      running.current = null;
      // A save failure keeps the current screen usable instead of leaving it faded out.
      if (complete() === false) { animation.cancel(); setPending(false); }
    }).catch(() => { /* Canceled by another navigation or unmount. */ });
  };
  return { exit, pending };
}

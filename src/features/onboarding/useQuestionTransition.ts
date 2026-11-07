import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Step = 1 | 2 | 3 | 4;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Next question enters from the right; previous enters from the left. Answers stay in the parent. */
export function useQuestionTransition() {
  const [step, setStep] = useState<Step>(1);
  const [pending, setPending] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const direction = useRef(1);
  const entering = useRef(false);
  const busy = useRef(false);
  const focusAfterEnter = useRef(false);

  useEffect(() => {
    const cancel = () => {
      animation.current?.cancel();
      animation.current = null;
      entering.current = false;
      busy.current = false;
      focusAfterEnter.current = false;
      setPending(false);
    };
    window.addEventListener('hashchange', cancel);
    return () => {
      window.removeEventListener('hashchange', cancel);
      animation.current?.cancel();
    };
  }, []);

  useLayoutEffect(() => {
    if (!entering.current || !panel.current) return;
    entering.current = false;
    const settle = () => {
      animation.current = null;
      busy.current = false;
      focusAfterEnter.current = true;
      setPending(false);
    };
    if (reducedMotion() || !panel.current.animate) { settle(); return; }
    const incoming = panel.current.animate([
      { opacity: 0, transform: `translateX(${direction.current * 56}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 440, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
    animation.current = incoming;
    incoming.finished.then(() => {
      if (animation.current !== incoming) return;
      incoming.cancel();
      settle();
    }).catch(() => { /* Navigation or unmount canceled the question change. */ });
  }, [step]);

  // Focus only after React removes inert from the new question.
  useLayoutEffect(() => {
    if (!pending && focusAfterEnter.current) {
      focusAfterEnter.current = false;
      panel.current?.querySelector('h1')?.focus({ preventScroll: true });
    }
  }, [pending, step]);

  const changeStep = (next: Step) => {
    if (busy.current || next === step) return;
    direction.current = next > step ? 1 : -1;
    entering.current = true;
    if (!panel.current || reducedMotion() || !panel.current.animate) { setStep(next); return; }
    busy.current = true;
    setPending(true);
    entering.current = false;
    const outgoing = panel.current.animate([
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: `translateX(${-direction.current * 36}px)` },
    ], { duration: 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    animation.current = outgoing;
    outgoing.finished.then(() => {
      if (animation.current !== outgoing) return;
      entering.current = true;
      setStep(next);
    }).catch(() => { /* The old question stays visible if navigation cancels. */ });
  };
  return { step, changeStep, pending, panel };
}

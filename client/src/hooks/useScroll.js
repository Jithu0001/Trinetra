import { useEffect, useRef, useState } from 'react';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** Runs fn(scrollY, viewportHeight) on scroll/resize, throttled to animation frames. */
export function useRafScroll(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let raf = 0;
    const run = () => { raf = 0; ref.current(window.scrollY, window.innerHeight); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/** True once the element has entered the viewport. */
export function useInView(options = { threshold: 0.2 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, seen];
}

/** Animates a number from its previous value to target. */
export function useCountUp(target, active = true, duration = 1100) {
  const [val, setVal] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!active || target == null || Number.isNaN(Number(target))) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setVal(target); from.current = target; return undefined; }
    const start = performance.now(), a = from.current, b = Number(target);
    let raf;
    const step = (t) => {
      const p = clamp((t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = a + (b - a) * eased;
      setVal(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return Math.round(val);
}

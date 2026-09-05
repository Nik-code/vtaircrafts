"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Counts up from 0 to `value` once, the first time the element scrolls into
 * view. The initial (and no-JS) render is always the final formatted value,
 * so a background tab or a client that never runs the effect still reads
 * correctly. Progress is computed from elapsed time rather than frame count,
 * so a single rAF callback after a throttled/paused background tab lands on
 * (or past) the exact value instead of stalling partway through.
 */
export function CountUp({
  value,
  duration = 700,
  className = "",
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [n, setN] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Re-mounted after the run (Fast Refresh keeps refs and state): settle, never re-animate.
    if (started.current) {
      setN(value);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const clamped = Math.min(900, Math.max(600, duration));
    let raf = 0;
    let timeout = 0;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();

        const start = performance.now();
        setN(0);

        const tick = (t: number) => {
          const elapsed = t - start;
          const p = Math.min(1, Math.max(0, elapsed / clamped)); // rAF timestamps can precede performance.now()
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(value * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        // Belt-and-braces: if rAF stays paused (backgrounded tab) long past
        // the animation window, force the exact final value regardless.
        timeout = window.setTimeout(() => setN(value), clamped + 200);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format ? format(n) : n.toLocaleString("en-IN")}
    </span>
  );
}

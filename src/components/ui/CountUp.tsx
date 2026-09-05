"use client";
import { useEffect, useRef, useState } from "react";

/** Counts from 0 to value once when first visible. Respects reduced motion. */
export function CountUp({ value, duration = 700, className = "", format }: { value: number; duration?: number; className?: string; format?: (n: number) => string }) {
  const [n, setN] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || done.current) return;
      done.current = true;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(value * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      setN(0);
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);
  return <span ref={ref} className={className}>{format ? format(n) : n.toLocaleString("en-IN")}</span>;
}

"use client";
import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** The theme lives on <html data-theme>; a MutationObserver keeps React in step with it. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Day / night sheet switch. The choice persists in localStorage; dark is the default. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribe, current, () => "dark");

  const toggle = () => {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("vt-theme", next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  };

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to the day sheet" : "Switch to the night sheet"}
      aria-pressed={dark}
      title={dark ? "Day sheet" : "Night sheet"}
      className={`group flex h-7 items-center gap-2 border border-rule-2 bg-paper px-2 transition-colors duration-150 hover:border-ink ${className}`}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden className="text-ink-3 transition-colors duration-150 group-hover:text-ink">
        {dark ? (
          /* sun: disc with eight ticks */
          <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" />
          </g>
        ) : (
          /* moon: crescent */
          <path d="M10.5 1.8a6.2 6.2 0 1 0 3.7 9.9A6.2 6.2 0 0 1 10.5 1.8z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        )}
      </svg>
      <span className="label label-dim">{dark ? "Day" : "Night"}</span>
    </button>
  );
}

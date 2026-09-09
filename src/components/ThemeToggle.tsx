"use client";
import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Dark / light switch. The choice persists in localStorage; dark is the default. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribe, current, () => "dark");
  const dark = theme === "dark";

  const toggle = () => {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("vt-theme", next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      title={dark ? "Light mode" : "Dark mode"}
      className={`grid h-10 w-10 place-items-center rounded-full text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg ${className}`}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        {dark ? (
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
          </g>
        ) : (
          <path d="M10.5 1.8a6.2 6.2 0 1 0 3.7 9.9A6.2 6.2 0 0 1 10.5 1.8z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

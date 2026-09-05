"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Global search trigger. The fleet/search agent replaces this with a full
 * command palette (Cmd/Ctrl+K) over /data/latest/index.json. Until then it
 * routes to the fleet explorer or straight to a registration page.
 */
export function SearchPalette() {
  const router = useRouter();
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        if (!t) return;
        if (/^VT-?[A-Z]{3}$/i.test(t)) router.push(`/aircraft/${t.toUpperCase().replace(/^VT-?/, "VT-")}`);
        else router.push(`/fleet?q=${encodeURIComponent(t)}`);
        setQ("");
      }}
      className="flex items-center gap-2 border border-rule-2 bg-paper px-2 focus-within:border-ink"
    >
      <input
        id="global-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search VT-, type, operator"
        className="mono w-40 bg-transparent py-1 text-xs placeholder:text-ink-3 focus:outline-none sm:w-56"
        autoComplete="off"
        spellCheck={false}
      />
      <kbd className="label hidden text-[9px] sm:inline">⌘K</kbd>
    </form>
  );
}

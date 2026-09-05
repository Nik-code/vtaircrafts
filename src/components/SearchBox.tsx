"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ placeholder = "Search a tail number, operator, type or hex…" }: { placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        if (/^VT-?[A-Z]{3}$/i.test(t)) {
          const reg = t.toUpperCase().replace(/^VT-?/, "VT-");
          router.push(`/aircraft/${reg}`);
          return;
        }
        router.push(`/fleet?q=${encodeURIComponent(t)}`);
      }}
      className="frame flex items-center gap-2 border border-line-strong bg-bg-elev px-3 focus-within:border-accent"
    >
      <span className="mono text-accent">›</span>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="mono w-full bg-transparent py-3 text-sm text-fg placeholder:text-fg-dim focus:outline-none"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="label border border-line px-2 py-1 text-[10px] hover:border-accent hover:text-accent">
        Enter ↵
      </button>
    </form>
  );
}

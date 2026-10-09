"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KINGDOMS } from "./kingdom-data";
import { GRAIN } from "./parchment";

// Search the map: a small parchment panel above the right end of the navbar (clear of the compass stamp) (opened from its magnifier cell or the
// / key). Type a kingdom's name (or part of its title) and pick a result: the camera flies there (map-viewer.tsx).
// Arrow keys move through the results, Enter picks, Esc or a click elsewhere closes.
const EASE = "cubic-bezier(0.22, 0.8, 0.3, 1)";
const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function search(query: string) {
  const q = plain(query.trim());
  if (!q) return KINGDOMS.map((k) => ({ k, at: -1 }));
  return KINGDOMS.flatMap((k) => {
    const at = plain(k.name).indexOf(q);
    if (at >= 0) return [{ k, at, score: at === 0 ? 0 : 1 }];
    return plain(k.subtitle).includes(q) ? [{ k, at: -1, score: 2 }] : [];
  })
    .sort((a, b) => a.score - b.score || a.k.name.localeCompare(b.k.name))
    .map(({ k, at }) => ({ k, at }));
}

export default function MapSearch({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => search(query), [query]);
  const q = query.trim().length;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!panelRef.current?.contains(t) && !t.closest?.("[data-search-toggle]")) onClose();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open, onClose]);

  const pick = (id: string) => {
    onPick(id);
    setQuery("");
    setActive(0);
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Search the map"
      aria-hidden={!open}
      className="fixed bottom-[104px] right-3 z-20 w-[min(360px,calc(100vw-24px))] min-[800px]:bottom-[80px]"
      style={{
        color: "var(--ui-ink)",
        background: `${GRAIN}, var(--ui-paper)`,
        border: "1px solid color-mix(in srgb, var(--ui-ink) 25%, transparent)",
        boxShadow: "0 8px 24px rgba(40, 28, 16, 0.28)",
        opacity: open ? 1 : 0,
        transform: open ? "none" : "translateY(10px)",
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
        transition: `opacity 260ms ${EASE}, transform 360ms ${EASE}, visibility 0s linear ${open ? 0 : 260}ms, background-color 900ms ease`,
      }}
    >
      <label className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--ui-ink) 20%, transparent)" }}>
        <Magnifier />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search kingdoms…"
          aria-label="Search kingdoms"
          role="combobox"
          aria-expanded={open}
          aria-controls="map-search-results"
          aria-activedescendant={results[active] ? `map-search-${results[active].k.id}` : undefined}
          tabIndex={open ? 0 : -1}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const n = results.length;
              if (n) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) pick(results[active].k.id);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-cormorant)] text-[17px] font-semibold tracking-[0.04em] placeholder:font-medium placeholder:opacity-55 focus:outline-none"
        />
      </label>

      <ul id="map-search-results" role="listbox" aria-label="Kingdoms" className="max-h-[min(320px,45dvh)] overflow-y-auto py-1">
        {results.length === 0 && <li className="px-4 py-3 font-display text-[12px] opacity-70">No kingdom by that name</li>}
        {results.map(({ k, at }, i) => (
          <li
            key={k.id}
            id={`map-search-${k.id}`}
            role="option"
            aria-selected={i === active}
            onPointerEnter={() => setActive(i)}
            onClick={() => pick(k.id)}
            className="flex cursor-pointer flex-col gap-0.5 px-4 py-2"
            style={{ background: i === active ? "color-mix(in srgb, var(--ui-ink) 9%, transparent)" : undefined }}
          >
            <span className="font-display text-[14px] font-semibold uppercase leading-tight tracking-[0.07em]">
              {at >= 0 && q ? (
                <>
                  {k.name.slice(0, at)}
                  <span className="underline decoration-1 underline-offset-[3px]">{k.name.slice(at, at + q)}</span>
                  {k.name.slice(at + q)}
                </>
              ) : (
                k.name
              )}
            </span>
            <span className="font-[family-name:var(--font-fell)] text-[13px] italic leading-tight opacity-75">{k.subtitle}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Magnifier() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15 L20.5 20.5" />
    </svg>
  );
}

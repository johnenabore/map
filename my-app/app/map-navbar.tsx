"use client";

import { useEffect, useRef, useState } from "react";
import { KINGDOMS } from "./kingdom-data";
import type { SitePage } from "./page-drawer";
import { Magnifier } from "./magnifier";
import { GRAIN } from "./parchment";

const PX_PER_DEG = 3.67;
const TICK_EVERY = 7.5;
const SPAN = 315;
const EASE = "cubic-bezier(0.22, 0.8, 0.3, 1)";

const title = "font-display text-[14px] font-semibold uppercase leading-none tracking-[0.07em]";
const caption = "flex items-center gap-1.5 font-display text-[11px] leading-none opacity-80";
const rule = "color-mix(in srgb, var(--ui-ink) 22%, transparent)";

export default function MapNavbar({
  visible,
  lastBook,
  onContinue,
  night,
  onToggleTheme,
  onOpenPage,
  searchOpen,
  onSearch,
  muted,
  onToggleSound,
}: {
  muted: boolean;
  onToggleSound: () => void;
  onOpenPage: (page: SitePage) => void;
  searchOpen: boolean;
  onSearch: () => void;
  visible: boolean;
  lastBook: string | null;
  onContinue: () => void;
  night: boolean;
  onToggleTheme: () => void;
}) {
  const book = lastBook ? KINGDOMS.find((k) => k.id === lastBook) : null;
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return (
    <nav
      id="map-navbar"
      aria-label="Map"
      className="fixed inset-x-0 bottom-0 z-20 flex h-14 items-stretch sm:h-[68px]"
      style={{
        color: "var(--ui-ink)",
        background: `${GRAIN}, linear-gradient(180deg, color-mix(in srgb, var(--ui-paper) 92%, white) 0%, var(--ui-paper) 30%)`,
        backgroundColor: "var(--ui-paper)",
        borderTop: `1px solid ${rule}`,
        boxShadow: "0 -4px 14px rgba(40, 28, 16, 0.16)",
        transform: visible ? "none" : "translateY(110%)",
        opacity: visible ? 1 : 0,
        transition: `transform 600ms ${EASE}, opacity 600ms ${EASE}, background-color 900ms ease, color 900ms ease`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <button
        type="button"
        onClick={onContinue}
        disabled={!book}
        aria-disabled={!book}
        className="flex shrink-0 flex-col items-center justify-center gap-2 px-3 transition-opacity enabled:hover:opacity-70 disabled:cursor-default focus:outline-none focus-visible:underline sm:px-6"
      >
        <span className={title}>{narrow ? "Continue" : "Continue reading"}</span>
        <span className={caption}>
          <span className="h-[3px] w-[3px] rounded-full bg-current" aria-hidden="true" />
          {book ? book.name : "No book yet"}
        </span>
      </button>

      <Divider />

      <div className="relative min-w-0 flex-1">
        <Ruler narrow={narrow} />
        <CompassMenu narrow={narrow} hidden={!visible} onOpenPage={onOpenPage} />
      </div>

      <Divider />

      <button
        type="button"
        onClick={onToggleTheme}
        aria-pressed={night}
        aria-label={night ? "Switch to day" : "Switch to night"}
        className="hidden shrink-0 flex-col items-center justify-center gap-2 px-6 transition-opacity hover:opacity-70 focus:outline-none focus-visible:underline sm:flex sm:min-w-[170px]"
      >
        <span className={title}>Theme</span>
        <span className={caption}>
          <span className="h-[3px] w-[3px] rounded-full bg-current" aria-hidden="true" />
          {night ? "Night" : "Day"}
        </span>
      </button>
      <span className="hidden sm:contents">
        <Divider />
      </span>
      <button
        type="button"
        data-search-toggle
        onClick={onSearch}
        aria-label="Search the map"
        aria-expanded={searchOpen}
        className="flex w-12 shrink-0 items-center justify-center transition-opacity hover:opacity-70 focus:outline-none focus-visible:underline"
        style={{ background: searchOpen ? "color-mix(in srgb, var(--ui-ink) 8%, transparent)" : undefined }}
      >
        <Magnifier />
      </button>
      <Divider />
      <button
        type="button"
        onClick={onToggleTheme}
        aria-pressed={night}
        aria-label={night ? "Switch to day" : "Switch to night"}
        className="flex w-12 shrink-0 items-center justify-center transition-opacity hover:opacity-70 focus:outline-none focus-visible:underline"
      >
        <span className="relative h-5 w-5 overflow-hidden">
          <span
            className="absolute inset-0"
            style={{
              transform: night ? "translateY(120%) rotate(-90deg)" : "none",
              opacity: night ? 0 : 1,
              transition: `transform 700ms ${EASE}, opacity 500ms ease`,
            }}
          >
            <Sun />
          </span>
          <span
            className="absolute inset-0"
            style={{
              transform: night ? "none" : "translateY(120%) rotate(60deg)",
              opacity: night ? 1 : 0,
              transition: `transform 700ms ${EASE}, opacity 500ms ease`,
            }}
          >
            <Moon />
          </span>
        </span>
      </button>
      <Divider />
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={!muted}
        aria-label={muted ? "Turn music on" : "Turn music off"}
        className="flex w-12 shrink-0 items-center justify-center transition-opacity hover:opacity-70 focus:outline-none focus-visible:underline"
      >
        <Speaker muted={muted} />
      </button>
    </nav>
  );
}

function Speaker({ muted }: { muted: boolean }) {
  const swap = (on: boolean): React.CSSProperties => ({
    opacity: on ? 1 : 0,
    transform: on ? "none" : "scale(0.6)",
    transformOrigin: "16px 12px",
    transition: `opacity 300ms ease, transform 400ms ${EASE}`,
  });
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 9.5 H7 L12 5 V19 L7 14.5 H3.5 Z" />
      <g style={swap(!muted)}>
        <path d="M15 9.2 a4 4 0 0 1 0 5.6" />
        <path d="M17.6 6.6 a7.6 7.6 0 0 1 0 10.8" />
      </g>
      <g style={swap(muted)}>
        <path d="M15.5 9.5 L20.5 14.5 M20.5 9.5 L15.5 14.5" />
      </g>
    </svg>
  );
}

function Divider() {
  return <span aria-hidden="true" className="my-0 w-px shrink-0" style={{ background: rule }} />;
}

function Ruler({ narrow }: { narrow: boolean }) {
  const labelEvery = narrow ? 90 : 45;
  const ticks: number[] = [];
  for (let d = -SPAN; d <= SPAN; d += TICK_EVERY) ticks.push(d);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div
        className="absolute left-1/2 top-0 h-full"
        style={{
          transform: `translateX(calc(var(--map-heading, 0) * ${-PX_PER_DEG}px))`,
          transition: "transform var(--map-ease, 0ms)",
        }}
      >
        {ticks.map((d, i) => {
          const caret = i % 3 === 0;
          const label = Math.abs(d % labelEvery) < 0.01;
          return (
            <span key={d} className="absolute top-0" style={{ left: d * PX_PER_DEG }}>
              {caret ? (
                <svg
                  viewBox="0 0 6 7"
                  className="absolute left-0 top-[24px] h-[7px] w-[6px] -translate-x-1/2 sm:top-[27px]"
                >
                  <path
                    d="M3 0 L6 7 M3 0 L0 7 M1.2 4.6 H4.8"
                    stroke="currentColor"
                    strokeWidth="0.9"
                    fill="none"
                    opacity="0.75"
                  />
                </svg>
              ) : (
                <span className="absolute left-0 top-[25px] h-[5px] w-px -translate-x-1/2 bg-current opacity-60 sm:top-[28px]" />
              )}
              {label && (
                <span
                  className="absolute left-0 top-[36px] -translate-x-1/2 whitespace-nowrap font-[family-name:var(--font-cormorant)] text-[17px] font-semibold leading-none sm:top-[42px] sm:text-[19px]"
                  style={{ fontVariantNumeric: "oldstyle-nums" }}
                >
                  {d < 0 ? "-" : ""}
                  {Math.abs(d)}°
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const STAMP_EDGE = (() => {
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts: string[] = [];
  const side = (x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 0; i < 9; i++) {
      const t = i / 9;
      const j = (rnd() - 0.5) * 2.2;
      const x = x0 + (x1 - x0) * t + (y1 === y0 ? 0 : j);
      const y = y0 + (y1 - y0) * t + (x1 === x0 ? 0 : j);
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  };
  side(4, 4, 48, 4);
  side(48, 4, 48, 48);
  side(48, 48, 4, 48);
  side(4, 48, 4, 4);
  return `M${pts.join(" L")} Z`;
})();

const PAGES = [
  { page: "library", label: "Library", icon: "book", x: -92, y: -58 },
  { page: "home", label: "Home", icon: "home", x: 0, y: -104, current: true },
  { page: "more", label: "More", icon: "more", x: 92, y: -58 },
] as const;
const FAN_OPEN = "cubic-bezier(0.34, 1.56, 0.64, 1)";

function CompassMenu({
  narrow,
  hidden,
  onOpenPage,
}: {
  narrow: boolean;
  hidden: boolean;
  onOpenPage: (page: SitePage) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = open && !hidden;
  const k = narrow ? 0.8 : 1;

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!shown) return;
    itemRefs.current[1]?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const i = itemRefs.current.findIndex((el) => el === document.activeElement);
        const next = Math.max(0, Math.min(2, (i < 0 ? 1 : i) + (e.key === "ArrowLeft" ? -1 : 1)));
        itemRefs.current[next]?.focus();
        e.preventDefault();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [shown]);

  return (
    <div ref={rootRef} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[60%]">
      <svg
        viewBox="-110 -120 220 90"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[34px] h-[90px] w-[220px] -translate-x-1/2 -translate-y-full"
        style={{ opacity: shown ? 0.45 : 0, transition: `opacity ${shown ? 500 : 180}ms ease ${shown ? 120 : 0}ms` }}
      >
        <path
          d={`M${-92 * k} ${-58 * k + 40} Q0 ${-150 * k + 40} ${92 * k} ${-58 * k + 40}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      </svg>

      <div id="compass-menu" role="menu" aria-label="Pages" aria-hidden={!shown}>
        {PAGES.map((p, i) => {
          const delay = shown ? i * 60 : (2 - i) * 30;
          const current = "current" in p && p.current;
          return (
            <button
              key={p.page}
              type="button"
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              role="menuitem"
              tabIndex={shown ? 0 : -1}
              aria-current={current ? "page" : undefined}
              onClick={() => {
                close(false);
                if (p.page !== "home") onOpenPage(p.page);
              }}
              className="group absolute left-1/2 top-[34px] flex flex-col items-center gap-1 focus:outline-none"
              style={{
                transform: shown
                  ? `translate(-50%, -50%) translate(${p.x * k}px, ${p.y * k}px) scale(1)`
                  : "translate(-50%, -50%) scale(0.3)",
                opacity: shown ? 1 : 0,
                pointerEvents: shown ? "auto" : "none",
                transition: shown
                  ? `transform 420ms ${FAN_OPEN} ${delay}ms, opacity 260ms ease ${delay}ms`
                  : `transform 220ms ease-in ${delay}ms, opacity 180ms ease-in ${delay}ms`,
              }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_3px_8px_rgba(40,28,16,0.3)] transition-transform group-hover:scale-105 group-focus-visible:scale-105"
                style={{
                  background: `${GRAIN}, var(--ui-paper)`,
                  borderColor: current ? "var(--ui-ink)" : "color-mix(in srgb, var(--ui-ink) 40%, transparent)",
                  borderWidth: current ? 2 : 1,
                }}
              >
                <PageIcon icon={p.icon} />
              </span>
              <span
                className="font-display rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase leading-none tracking-[0.07em] group-focus-visible:underline"
                style={{ background: "color-mix(in srgb, var(--ui-paper) 88%, transparent)" }}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={shown ? "Close menu" : "Open menu"}
        aria-expanded={shown}
        aria-controls="compass-menu"
        className="relative flex flex-col items-center focus:outline-none focus-visible:[&>svg:last-child]:opacity-80"
      >
        <svg viewBox="0 0 10 8" className="mb-1 h-2 w-2.5" aria-hidden="true">
          <path d="M5 0 L10 8 H0 Z" fill="currentColor" />
        </svg>
        <Stamp open={shown} />
      </button>
    </div>
  );
}

function PageIcon({ icon }: { icon: "book" | "home" | "more" }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (icon === "book")
    return (
      <svg {...common}>
        <path d="M12 6.5 C10 5 6.5 4.5 3.5 5 V18.5 C6.5 18 10 18.5 12 20 C14 18.5 17.5 18 20.5 18.5 V5 C17.5 4.5 14 5 12 6.5 Z" />
        <path d="M12 6.5 V20" />
      </svg>
    );
  if (icon === "home")
    return (
      <svg {...common}>
        <path d="M4 20 V10 L6 8 L8 10 V7 H10 V9 L12 6.5 L14 9 V7 H16 V10 L18 8 L20 10 V20 Z" />
        <path d="M10.5 20 V15.5 a1.5 1.5 0 0 1 3 0 V20" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

function Stamp({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 52 52"
      className="h-[52px] w-[52px] drop-shadow-[0_2px_3px_rgba(40,28,16,0.3)]"
      aria-hidden="true"
    >
      <path d={STAMP_EDGE} fill="var(--ui-paper)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
      <path
        d={STAMP_EDGE}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="0.6"
        transform="translate(26 26) scale(0.86) translate(-26 -26)"
      />
      <g
        style={{
          transform: `rotate(${open ? 45 : 0}deg)`,
          transformOrigin: "26px 26px",
          transition: "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <g
          style={{
            transform: "rotate(calc(var(--map-turn, 0deg) - var(--map-heading, 0) * 1deg))",
            transformOrigin: "26px 26px",
            transition: "transform var(--map-ease, 0ms)",
          }}
        >
          <circle cx="26" cy="26" r="15" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.75" />
          <path d="M26 5 L29.5 22.5 L47 26 L29.5 29.5 L26 47 L22.5 29.5 L5 26 L22.5 22.5 Z" fill="currentColor" />
          <path
            d="M12.5 12.5 L25 24.5 M39.5 12.5 L27.5 25 M12.5 39.5 L25 27.5 M39.5 39.5 L27.5 27.5"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.85"
          />
          <path
            d="M26 12 L27.6 24.4 L40 26 L27.6 27.6 L26 40 L24.4 27.6 L12 26 L24.4 24.4 Z"
            fill="var(--ui-paper)"
            opacity="0.35"
          />
          <circle cx="26" cy="26" r="1.8" fill="var(--ui-paper)" />
        </g>
      </g>
    </svg>
  );
}

function Sun() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M18.7 5.3 L17 7 M7 17 L5.3 18.7" />
    </svg>
  );
}

function Moon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.5 14.5 A8 8 0 1 1 9.5 4.5 A6.5 6.5 0 0 0 19.5 14.5 Z" />
    </svg>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LAYERS, ShaderLayer } from "./clouds";

const INTRO = {
  kicker: "In the realm of",
  title: "Protheka",
  tagline: "Ten kingdoms. Countless stories.",
  button: "Explore the map",
};

export const DIVE_MS = 2900;
const EASE = "cubic-bezier(0.22, 0.8, 0.3, 1)";
const DIVE_EASE = "cubic-bezier(0.45, 0, 0.2, 1)";

// Cloud banks, nearest first: how much each expands as we dive through it, and when it starts.
const BANKS = [
  { layer: LAYERS.introNear, seed: 5.3, grow: 3.4, delay: 200 },
  { layer: LAYERS.introMid, seed: 61.7, grow: 2.6, delay: 350 },
  { layer: LAYERS.introFar, seed: 29.1, grow: 2.0, delay: 500 },
];

export default function Intro({ diving, onExplore }: { diving: boolean; onExplore: () => void }) {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cloudsOk, setCloudsOk] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const noClouds = useCallback(() => setCloudsOk(false), []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setShown(true);
    }, 60);
    buttonRef.current?.focus({ preventScroll: true });
    return () => clearTimeout(t);
  }, []);

  // Staggered entrance for the text; on the dive it all lifts away together.
  const rise = (delay: number): React.CSSProperties => ({
    opacity: shown && !diving ? 1 : 0,
    transform: shown && !diving ? "none" : diving ? "translateY(-18px)" : "translateY(14px)",
    transition: diving
      ? `opacity 500ms ease, transform 600ms ${EASE}`
      : `opacity 1000ms ${EASE} ${delay}ms, transform 1000ms ${EASE} ${delay}ms`,
  });

  return (
    <div role="dialog" aria-label="Welcome" className="fixed inset-0 z-45 overflow-hidden">
      {/* Dark soft vignette: the view from high above */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(10, 8, 5, 0.22) 0%, rgba(10, 8, 5, 0.45) 55%, rgba(10, 8, 5, 0.85) 100%)",
          opacity: diving ? 0 : 1,
          transition: diving ? `opacity ${reduced ? 400 : 2400}ms ${DIVE_EASE}` : "none",
        }}
      />

      {/* Cloud banks: each expands from the centre and thins as we pass through it */}
      {cloudsOk &&
        BANKS.map((b) => (
          <div
            key={b.seed}
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              transform: diving && !reduced ? `scale(${b.grow})` : "none",
              opacity: diving ? 0 : 1,
              transition: diving
                ? reduced
                  ? "opacity 400ms ease"
                  : `transform 2400ms ${DIVE_EASE} ${b.delay - 200}ms, opacity 2000ms ease-in ${b.delay}ms`
                : "none",
            }}
          >
            {/* brighter, cooler white than the map's sepia clouds, like real clouds seen from above */}
            <div className="absolute inset-0" style={{ filter: "brightness(1.35) saturate(0.45) contrast(1.05)" }}>
              <ShaderLayer layer={b.layer} seed={b.seed} onFail={noClouds} />
            </div>
          </div>
        ))}

      {/* Title block */}
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <svg viewBox="0 0 24 24" className="mb-5 h-5 w-5 text-[#e8c98a]" aria-hidden="true" style={rise(0)}>
          <path d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z" fill="currentColor" />
          <path d="M5 5 L11 11 M19 5 L13 11 M5 19 L11 13 M19 19 L13 13" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <p
          className="font-display text-[clamp(0.8rem,1.1vw,1rem)] uppercase tracking-[0.3em] text-white/85"
          style={{ ...rise(150), textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}
        >
          {INTRO.kicker}
        </p>
        <h1
          className="font-display mt-4 pl-[0.18em] text-[clamp(2.6rem,6vw,6rem)] font-semibold uppercase leading-none tracking-[0.18em]"
          style={{ ...rise(300), textShadow: "0 2px 24px rgba(0,0,0,0.55)" }}
        >
          {INTRO.title}
        </h1>
        <p
          className="mt-6 font-[family-name:var(--font-fell)] text-[clamp(1rem,1.4vw,1.25rem)] italic text-white/90"
          style={{ ...rise(500), textShadow: "0 1px 12px rgba(0,0,0,0.6)" }}
        >
          {INTRO.tagline}
        </p>
        <div className="mt-9" style={rise(700)}>
          <button
            ref={buttonRef}
            type="button"
            onClick={onExplore}
            disabled={diving}
            className="font-display min-h-11 border border-[#2b2620]/70 bg-[#f4ecd8] px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#2b2620] shadow-[inset_0_0_0_3px_#f4ecd8,inset_0_0_0_4px_rgba(43,38,32,0.45)] transition-shadow duration-300 hover:shadow-[inset_0_0_0_3px_#f4ecd8,inset_0_0_0_4px_rgba(43,38,32,0.45),0_0_28px_rgba(244,236,216,0.55)] focus:outline-none focus-visible:shadow-[inset_0_0_0_3px_#f4ecd8,inset_0_0_0_4px_rgba(43,38,32,0.45),0_0_0_2px_#fff]"
          >
            {INTRO.button}
          </button>
        </div>
      </div>
    </div>
  );
}

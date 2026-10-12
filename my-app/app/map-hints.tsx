"use client";

import { useEffect, useState } from "react";
import { GRAIN } from "./parchment";

const EASE = "cubic-bezier(0.22, 0.8, 0.3, 1)";
const RED = "var(--hint-red)";
const SHAPE = "M2 9 C 70 1, 150 13, 236 6 C 290 2, 330 3, 358 8 L 356 92 C 300 99, 240 89, 170 95 C 100 100, 40 91, 4 96 Z";
const ROTATE_MS = 4500;

type Icon = "drag" | "wheel" | "click" | "swipe" | "pinch" | "tap";
const POINTER_TIPS: { text: string; icon: Icon }[] = [
  { text: "Click and drag to explore", icon: "drag" },
  { text: "Scroll to zoom", icon: "wheel" },
  { text: "Click a kingdom to discover", icon: "click" },
];
const TOUCH_TIPS: { text: string; icon: Icon }[] = [
  { text: "Swipe to explore", icon: "swipe" },
  { text: "Pinch to zoom", icon: "pinch" },
  { text: "Tap a kingdom to discover", icon: "tap" },
];

export default function MapHints({ visible, done }: { visible: boolean; done: boolean }) {
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [tip, setTip] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setTouch(window.matchMedia("(pointer: coarse)").matches);
      setReady(true);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const show = ready && visible && !done && !dismissed;

  useEffect(() => {
    if (!show || paused) return;
    const t = window.setInterval(() => setTip((n) => (n + 1) % 3), ROTATE_MS);
    return () => clearInterval(t);
  }, [show, paused]);

  const tips = touch ? TOUCH_TIPS : POINTER_TIPS;

  return (
    <div
      className="fixed bottom-[84px] right-4 z-20 w-[min(400px,calc(100vw-2rem))] sm:bottom-[84px] min-[900px]:right-6"
      style={{
        color: "var(--ui-ink)",
        opacity: show ? 1 : 0,
        translate: show ? "0 0" : "12px 14px",
        transition: `opacity 700ms ${EASE}, translate 700ms ${EASE}`,
        pointerEvents: show ? "auto" : "none",
        filter: "drop-shadow(0 6px 14px rgba(40, 28, 16, 0.28))",
      }}
      aria-hidden={!show}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <svg viewBox="0 0 360 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="hint-paper" cx="50%" cy="45%" r="75%">
            <stop offset="0" style={{ stopColor: "var(--hint-light)" }} />
            <stop offset="0.6" style={{ stopColor: "var(--hint-paper)" }} />
            <stop offset="1" style={{ stopColor: "var(--hint-edge)" }} />
          </radialGradient>
          <pattern id="hint-grain" width="240" height="240" patternUnits="userSpaceOnUse">
            <image href={GRAIN.slice(5, -2)} width="240" height="240" />
          </pattern>
        </defs>
        <path d={SHAPE} fill="url(#hint-paper)" />
        <path d={SHAPE} fill="url(#hint-grain)" opacity="0.9" />
        <path d={SHAPE} fill="none" style={{ stroke: "var(--hint-rim)" }} strokeOpacity="0.55" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path
          d="M6 12 C 72 4, 150 16, 236 9 C 290 5, 328 6, 354 11 L 352 89 C 300 96, 240 86, 170 92 C 100 97, 42 88, 8 93 Z"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <button
        type="button"
        aria-label="Hide hints"
        onClick={() => setDismissed(true)}
        className="absolute right-1 top-1 z-10 flex h-11 w-11 items-center justify-center opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:underline"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 3 L13 13 M13 3 L3 13" />
        </svg>
      </button>

      <div className="relative flex flex-col items-center px-6 pb-4 pt-6">
        <div role="note" aria-live="polite" className="grid w-full place-items-center pr-6">
          {tips.map((t, i) => (
            <div
              key={t.text}
              aria-hidden={i !== tip}
              className="col-start-1 row-start-1 flex items-center gap-4"
              style={{
                opacity: i === tip ? 1 : 0,
                transform: i === tip ? "none" : "translateY(6px)",
                transition:
                  i === tip
                    ? `opacity 350ms ${EASE} 120ms, transform 350ms ${EASE} 120ms`
                    : "opacity 250ms ease, transform 250ms ease",
              }}
            >
              <TipIcon icon={t.icon} />
              <span className="font-display text-[13px] font-bold uppercase leading-snug tracking-[0.06em] min-[900px]:whitespace-nowrap">{t.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center">
          {tips.map((t, i) => (
            <button
              key={t.text}
              type="button"
              aria-label={`Tip ${i + 1} of 3`}
              aria-current={i === tip}
              onClick={() => setTip(i)}
              className="flex h-7 w-6 items-center justify-center focus:outline-none focus-visible:underline"
            >
              <span
                className="flex h-2.5 w-2.5 items-center justify-center rounded-full border transition-colors duration-300"
                style={{ borderColor: i === tip ? RED : "color-mix(in srgb, currentColor 55%, transparent)" }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full transition-transform duration-300"
                  style={{ background: RED, transform: i === tip ? "scale(1)" : "scale(0)" }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TipIcon({ icon }: { icon: Icon }) {
  const common = {
    viewBox: "0 0 28 40",
    className: "h-10 w-7 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (icon === "drag" || icon === "wheel" || icon === "click") {
    return (
      <svg {...common}>
        {icon === "drag" || icon === "click" ? <path d="M4 15 V12 a10 10 0 0 1 10 -10 V15 Z" stroke="none" style={{ fill: RED }} /> : null}
        <rect x="4" y="2" width="20" height="34" rx="10" />
        <path d="M4 15 H24 M14 2 V15" />
        {icon === "wheel" ? <rect x="12" y="6" width="4" height="7" rx="2" style={{ fill: RED, stroke: RED }} /> : null}
        {icon === "click" ? <path d="M19 26 L24 31 M21.5 23 L26 27 M22 33 L26 37" style={{ stroke: RED }} /> : null}
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M11 38 V20 a3 3 0 0 1 6 0 V26 l5 1.5 a3 3 0 0 1 2 3.4 L23 38" />
      {icon === "swipe" ? <path d="M4 10 H22 M18 6 L22 10 L18 14" style={{ stroke: RED }} /> : null}
      {icon === "pinch" ? <path d="M6 4 L11 9 M6 4 V8 M6 4 H10 M22 16 L17 11 M22 16 V12 M22 16 H18" style={{ stroke: RED }} /> : null}
      {icon === "tap" ? <circle cx="14" cy="12" r="5" style={{ stroke: RED }} /> : null}
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, INK, linkClass, PAPER_BG } from "./parchment";

const EDGE_FILL = "var(--paper-edge)";
const RIM = "var(--paper-rim)";
export const OPEN_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const CLOSE_EASE = "cubic-bezier(0.7, 0, 0.84, 0)";

function deckle(seed: number, depth: number, inset: number) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const octave = (n: number) => Array.from({ length: n + 1 }, () => rnd());
  const big = octave(9);
  const mid = octave(28);
  const fine = octave(140);
  const at = (arr: number[], t: number) => {
    const f = t * (arr.length - 1);
    const i = Math.floor(f);
    const u = f - i;
    const k = u * u * (3 - 2 * u);
    return arr[i] * (1 - k) + arr[Math.min(i + 1, arr.length - 1)] * k;
  };
  const pts: [number, number][] = [];
  const n = 420;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = at(big, t) * 0.55 + at(mid, t) * 0.3 + at(fine, t) * 0.15;
    pts.push([t * 1000, inset + v * depth]);
  }
  return pts;
}
const EDGE = deckle(11, 44, 4);
const edgePath = (vertical: boolean, shift: number) => {
  const p = EDGE.map(([t, d]) =>
    vertical ? `${(d + shift).toFixed(1)} ${t.toFixed(1)}` : `${t.toFixed(1)} ${(d + shift).toFixed(1)}`,
  );
  return vertical ? `M56 0 L${p.join(" L")} L56 1000 Z` : `M0 56 L${p.join(" L")} L1000 56 Z`;
};

export default function ParchmentDrawer({
  open,
  onBack,
  labelledBy,
  nav,
  fullOnMobile = false,
  children,
}: {
  fullOnMobile?: boolean;
  open: boolean;
  onBack: () => void;
  labelledBy: string;
  nav?: React.ReactNode;
  children: (slidIn: boolean) => React.ReactNode;
}) {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 900px)").matches);
  const [slidIn, setSlidIn] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Paint the closed position first, then slide in, so the transition always runs.
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setSlidIn(true));
    });
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    backRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onBack]);

  const visible = open && slidIn;
  const hidden = wide ? "translate3d(105%, 0, 0)" : "translate3d(0, 105%, 0)";

  return (
    <div
      role="dialog"
      aria-labelledby={labelledBy}
      className={`fixed z-30 flex flex-col max-[899px]:inset-x-0 max-[899px]:bottom-0 ${
        fullOnMobile ? "max-[899px]:h-dvh" : "max-[899px]:h-[64dvh]"
      } min-[900px]:inset-y-0 min-[900px]:right-0 min-[900px]:w-[68vw]`}
      style={{
        color: INK,
        transform: visible ? "translate3d(0, 0, 0)" : hidden,
        transition: visible ? `transform 900ms ${OPEN_EASE}` : `transform 650ms ${CLOSE_EASE} 120ms`,
        filter: "drop-shadow(-6px 0 14px rgba(30, 22, 12, 0.32))",
      }}
    >
      <svg
        viewBox="0 0 56 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-y-0 -left-[55px] hidden h-full w-14 min-[900px]:block"
      >
        <path d={edgePath(true, -2.5)} style={{ fill: RIM }} />
        <path d={edgePath(true, 0)} style={{ fill: EDGE_FILL }} />
      </svg>
      <svg
        viewBox="0 0 1000 56"
        preserveAspectRatio="none"
        aria-hidden="true"
        className={`absolute inset-x-0 -top-[55px] h-14 w-full min-[900px]:hidden ${fullOnMobile ? "hidden" : ""}`}
      >
        <path d={edgePath(false, -2.5)} style={{ fill: RIM }} />
        <path d={edgePath(false, 0)} style={{ fill: EDGE_FILL }} />
      </svg>

      <div className="relative flex h-full flex-col overflow-y-auto" style={{ background: PAPER_BG }}>
        <div className="flex items-start justify-between gap-4 px-5 pt-4 min-[900px]:px-12 min-[900px]:pt-12">
          <div className="min-w-0">{nav}</div>
          <button
            ref={backRef}
            type="button"
            onClick={onBack}
            aria-label="Back to map"
            className={`${linkClass} shrink-0`}
          >
            <span className={nav ? "max-[479px]:hidden" : "max-[380px]:hidden"}>BACK TO MAP</span>
            <Arrow dir="left" />
          </button>
        </div>
        {children(slidIn)}
      </div>
    </div>
  );
}

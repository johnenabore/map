"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LAYERS, ShaderLayer } from "./clouds";

export const SWEEP_MS = 2600;
const MIDPOINT = 0.46; // share of the sweep when the clouds cover the most of the screen
const EASE = "cubic-bezier(0.45, 0, 0.55, 1)";

const BANKS = [
  { seed: 17.3, delay: 0, opacity: 1 },
  { seed: 58.9, delay: 160, opacity: 0.8 },
];

const TINT = {
  night: "brightness(0.62) sepia(0.35) hue-rotate(185deg) saturate(0.7)",
  day: "brightness(1.3) sepia(0.15) saturate(0.6)",
};

export default function ThemeSweep({
  to,
  onMidpoint,
  onDone,
}: {
  to: "night" | "day";
  onMidpoint: () => void;
  onDone: () => void;
}) {
  const bankRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cloudsOk, setCloudsOk] = useState(true);
  const noClouds = useCallback(() => setCloudsOk(false), []);
  // Kept in refs so a parent re-render never restarts the sweep.
  const mid = useRef(onMidpoint);
  const done = useRef(onDone);
  useEffect(() => {
    mid.current = onMidpoint;
    done.current = onDone;
  }, [onMidpoint, onDone]);

  useEffect(() => {
    const anims = bankRefs.current.map((el, i) =>
      el?.animate([{ transform: "translateX(-150vw)" }, { transform: "translateX(150vw)" }], {
        duration: SWEEP_MS,
        delay: BANKS[i].delay,
        easing: EASE,
        fill: "both",
      }),
    );
    // Timers rather than animation events, so the light still changes if the clouds can't render.
    const t1 = window.setTimeout(() => mid.current(), SWEEP_MS * MIDPOINT);
    const t2 = window.setTimeout(() => done.current(), SWEEP_MS + BANKS[BANKS.length - 1].delay);
    return () => {
      anims.forEach((a) => a?.cancel());
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[19] overflow-hidden">
      {cloudsOk &&
        BANKS.map((b, i) => (
          <div
            key={b.seed}
            ref={(el) => {
              bankRefs.current[i] = el;
            }}
            className="absolute inset-y-[-10%] left-[-40vw] w-[180vw]"
            style={{
              opacity: b.opacity,
              transform: "translateX(-150vw)",
              maskImage: "linear-gradient(90deg, transparent, black 28%, black 72%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 28%, black 72%, transparent)",
            }}
          >
            <div className="absolute inset-0" style={{ filter: TINT[to] }}>
              <ShaderLayer layer={LAYERS.sweep} seed={b.seed} onFail={noClouds} />
            </div>
          </div>
        ))}
    </div>
  );
}

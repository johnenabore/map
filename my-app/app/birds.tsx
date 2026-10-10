"use client";

import { useEffect, useRef, useState } from "react";

const MAP_W = 1679;
const MAP_H = 937;
const ALTITUDE = 160; // px above the map, between the low (50) and high (300) clouds
const FLIGHT_MS = 14000;
const BIRD = 26; // wingspan in map px
const FORMATION: [number, number][] = [
  [0, 0],
  [-38, -24],
  [-36, 26],
  [-74, -44],
  [-70, 50],
  [-110, -62],
  [-104, 74],
];

interface Flight {
  id: number;
  from: [number, number];
  mid: [number, number];
  to: [number, number];
  heading: number;
  count: number;
}

function plan(id: number, night: boolean): Flight {
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  const leftToRight = Math.random() < 0.5;
  const from: [number, number] = [leftToRight ? -120 : MAP_W + 120, r(120, MAP_H - 180)];
  const to: [number, number] = [leftToRight ? MAP_W + 120 : -120, r(120, MAP_H - 180)];
  const mid: [number, number] = [(from[0] + to[0]) / 2 + r(-80, 80), (from[1] + to[1]) / 2 + r(-140, 140)];
  const heading = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  return { id, from, mid, to, heading, count: night ? 3 : 5 + Math.floor(Math.random() * 3) };
}


export default function Birds({ active, night }: { active: boolean; night: boolean }) {
  const [flight, setFlight] = useState<Flight | null>(null);
  const activeRef = useRef(active);
  const nightRef = useRef(night);
  const nextId = useRef(1);

  useEffect(() => {
    activeRef.current = active;
    nightRef.current = night;
  }, [active, night]);

  // Schedule flocks: the first one soon after arriving, then every 18–35 s while the map is in view.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const schedule = (ms: number) => {
      timer = window.setTimeout(() => {
        if (!activeRef.current || document.hidden) return schedule(3000);
        setFlight(plan(nextId.current++, nightRef.current));
        schedule(18000 + Math.random() * 17000);
      }, ms);
    };
    schedule(6000 + Math.random() * 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!flight) return null;
  return <Flock key={flight.id} flight={flight} night={night} onDone={() => setFlight(null)} />;
}

function Flock({ flight, night, onDone }: { flight: Flight; night: boolean; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const birdsRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const w = rootRef.current?.offsetWidth ?? 0;
    const h = rootRef.current?.offsetHeight ?? 0;
    const at = ([x, y]: [number, number]) => ({ transform: `translate(${(x / MAP_W) * w}px, ${(y / MAP_H) * h}px)` });
    const frames = [at(flight.from), at(flight.mid), at(flight.to)];
    const opts: KeyframeAnimationOptions = { duration: FLIGHT_MS, easing: "linear", fill: "both" };
    const a = birdsRef.current?.animate(frames, opts);
    const b = shadowRef.current?.animate(frames, opts);
    if (a) a.onfinish = () => done.current();
    return () => {
      a?.cancel();
      b?.cancel();
    };
  }, [flight]);

  const flock = (shadow: boolean) =>
    FORMATION.slice(0, flight.count).map(([dx, dy], i) => (
      <svg
        key={i}
        viewBox="0 0 20 8"
        className="absolute"
        style={{
          left: `calc(var(--mw) * ${dx / MAP_W})`,
          top: `calc(var(--mw) * ${dy / MAP_W})`,
          width: `calc(var(--mw) * ${BIRD / MAP_W})`,
          height: `calc(var(--mw) * ${(BIRD * 0.4) / MAP_W})`,
          overflow: "visible",
          transformOrigin: "50% 62%",
          animation: shadow ? undefined : `bird-flap ${0.32 + (i % 3) * 0.04}s ease-in-out ${-i * 0.11}s infinite alternate`,
        }}
      >
        <path
          d="M1 6 Q5 0 10 5 Q15 0 19 6"
          fill="none"
          stroke={shadow ? "rgba(30, 20, 10, 1)" : "#2b2117"}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ));

  const turn = `rotate(${flight.heading}deg)`;
  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div ref={shadowRef} className="absolute left-0 top-0 h-0 w-0" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="absolute h-0 w-0"
          style={{
            transform: `translateZ(1px) translate(calc(var(--mw) * ${10 / MAP_W}), calc(var(--mw) * ${26 / MAP_W})) ${turn}`,
            opacity: night ? 0.08 : 0.18,
            filter: "blur(1.5px)",
          }}
        >
          {flock(true)}
        </div>
      </div>
      <div ref={birdsRef} className="absolute left-0 top-0 h-0 w-0" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="absolute h-0 w-0"
          style={{ transform: `translateZ(${ALTITUDE}px) ${turn}`, opacity: night ? 0.6 : 0.9 }}
        >
          {flock(false)}
        </div>
      </div>
    </div>
  );
}

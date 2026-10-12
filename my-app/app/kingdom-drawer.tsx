"use client";

import { useEffect, useState } from "react";
import { KINGDOMS } from "./kingdom-data";
import { Arrow, linkClass } from "./parchment";
import ParchmentDrawer, { OPEN_EASE } from "./parchment-drawer";

const MAP_W = 1679;
const MAP_H = 937;

export default function KingdomDrawer({
  id,
  open,
  onBack,
  onEnter,
}: {
  id: string;
  open: boolean;
  onBack: () => void;
  onEnter: () => void;
}) {
  return (
    <ParchmentDrawer open={open} onBack={onBack} labelledBy="drawer-title">
      {(slidIn) => <KingdomContent id={id} open={open} slidIn={slidIn} onEnter={onEnter} />}
    </ParchmentDrawer>
  );
}

function KingdomContent({
  id,
  open,
  slidIn,
  onEnter,
}: {
  id: string;
  open: boolean;
  slidIn: boolean;
  onEnter: () => void;
}) {
  const [shownId, setShownId] = useState(id);
  const [contentIn, setContentIn] = useState(false);

  useEffect(() => {
    if (!open || id !== shownId) {
      const out = window.setTimeout(() => setContentIn(false), 0);
      const swap = open ? window.setTimeout(() => setShownId(id), 260) : 0;
      return () => {
        clearTimeout(out);
        clearTimeout(swap);
      };
    }
    if (!slidIn) return;
    const t = window.setTimeout(() => setContentIn(true), 30);
    return () => clearTimeout(t);
  }, [id, shownId, open, slidIn]);

  const kingdom = KINGDOMS.find((k) => k.id === shownId)!;

  const rise = (delay: number, extra?: React.CSSProperties): React.CSSProperties => ({
    opacity: contentIn ? 1 : 0,
    transform: contentIn ? "none" : "translateY(14px)",
    transition: contentIn
      ? `opacity 700ms ${OPEN_EASE} ${delay}ms, transform 700ms ${OPEN_EASE} ${delay}ms`
      : "opacity 200ms ease, transform 200ms ease",
    ...extra,
  });

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-12 pt-4 text-center min-[900px]:pt-[14vh]">
      <Picture key={shownId} id={shownId} centre={kingdom.centre} size={kingdom.size} style={rise(250)} />

      <h2
        id="drawer-title"
        className="mt-8 font-[family-name:var(--font-cormorant)] text-[clamp(1.4rem,2vw,1.9rem)] font-medium leading-[1.35] tracking-[0.04em]"
      >
        <span className="block" style={rise(380)}>
          YOU DISCOVERED
        </span>
        <span className="block" style={rise(450)}>
          {kingdom.name.toUpperCase()}
        </span>
      </h2>

      <svg
        viewBox="0 0 170 12"
        aria-hidden="true"
        className="mt-5 h-3 w-[170px]"
        style={{
          color: "var(--paper-rule)",
          opacity: contentIn ? 1 : 0,
          transform: contentIn ? "scaleX(1)" : "scaleX(0.15)",
          transition: contentIn
            ? `opacity 700ms ${OPEN_EASE} 560ms, transform 1000ms ${OPEN_EASE} 560ms`
            : "opacity 200ms ease",
        }}
      >
        <path d="M0 6 H68 M102 6 H170" stroke="currentColor" strokeWidth="0.9" />
        <path d="M85 3.2 a2.8 2.8 0 1 0 0.01 0 Z" fill="currentColor" />
        <path
          d="M71 6 C75 2 79 2 82 6 C79 10 75 10 71 6 Z M99 6 C95 2 91 2 88 6 C91 10 95 10 99 6 Z"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>

      <p
        className="mt-5 max-w-[330px] font-[family-name:var(--font-opensans)] text-[15px] italic leading-[1.55] text-[var(--paper-quote)] min-[900px]:text-base"
        style={rise(640)}
      >
        {kingdom.quote}
      </p>

      <div className="mt-7" style={rise(740)}>
        <button type="button" onClick={onEnter} className={`${linkClass} opacity-75 hover:opacity-100`}>
          ENTER KINGDOM
          <Arrow dir="right" />
        </button>
      </div>
    </div>
  );
}

function Picture({
  id,
  centre,
  size,
  style,
}: {
  id: string;
  centre: [number, number];
  size: [number, number];
  style: React.CSSProperties;
}) {
  const [artLoaded, setArtLoaded] = useState(false);
  const ratio = 16 / 9;
  const fw = Math.min(MAP_W, Math.max(size[0] * 1.2, size[1] * 1.2 * ratio));
  const fh = fw / ratio;
  const fx = Math.min(MAP_W - fw, Math.max(0, centre[0] - fw / 2));
  const fy = Math.min(MAP_H - fh, Math.max(0, centre[1] - fh / 2));

  return (
    <div className="w-[min(78vw,440px)] border border-[var(--paper-frame)] p-[5px] min-[900px]:w-[min(30vw,440px)]" style={style}>
      <div className="relative aspect-video w-full overflow-hidden border border-[var(--paper-frame-inner)] bg-[#2a2016]">
        <div className="absolute inset-0" style={{ animation: "slow-drift 22s ease-in-out infinite alternate" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/new-map.png"
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: `${(MAP_W / fw) * 100}%`,
              left: `${(-fx / fw) * 100}%`,
              top: `${(-fy / fh) * 100}%`,
              filter: "sepia(0.4) contrast(1.15) brightness(0.88) saturate(1.15)",
            }}
          />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/kingdoms/art/${id}.jpg`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{ opacity: artLoaded ? 1 : 0 }}
          onLoad={() => setArtLoaded(true)}
          onError={() => setArtLoaded(false)}
        />
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_26px_rgba(20,12,4,0.45)]" />
      </div>
    </div>
  );
}

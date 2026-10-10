"use client";

import { KINGDOMS } from "./kingdom-data";

const MAP_W = 1679;
const MAP_H = 937;
// Light up briskly, let go slowly; the warm light also blooms outward a little as it comes on.
const EASE = "cubic-bezier(0.22, 0.8, 0.3, 1)";
const fade = (on: boolean) => (on ? `opacity 450ms ${EASE}, transform 900ms ${EASE}` : "opacity 900ms ease, transform 900ms ease");

const box = (x: number, y: number, w: number, h: number) => ({
  left: `${(x / MAP_W) * 100}%`,
  top: `${(y / MAP_H) * 100}%`,
  width: `${(w / MAP_W) * 100}%`,
  height: `${(h / MAP_H) * 100}%`,
});

export default function Kingdoms({
  hovered,
  onHover,
}: {
  hovered: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <>
      {KINGDOMS.map(({ id, glow, centre, size }) => {
        const on = hovered === id;
        // The warm light reaches well past the coast, like a lamp held behind the kingdom.
        const lw = size[0] * 1.6 + 120;
        const lh = size[1] * 1.6 + 120;
        return (
          <div key={id} aria-hidden="true">
            <div
              className="pointer-events-none absolute"
              style={{
                ...box(centre[0] - lw / 2, centre[1] - lh / 2, lw, lh),
                background: "radial-gradient(ellipse at center, rgba(255, 214, 140, 0.42), rgba(255, 214, 140, 0) 70%)",
                opacity: on ? 1 : 0,
                transform: on ? "scale(1)" : "scale(0.88)",
                transition: fade(on),
              }}
            />
            <div
              className="pointer-events-none absolute"
              style={{ ...box(...glow), opacity: on ? 1 : 0, transition: fade(on) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/kingdoms/glow-${id}.webp`}
                alt=""
                draggable={false}
                className="h-full w-full"
                style={{ animation: on ? "kingdom-breathe 3s ease-in-out infinite" : undefined }}
              />
            </div>
          </div>
        );
      })}

      {/* Hit shapes: transparent, but they catch the mouse over each kingdom's land */}
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ transform: "translateZ(3px)" }}
      >
        {KINGDOMS.map(({ id, name, path }) => (
          <path
            key={id}
            d={path}
            data-kingdom={id}
            aria-label={name}
            fill="transparent"
            style={{ pointerEvents: "fill", cursor: "pointer" }}
            onPointerEnter={(e) => e.pointerType !== "touch" && onHover(id)}
            onPointerLeave={(e) => e.pointerType !== "touch" && onHover(null)}
          />
        ))}
      </svg>
    </>
  );
}

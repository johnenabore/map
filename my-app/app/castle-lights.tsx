import { memo } from "react";
import { CASTLE_LIGHTS } from "./castle-lights-data";

const MAP_W = 1679;
const MAP_H = 937;
const mpx = (v: number) => `calc(var(--mw) * ${v / MAP_W})`;

const vary = (i: number, salt: number) => {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return Math.round(((h >>> 0) / 4294967296) * 1000) / 1000;
};

function CastleLights({ night }: { night: boolean }) {
  let n = 0;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ transform: "translateZ(3px)", transformStyle: "preserve-3d" }}
    >
      {CASTLE_LIGHTS.map((windows, b) =>
        windows.map(([x, y], w) => {
          const i = n++;
          const delay = night ? 900 + b * 70 + w * 120 + vary(i, 1) * 150 : vary(i, 2) * 200;
          return (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${(x / MAP_W) * 100}%`,
                top: `${(y / MAP_H) * 100}%`,
                width: 0,
                height: 0,
                opacity: night ? 1 : 0,
                transition: `opacity ${night ? 900 : 600}ms ease ${delay}ms`,
              }}
            >
              <span
                className="castle-flicker absolute rounded-full"
                style={{
                  width: mpx(11),
                  height: mpx(11),
                  translate: "-50% -50%",
                  background:
                    "radial-gradient(circle, rgba(255, 214, 130, 0.85) 0%, rgba(255, 170, 70, 0.4) 30%, rgba(255, 150, 50, 0) 70%)",
                  animation: night && w === 0
                    ? `window-flicker ${1.6 + vary(i, 3) * 1.8}s ease-in-out ${-vary(i, 4) * 3}s infinite alternate`
                    : "none",
                }}
              />
              <span
                className="absolute rounded-full"
                style={{
                  width: mpx(2.4),
                  height: mpx(2.4),
                  translate: "-50% -50%",
                  background: "#fff1c8",
                  boxShadow: `0 0 ${mpx(1.5)} rgba(255, 220, 140, 0.9)`,
                }}
              />
            </span>
          );
        }),
      )}
    </div>
  );
}

// Memoized: the map re-renders on every hover and drawer change; this only needs to when its own props change.
export default memo(CastleLights);

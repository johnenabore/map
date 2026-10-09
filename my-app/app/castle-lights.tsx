import { CASTLE_LIGHTS } from "./castle-lights-data";

// At night, small warm lights come on in the windows of the castles, towers and houses drawn on the map, one
// building after another, and flicker like candles. They sit just above the night veil (2.5px) so they stay bright
// in the dark, and are hidden by day. They never take the pointer.
const MAP_W = 1679;
const MAP_H = 937;
const mpx = (v: number) => `calc(var(--mw) * ${v / MAP_W})`;

// Deterministic per-light variety (no Math.random in render, so server and client agree).
const vary = (i: number, salt: number) => {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

export default function CastleLights({ night }: { night: boolean }) {
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
          // Lights come on building by building as night falls; they all go out together at dawn.
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
                  animation: `window-flicker ${1.6 + vary(i, 3) * 1.8}s ease-in-out ${-vary(i, 4) * 3}s infinite alternate`,
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

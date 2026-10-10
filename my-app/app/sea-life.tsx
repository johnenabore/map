import { memo } from "react";
import { SEA_LIFE } from "./sealife-data";

const MAP_W = 1679;
const MAP_H = 937;

const box = (x: number, y: number, w: number, h: number): React.CSSProperties => ({
  left: `${(x / MAP_W) * 100}%`,
  top: `${(y / MAP_H) * 100}%`,
  width: `${(w / MAP_W) * 100}%`,
  height: `${(h / MAP_H) * 100}%`,
});

function SeaLife() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      // --u = one map pixel in layer px, used by the keyframes in globals.css
      style={{ transformStyle: "preserve-3d", ["--u" as string]: "calc(var(--mw) / 1679)" }}
    >
      {SEA_LIFE.map((s, i) => (
        <div key={s.name} className="absolute" style={{ ...box(s.x, s.y, s.w, s.h), transform: "translateZ(1.5px)" /* under the sea tint (2px) */ }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/sealife/p-${s.name}.webp`} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/sealife/s-${s.name}.webp`}
            alt=""
            draggable={false}
            className="sea-anim absolute inset-0 h-full w-full"
            style={{
              transformOrigin: s.kind === "ship" ? "50% 85%" : "50% 70%",
              animation:
                s.kind === "ship"
                  ? `ship-rock ${3.6 + (i % 3) * 0.5}s ease-in-out ${-i * 1.3}s infinite alternate`
                  : `serpent-swim ${8.5 + i}s ease-in-out ${-i * 2.7}s infinite alternate`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// Memoized: the map re-renders on every hover and drawer change; this only needs to when its own props change.
export default memo(SeaLife);

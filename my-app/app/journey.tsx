import { MARKERS } from "./region-labels";

const MAP_W = 1679;
const MAP_H = 937;
const BOW = 0.18; // how far a leg bends sideways, as a share of its length
const DRAW_DELAY = 700;
const DRAW_MS = 1800;

type Pt = { x: number; y: number };

// A gentle curve between two markers, bent to one side; which side is fixed by the pair of kingdoms.
function leg(a: Pt, b: Pt, side: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const c = { x: (a.x + b.x) / 2 - (dy / len) * len * BOW * side, y: (a.y + b.y) / 2 + (dx / len) * len * BOW * side };
  // Arc length of the quadratic curve, by sampling.
  let total = 0;
  let prev = a;
  for (let i = 1; i <= 32; i++) {
    const t = i / 32;
    const u = 1 - t;
    const p = { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
    total += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return { d: `M${a.x} ${a.y} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x} ${b.y}`, length: Math.ceil(total) };
}

const sideOf = (from: string, to: string) =>
  [...(from < to ? from + to : to + from)].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 2 ? 1 : -1;

export default function Journey({ stops, fresh }: { stops: string[]; fresh: boolean }) {
  const legs = stops.slice(1).flatMap((to, i) => {
    const from = stops[i];
    const a = MARKERS[from];
    const b = MARKERS[to];
    return a && b && from !== to ? [{ i, from, to, ...leg(a, b, sideOf(from, to)) }] : [];
  });
  if (legs.length === 0) return null;
  const last = legs[legs.length - 1].i;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      style={{ transform: "translateZ(3px)", color: "var(--map-ink)", transition: "color 900ms ease" }}
    >
      {legs.map(({ i, from, to, d, length }) => {
        const newest = i === last;
        const draw = newest && fresh; // added this visit: draw it in
        const mask = `journey-${i}-${from}-${to}`;
        return (
          <g key={mask} opacity={newest ? 0.95 : 0.5} style={{ transition: "opacity 900ms ease" }}>
            {draw && (
              <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={MAP_W} height={MAP_H}>
                <path
                  d={d}
                  fill="none"
                  stroke="white"
                  strokeWidth={8}
                  strokeLinecap="round"
                  className="trail-draw"
                  style={{
                    strokeDasharray: length,
                    strokeDashoffset: length,
                    animation: `trail-draw ${DRAW_MS}ms cubic-bezier(0.45, 0, 0.3, 1) ${DRAW_DELAY}ms forwards`,
                  }}
                />
              </mask>
            )}
            {/* a faint paper halo under the dots keeps them legible over the drawings */}
            <path
              d={d}
              fill="none"
              stroke="rgba(244, 232, 205, 0.5)"
              strokeWidth={4.6}
              strokeDasharray="0.1 7"
              strokeLinecap="round"
              mask={draw ? `url(#${mask})` : undefined}
            />
            <path
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeDasharray="0.1 7"
              strokeLinecap="round"
              mask={draw ? `url(#${mask})` : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}

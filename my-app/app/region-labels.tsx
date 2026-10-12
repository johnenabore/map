import { KINGDOMS } from "./kingdom-data";

const MAP_W = 1679;
const MAP_H = 937;

interface Dot {
  x: number;
  y: number;
}

interface Label {
  name: string;
  x: number;
  y: number;
  size: number;
  rot: number;
  dot: Dot;
}

const LABELS: Label[] = [
  { name: "Pref", x: 407, y: 128, size: 2.1, rot: -9, dot: { x: 407, y: 176 } },
  { name: "Kaynvu", x: 821, y: 249, size: 2.8, rot: 3, dot: { x: 761, y: 311 } },
  { name: "Oshta", x: 1257, y: 193, size: 2.8, rot: 8, dot: { x: 1257, y: 256 } },
  { name: "Galmoleth", x: 302, y: 459, size: 1.6, rot: 3, dot: { x: 302, y: 495 } },
  { name: "Rach", x: 462, y: 632, size: 2.6, rot: 10, dot: { x: 453, y: 686 } },
  { name: "Fouuer", x: 816, y: 613, size: 1.6, rot: 0, dot: { x: 816, y: 651 } },
  { name: "Clouz", x: 1180, y: 500, size: 2.6, rot: 36, dot: { x: 1162, y: 549 } },
  { name: "Milthar", x: 1370, y: 492, size: 1.5, rot: 8, dot: { x: 1355, y: 534 } },
  { name: "Osiris", x: 1509, y: 508, size: 1.7, rot: -35, dot: { x: 1525, y: 547 } },
  { name: "Prazh", x: 1199, y: 705, size: 2.7, rot: 5, dot: { x: 1210, y: 764 } },
];

export const MARKERS: Record<string, Dot> = Object.fromEntries(LABELS.map((l) => [l.name.toLowerCase(), l.dot]));

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

const LIFT = 70;
// Undo the map's tilt and turn so labels stay upright and flat to the screen, then re-apply the turn.
const floating = (rot: number) =>
  `translateZ(${LIFT}px) rotateZ(calc(var(--rot) * -1)) rotateX(calc(var(--tilt) * -1)) rotateZ(var(--rot)) rotateZ(${rot}deg) translate(-50%, -50%)`;

const SUBTITLES = Object.fromEntries(KINGDOMS.map((k) => [k.id, k.subtitle]));
const EASE = "cubic-bezier(0.22, 0.8, 0.3, 1)";

const em = (size: number) => `calc(var(--mw) * ${size / 100})`;

const textStyle = (size: number): React.CSSProperties => ({
  fontFamily: "var(--font-fell), var(--font-cinzel), serif",
  fontSize: em(size),
  lineHeight: 1,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  paddingLeft: "0.1em",
});

export default function RegionLabels({ hovered = null }: { hovered?: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
      {LABELS.map(({ name, dot }, index) => {
        const id = name.toLowerCase();
        return (
          <Marker
            key={`marker-${name}`}
            x={dot.x}
            y={dot.y}
            on={hovered === id}
            dim={hovered !== null && hovered !== id}
            index={index}
          />
        );
      })}
      {/* One sheet above the night veil; inset-0 keeps the labels' % positions relative to the map */}
      <div id="label-sheet" className="absolute inset-0" style={{ transform: "translateZ(3.5px)" }}>
        {LABELS.map(({ name, x, y, size, rot }) => {
          const id = name.toLowerCase();
          const on = hovered === id;
          const dim = hovered !== null && !on;
          return (
            <div key={name} style={{ opacity: dim ? 0.75 : 1, transition: `opacity 600ms ${EASE}` }}>
            <span
              className="absolute whitespace-nowrap"
              aria-hidden="true"
              style={{
                ...textStyle(size),
                left: pct(x, MAP_W),
                top: pct(y, MAP_H),
                transform: `translate(calc(-50% + 0.1em), calc(-50% + 0.3em)) rotate(${rot}deg)`,
                color: "var(--label-shadow)",
                filter: "blur(0.07em)",
              }}
            >
              {name}
            </span>
            <span
              className="absolute whitespace-nowrap"
              style={{
                ...textStyle(size),
                left: pct(x, MAP_W),
                top: pct(y, MAP_H),
                transformOrigin: "0 0",
                transform: floating(rot),
                color: "var(--label-ink)",
                WebkitTextStroke: "0.06em var(--label-ink)",
                textShadow: on ? "var(--label-halo-on)" : "var(--label-halo)",
                transition: `text-shadow 600ms ${EASE}, color 900ms ease, transform var(--cam-ease, 0ms)`,
              }}
            >
              <span
                className="inline-block"
                style={{
                  transform: on ? "translateY(-0.15em) scale(1.08)" : "none",
                  transition: `transform 600ms ${EASE}`,
                }}
              >
                {name}
              </span>
              <span
                className="absolute left-1/2 top-full whitespace-nowrap"
                style={{
                  fontSize: "0.42em",
                  fontStyle: "italic",
                  textTransform: "none",
                  letterSpacing: "0.06em",
                  WebkitTextStroke: "0.03em var(--label-ink)",
                  marginTop: "0.35em",
                  opacity: on ? 1 : 0,
                  transform: `translate(-50%, ${on ? "0" : "-0.4em"})`,
                  transition: `opacity 600ms ${EASE} ${on ? "120ms" : "0ms"}, transform 600ms ${EASE} ${on ? "120ms" : "0ms"}`,
                }}
              >
                {SUBTITLES[id]}
              </span>
            </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Marker({ x, y, on, dim, index }: { x: number; y: number; on: boolean; dim: boolean; index: number }) {
  const outline = `0 0 0 calc(var(--mw) * 0.0006) rgba(36, 26, 14, 0.85)`;
  const halo = `0 0 calc(var(--mw) * 0.004) calc(var(--mw) * 0.001) rgba(36, 26, 14, 0.45)`;
  return (
    <span
      aria-hidden="true"
      className="absolute"
      style={{
        left: pct(x, MAP_W),
        top: pct(y, MAP_H),
        width: 0,
        height: 0,
        transform: "translateZ(4px)",
        opacity: dim ? 0.7 : 1,
        transition: `opacity 600ms ${EASE}`,
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          left: 0,
          top: 0,
          width: em(4.5),
          height: em(4.5),
          translate: "-50% -50%",
          scale: on ? "1" : "0.62",
          opacity: on ? 1 : 0.85,
          transition: `scale 500ms ${EASE}, opacity 500ms ${EASE}`,
        }}
      >
        <span
          className="block h-full w-full rounded-full"
          style={{
            animation: on ? undefined : `marker-breathe 3.2s ease-in-out ${-index * 0.37}s infinite`,
            background:
              "radial-gradient(circle, rgba(255, 252, 240, 0.95) 0%, rgba(255, 248, 228, 0.55) 28%, rgba(255, 244, 220, 0) 68%)",
          }}
        />
      </span>
      <span
        className="absolute rounded-full"
        style={{
          left: 0,
          top: 0,
          width: em(0.85),
          height: em(0.85),
          translate: "-50% -50%",
          border: `calc(var(--mw) * 0.0019) solid #fffdf6`,
          boxShadow: `${outline}, inset ${outline}, ${halo}, 0 0 calc(var(--mw) * 0.006) rgba(255, 250, 235, 0.95)`,
          scale: on ? "1.15" : "1",
          transition: `scale 500ms ${EASE}`,
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          left: 0,
          top: 0,
          width: em(0.32),
          height: em(0.32),
          translate: "-50% -50%",
          background: "#fffdf6",
          boxShadow: `${outline}, 0 0 calc(var(--mw) * 0.003) rgba(255, 252, 240, 1)`,
        }}
      />
    </span>
  );
}

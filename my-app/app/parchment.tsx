// Shared look of the parchment pages (the discovery drawer and the books page), after the New World reference.
// Theme variables (globals.css), so the paper turns dark at night.
export const INK = "var(--paper-ink)";
export const PAPER = "var(--paper)";

// Flat paper with faint grain and a few soft blotches (no vignette, like the reference).
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.24 0 0 0 0 0.21 0 0 0 0 0.17 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.28'/></svg>\")";
export const PAPER_BG = `${GRAIN},
  radial-gradient(ellipse 22% 14% at 30% 18%, rgba(120, 104, 80, 0.05), transparent 70%),
  radial-gradient(ellipse 18% 12% at 82% 64%, rgba(120, 104, 80, 0.05), transparent 70%),
  radial-gradient(circle at 12% 88%, rgba(120, 104, 80, 0.04), transparent 18%),
  ${PAPER}`;

// Small spaced serif caps used for links such as BACK TO MAP.
export const linkClass =
  "flex min-h-11 items-center gap-3 font-[family-name:var(--font-cormorant)] text-[13px] font-semibold tracking-[0.18em] transition-opacity hover:opacity-60 focus:outline-none focus-visible:underline focus-visible:underline-offset-4";

// The reference's arrow: a thin shaft with a head on one end and fletching on the other.
export function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 44 12"
      className="h-3 w-11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ transform: dir === "right" ? "scaleX(-1)" : undefined }}
    >
      <path d="M3 6 H41" />
      <path d="M3 6 L9 2.5 L8 6 L9 9.5 Z" fill="currentColor" />
      <path d="M33 6 L37 2 M33 6 L37 10 M36.5 6 L40.5 2 M36.5 6 L40.5 10" />
    </svg>
  );
}

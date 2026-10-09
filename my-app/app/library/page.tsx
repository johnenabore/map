import type { Metadata } from "next";
import Link from "next/link";
import { Arrow, INK, linkClass, PAPER_BG } from "../parchment";

export const metadata: Metadata = {
  title: "Library — Protheka",
};

// Library: an empty parchment page for now, with a way back to the map.
export default function LibraryPage() {
  return (
    <main className="flex min-h-dvh flex-col" style={{ color: INK, background: PAPER_BG }}>
      <div className="flex justify-end px-5 pt-4 min-[900px]:px-12 min-[900px]:pt-12">
        <Link href="/" className={linkClass}>
          <span className="max-[380px]:hidden">BACK TO MAP</span>
          <Arrow dir="left" />
        </Link>
      </div>
      <h1 className="mt-6 text-center font-[family-name:var(--font-cormorant)] text-sm font-semibold tracking-[0.3em] opacity-70">
        LIBRARY
      </h1>
    </main>
  );
}

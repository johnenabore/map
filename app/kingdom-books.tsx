"use client";

import { useEffect, useRef, useState } from "react";
import { KINGDOMS } from "./kingdom-data";
import { Arrow, INK, linkClass, PAPER_BG } from "./parchment";

// Inside a kingdom: the page that will hold its books. For now it is a blank parchment page.
// It fades in as the flight's fade-to-black clears; `leaving` plays the fade-out before the parent unmounts it.
const EASE = "cubic-bezier(0.22, 0.8, 0.3, 1)";

export default function KingdomBooks({
  id,
  leaving,
  onBack,
}: {
  id: string;
  leaving: boolean;
  onBack: () => void;
}) {
  const kingdom = KINGDOMS.find((k) => k.id === id)!;
  const [shown, setShown] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    backRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [onBack]);

  const visible = shown && !leaving;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="books-title"
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        color: INK,
        background: PAPER_BG,
        opacity: visible ? 1 : 0,
        transition: `opacity ${leaving ? 500 : 600}ms ${EASE}`,
      }}
    >
      <div className="flex justify-end px-5 pt-4 min-[900px]:px-12 min-[900px]:pt-12">
        <button ref={backRef} type="button" onClick={onBack} className={linkClass}>
          <span className="max-[380px]:hidden">BACK TO MAP</span>
          <Arrow dir="left" />
        </button>
      </div>

      <div
        className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center"
        style={{
          transform: visible ? "none" : "translateY(12px)",
          transition: `transform 900ms ${EASE} 150ms`,
        }}
      >
        <p
          id="books-title"
          className="font-[family-name:var(--font-cormorant)] text-sm font-semibold tracking-[0.3em] opacity-70"
        >
          {kingdom.name.toUpperCase()}
        </p>
        <span className="mt-4 h-px w-[170px] bg-[var(--paper-rule)]" aria-hidden="true" />
        <h1 className="mt-6 font-[family-name:var(--font-cormorant)] text-[clamp(1.8rem,3vw,2.8rem)] font-medium">
          Your books here
        </h1>
      </div>
    </div>
  );
}

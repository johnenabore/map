"use client";

import { useEffect, useState } from "react";
import ParchmentDrawer, { OPEN_EASE } from "./parchment-drawer";

export type SitePage = "library" | "more";

const TABS: { id: "home" | SitePage; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "library", label: "Library" },
  { id: "more", label: "More" },
];

export default function PageDrawer({
  page,
  open,
  onBack,
  onSwitch,
}: {
  page: SitePage;
  open: boolean;
  onBack: () => void;
  onSwitch: (page: SitePage) => void;
}) {
  return (
    <ParchmentDrawer
      open={open}
      onBack={onBack}
      labelledBy="page-drawer-title"
      fullOnMobile
      nav={
        <nav aria-label="Pages" className="flex items-center gap-x-4 sm:gap-x-6">
          {TABS.map((t) => {
            const current = t.id === page;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={current ? "page" : undefined}
                onClick={() => (t.id === "home" ? onBack() : onSwitch(t.id))}
                className={`flex min-h-11 items-center font-[family-name:var(--font-cormorant)] text-[13px] font-semibold uppercase tracking-[0.18em] transition-opacity focus:outline-none focus-visible:underline focus-visible:underline-offset-4 ${
                  current ? "underline decoration-1 underline-offset-[6px]" : "opacity-60 hover:opacity-100"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      }
    >
      {(slidIn) => <PageContent page={page} open={open} slidIn={slidIn} />}
    </ParchmentDrawer>
  );
}

function PageContent({ page, open, slidIn }: { page: SitePage; open: boolean; slidIn: boolean }) {
  // The page on show lags `page` by a short fade, so switching tabs crossfades the content.
  const [shown, setShown] = useState(page);
  const [contentIn, setContentIn] = useState(false);

  useEffect(() => {
    if (!open || page !== shown) {
      const out = window.setTimeout(() => setContentIn(false), 0);
      const swap = open ? window.setTimeout(() => setShown(page), 260) : 0;
      return () => {
        clearTimeout(out);
        clearTimeout(swap);
      };
    }
    if (!slidIn) return;
    const t = window.setTimeout(() => setContentIn(true), 30);
    return () => clearTimeout(t);
  }, [page, shown, open, slidIn]);

  const rise = (delay: number): React.CSSProperties => ({
    opacity: contentIn ? 1 : 0,
    transform: contentIn ? "none" : "translateY(14px)",
    transition: contentIn
      ? `opacity 700ms ${OPEN_EASE} ${delay}ms, transform 700ms ${OPEN_EASE} ${delay}ms`
      : "opacity 200ms ease, transform 200ms ease",
  });

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-12 pt-10 text-center min-[900px]:pt-[14vh]">
      <h2
        id="page-drawer-title"
        className="font-[family-name:var(--font-cormorant)] text-[clamp(1.4rem,2vw,1.9rem)] font-medium tracking-[0.12em]"
        style={rise(250)}
      >
        {shown.toUpperCase()}
      </h2>
      <span className="mt-5 h-px w-[170px] bg-[var(--paper-rule)]" aria-hidden="true" style={rise(380)} />
    </div>
  );
}

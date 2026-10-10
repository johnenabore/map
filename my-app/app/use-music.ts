"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SRC = "/sound/bgmusic.mp3";
const VOLUME = 0.35;
const MUTED_KEY = "protheka:muted";
const LEAD_IN = 1.05; // seconds of silence at the start of the track, skipped the first time it plays
const START_FADE_MS = 1200;

export function useMusic() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const started = useRef(false);
  const mutedRef = useRef(false);
  const fadeRaf = useRef(0);
  const [muted, setMuted] = useState(false);

  // Ease the volume to `to` over `ms`; pause once it reaches silence.
  const fade = useCallback((to: number, ms: number) => {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(fadeRaf.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      a.volume = from + (to - from) * k * (2 - k); // ease-out: audible right away, settles gently
      if (k < 1) fadeRaf.current = requestAnimationFrame(step);
      else if (to === 0) a.pause();
    };
    fadeRaf.current = requestAnimationFrame(step);
  }, []);

  // The audio element, created once. Making it early lets the browser download the track during the intro, so it can
  // start the moment Explore is clicked instead of after a network wait.
  const element = useCallback(() => {
    if (!audio.current) {
      const a = new Audio(SRC);
      a.loop = true;
      a.preload = "auto";
      a.volume = 0;
      a.currentTime = LEAD_IN;
      audio.current = a;
    }
    return audio.current;
  }, []);

  const play = useCallback(
    (fadeMs: number) => {
      element()
        .play()
        .then(() => fade(VOLUME, fadeMs))
        .catch(() => {
          // blocked or unavailable: stay silent
        });
    },
    [element, fade],
  );

  // Restore the muted choice from the last visit.
  useEffect(() => {
    let saved = false;
    try {
      saved = window.localStorage.getItem(MUTED_KEY) === "1";
    } catch {
      // storage unavailable: not muted
    }
    mutedRef.current = saved;
    // Start downloading on the visitor's first interaction (a mouse move or touch, usually on the way to Explore),
    // or 5 s after the page has loaded: never during the first load, where it would compete with the map images.
    let fallback = 0;
    const events = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;
    const preload = () => {
      clearTimeout(fallback);
      events.forEach((ev) => window.removeEventListener(ev, preload));
      if (!mutedRef.current) element();
    };
    const arm = () => {
      fallback = window.setTimeout(preload, 5000);
    };
    if (!saved) {
      events.forEach((ev) => window.addEventListener(ev, preload, { once: true, passive: true }));
      if (document.readyState === "complete") arm();
      else window.addEventListener("load", arm, { once: true });
    }
    const t = window.setTimeout(() => setMuted(saved), 0);
    return () => {
      clearTimeout(t);
      clearTimeout(fallback);
      window.removeEventListener("load", arm);
      events.forEach((ev) => window.removeEventListener(ev, preload));
    };
  }, [element]);

  // Pause while the tab is in the background; pick up again on return.
  useEffect(() => {
    const onVisibility = () => {
      if (!started.current || mutedRef.current) return;
      if (document.hidden) fade(0, 300);
      else play(1200);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(fadeRaf.current);
      audio.current?.pause();
    };
  }, [fade, play]);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    if (!mutedRef.current) play(START_FADE_MS);
  }, [play]);

  const toggle = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try {
      window.localStorage.setItem(MUTED_KEY, next ? "1" : "0");
    } catch {
      // not remembered
    }
    if (next) fade(0, 600);
    else {
      started.current = true;
      play(1200);
    }
  }, [fade, play]);

  return { muted, start, toggle };
}

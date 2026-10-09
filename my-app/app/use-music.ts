"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Background music (public/sound/bgmusic.mp3), looping softly. Browsers only allow sound after the user interacts,
// so `start()` is called from the intro's Explore click; the music then fades in. `toggle()` mutes or unmutes with a
// short fade, and the choice is remembered. It pauses while the tab is hidden.
const SRC = "/sound/bgmusic.mp3";
const VOLUME = 0.35;
const MUTED_KEY = "protheka:muted";

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
      a.volume = from + (to - from) * k * k * (3 - 2 * k);
      if (k < 1) fadeRaf.current = requestAnimationFrame(step);
      else if (to === 0) a.pause();
    };
    fadeRaf.current = requestAnimationFrame(step);
  }, []);

  const play = useCallback(
    (fadeMs: number) => {
      if (!audio.current) {
        audio.current = new Audio(SRC);
        audio.current.loop = true;
        audio.current.preload = "auto";
        audio.current.volume = 0;
      }
      audio.current
        .play()
        .then(() => fade(VOLUME, fadeMs))
        .catch(() => {
          // blocked or unavailable: stay silent
        });
    },
    [fade],
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
    const t = window.setTimeout(() => setMuted(saved), 0);
    return () => clearTimeout(t);
  }, []);

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
    if (!mutedRef.current) play(3000);
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

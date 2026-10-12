"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import Clouds, { type CloudPart } from "./clouds";
import { KINGDOMS } from "./kingdom-data";
import MapHints from "./map-hints";
import MapNavbar from "./map-navbar";
import type { SitePage } from "./page-drawer";
import Intro, { DIVE_MS } from "./intro";
import Kingdoms from "./kingdoms";
import RegionLabels from "./region-labels";
import Birds from "./birds";
import CastleLights from "./castle-lights";
import Journey from "./journey";
import { SWEEP_MS } from "./sweep-timing";
import { holdGpuFrames } from "./gpu-ticker";
import { useMusic } from "./use-music";
import Sea from "./sea";
import SeaLife from "./sea-life";
import Terrain, { type CameraMove } from "./terrain";
import map from "../public/new-map.png";

// Loaded on first use (a click, the compass, the search or the theme toggle), so the first visit downloads and runs
// less JavaScript.
const KingdomDrawer = dynamic(() => import("./kingdom-drawer"));
const KingdomBooks = dynamic(() => import("./kingdom-books"));
const PageDrawer = dynamic(() => import("./page-drawer"));
const MapSearch = dynamic(() => import("./map-search"));
const ThemeSweep = dynamic(() => import("./theme-sweep"));

type Level = 1 | 2 | 3;

// scale: 1 = the map exactly covers the window. tilt/rot in degrees. haze: top fade 0-1.
const LEVELS: Record<Level, { scale: number; tilt: number; rot: number; haze: number }> = {
  1: { scale: 1, tilt: 0, rot: 0, haze: 0 },
  2: { scale: 1.5, tilt: 16, rot: 0, haze: 0.3 },
  3: { scale: 2, tilt: 30, rot: -6, haze: 0.5 },
};

const ASPECT = 1679 / 937;
const PERSPECTIVE = 1200;
const PARCHMENT = "var(--map-bg)"; // around the map and in the haze; darkens at night (globals.css)
const RUBBER = 0.35; // share of the drag that still moves the map past its limit
const RUBBER_MAX = 90; // screen px the map can be pulled past its limit
const EASE = "800ms cubic-bezier(0.22, 0.8, 0.3, 1)";
// --tilt/--rot (the camera's angles) are set on the label sheet only, with --cam-ease: each label eases its own
// transform to the new counter-rotation. With only transform (and opacity) transitions in play, a camera move can
// run entirely on the browser's compositor, which keeps it smooth on phones.
const TRANSITION = `transform ${EASE}`;
// Hovering a kingdom eases the camera in a little toward it, slower and softer than a level change.
const HOVER_EASE = "1400ms cubic-bezier(0.25, 0.1, 0.25, 1)";
const HOVER_TRANSITION = `transform ${HOVER_EASE}`;
// The intro starts at "altitude" (the map a little farther away) and dives down to the normal view.
const INTRO_ALTITUDE = 0.93;
const DIVE_EASE = `${DIVE_MS - 100}ms cubic-bezier(0.45, 0, 0.2, 1)`;
const DIVE_TRANSITION = `transform ${DIVE_EASE}`;
const HOVER_ZOOM = 1.06;
const HOVER_PULL = 0.12; // share of the way the camera moves toward the hovered kingdom
const HOVER_IN_MS = 80; // pause before a kingdom lights up
const HOVER_OUT_MS = 180; // grace before it lets go
// Entering a kingdom flies the camera to it before its books page opens; going back eases home softly.
const FLY_EASE = "1600ms cubic-bezier(0.65, 0, 0.35, 1)";
const FLY_TRANSITION = `transform ${FLY_EASE}`;
const FLY_TILT = 34;
const FLY_ROT = -4;
const CLICK_SLOP = 6; // px: a press that moves less than this is a click, not a drag
// While the discovery drawer is open, the camera frames the kingdom in the part of the screen the drawer leaves free.
// Like the reference, the map leans back and turns in-plane beside the paper.
const FOCUS_TILT = 38;
const FOCUS_ROT = -12;
const FOCUS_SCALE = 1.7;
const DRAWER_BREAKPOINT = 900; // px: below this the drawer is a bottom sheet

type Phase = "intro" | "map" | "drawer" | "page" | "flying" | "books" | "returning";
type Flash = "none" | "flare" | "black" | "clearing";

const LAST_BOOK_KEY = "protheka:lastBook";
const THEME_KEY = "protheka:theme";
const JOURNEY_KEY = "protheka:journey";
const JOURNEY_MAX = 16; // kingdoms kept on the trail (15 legs)
const PING_MS = 3200; // how long a kingdom found by search stays highlighted
const store = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // storage unavailable (private mode, blocked): the setting just isn't remembered
    }
  },
};

const STEP_COOLDOWN = 900; // ms: one wheel flick or pinch = one level step
const PINCH_IN = 1.2;
const PINCH_OUT = 0.83;

const rad = (deg: number) => (deg * Math.PI) / 180;

// Looping decorations paused during camera moves on phones (see render).
const DECOR = new Set(["window-flicker", "marker-breathe", "serpent-swim", "ship-rock", "bird-flap"]);

export default function MapViewer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const levelRef = useRef<Level>(1);
  const drag = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<number | null>(null);
  const lastStep = useRef(0);
  const [level, setLevel] = useState<Level>(1);
  const [hovered, setHovered] = useState<string | null>(null);
  // Hover offset (map-layer px), fixed when the hover starts so dragging still moves the map 1:1.
  const hover = useRef<{ id: string; dx: number; dy: number } | null>(null);
  // The hover ease moves the map under a still pointer, which makes the browser report enter/leave events.
  // Only accept a hover change once the pointer has really moved since the last one, so it can't loop.
  const movedSinceHover = useRef(true);
  // Click flight: the camera pose to fly to (overrides the level while set), the phase, and pending timers.
  const flight = useRef<{ id: string; scale: number; tilt: number; rot: number; x: number; y: number } | null>(null);
  const phaseRef = useRef<Phase>("intro");
  const timers = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [diving, setDiving] = useState(false);
  const [booksId, setBooksId] = useState<string | null>(null);
  const [booksLeaving, setBooksLeaving] = useState(false);
  const [part, setPart] = useState<CloudPart | null>(null);
  const [flash, setFlash] = useState<Flash>("none");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The site's pages (Library, More), opened from the compass fan in a parchment drawer over the map.
  const [sitePage, setSitePage] = useState<SitePage | null>(null);
  const [pageOpen, setPageOpen] = useState(false);
  // For the hints bar: has the user moved the map yet, and opened a kingdom?
  const [explored, setExplored] = useState(false);
  const [discovered, setDiscovered] = useState(false);
  // The navbar: the last book opened (to continue reading), and the day/night theme.
  const [lastBook, setLastBook] = useState<string | null>(null);
  const [night, setNight] = useState(true); // dark by default; a visitor's day choice is restored below
  // The 3D terrain (three.js) replaces the flat map image once it is ready; the image stays as the fallback.
  const [terrainOk, setTerrainOk] = useState(false);
  // Day/night change: the cloud sweep playing (and toward which theme), and the warm dusk/dawn veil it pulses.
  const [sweep, setSweep] = useState<"night" | "day" | null>(null);
  const sweeping = useRef(false);
  const horizonRef = useRef<HTMLDivElement>(null);
  // The journey trail: kingdoms in the order discovered; `journeyFresh` once one was added during this visit.
  const [journey, setJourney] = useState<string[]>([]);
  const [journeyFresh, setJourneyFresh] = useState(false);
  // Search panel (navbar magnifier or the / key); a kingdom found by search is highlighted for a moment.
  const [searchOpen, setSearchOpen] = useState(false);
  const pingTimer = useRef(0);
  // Background music: starts with the Explore click (browsers need a user gesture), muted from the navbar.
  const music = useMusic();
  // Set once the first load has settled: the map's WebGL clouds and sea start then, not while the page is loading
  // (they are under the intro's clouds at first anyway).
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const go = () => {
      setIdle(true);
      // Fetch the on-demand pieces in the background now, so the first kingdom tap or drawer doesn't wait for them.
      void import("./kingdom-drawer");
      void import("./kingdom-books");
      void import("./page-drawer");
      void import("./map-search");
      void import("./theme-sweep");
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(go, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(go, 800);
    return () => clearTimeout(t);
  }, []);
  // The search panel is only built the first time it is opened.
  const [searchUsed, setSearchUsed] = useState(false);
  if (searchOpen && !searchUsed) setSearchUsed(true);
  // The camera values last written to the page (see render), so unchanged ones are not written again.
  const written = useRef<Record<string, string>>({});
  // A touch device (phone, tablet): lighter rendering while the camera moves.
  const coarse = useRef(false);
  const movingTimer = useRef(0);
  const pausedDecor = useRef(new Set<Animation>());
  useEffect(() => {
    coarse.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  const render = useCallback((x: number, y: number, animate: boolean | "hover" | "fly" | "dive", soft = false) => {
    const layer = layerRef.current;
    if (!layer) return;
    const lv = LEVELS[levelRef.current];
    const f = flight.current;
    const tilt = f ? f.tilt : lv.tilt;
    const rot = f ? f.rot : lv.rot;
    const altitude = phaseRef.current === "intro" ? INTRO_ALTITUDE : 1;
    const scale = (f ? f.scale : lv.scale * (hover.current ? HOVER_ZOOM : 1)) * altitude;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const baseW = Math.max(vw, vh * ASPECT);
    const baseH = baseW / ASPECT;

    // Part of the map plane that is visible: tilt stretches it vertically, rotation widens it.
    const visH = vh / Math.cos(rad(tilt));
    const sin = Math.abs(Math.sin(rad(rot)));
    const cos = Math.abs(Math.cos(rad(rot)));
    // Perspective makes the far edge of the screen show less map width than the middle.
    const perspective = 1 + 0.7 * Math.sin(rad(tilt));
    const extentW = ((vw * cos + visH * sin) * perspective) / scale;
    const extentH = ((visH * cos + vw * sin) * (1 + 0.25 * Math.sin(rad(tilt)))) / scale;
    const maxX = Math.max(0, (baseW - extentW) / 2);
    const maxY = Math.max(0, (baseH - extentH) / 2);

    const limit = (v: number, max: number) => {
      const hard = Math.min(max, Math.max(-max, v));
      if (!soft) return hard;
      const over = v - hard;
      return hard + Math.sign(over) * Math.min(Math.abs(over) * RUBBER, RUBBER_MAX / scale);
    };
    offset.current = { x: limit(x, maxX), y: limit(y, maxY) };
    const h = hover.current;
    let shownX = h ? Math.min(maxX, Math.max(-maxX, offset.current.x + h.dx)) : offset.current.x;
    let shownY = h ? Math.min(maxY, Math.max(-maxY, offset.current.y + h.dy)) : offset.current.y;
    if (f) {
      // A clicked (or entered) kingdom is always framed where it was aimed, even near the map's edge: clamping here
      // would stop the camera short and leave edge kingdoms hidden under the drawer.
      shownX = f.x;
      shownY = f.y;
    }
    // Only write what changed: these variables are inherited by everything in the map, so each write makes the
    // browser restyle it all. While dragging, only the transform below changes.
    const css = written.current;
    const put = (el: HTMLElement, name: string, value: string) => {
      const key = `${name}@${el.id || "layer"}`;
      if (css[key] === value) return;
      css[key] = value;
      if (name === "width") el.style.width = value;
      else if (name === "transition") el.style.transition = value;
      else el.style.setProperty(name, value);
    };
    put(layer, "width", `${baseW}px`);
    put(layer, "--mw", `${baseW}px`);
    const ease = animate === "dive" ? DIVE_EASE : animate === "fly" ? FLY_EASE : animate === "hover" ? HOVER_EASE : EASE;
    put(
      layer,
      "transition",
      animate === "dive"
        ? DIVE_TRANSITION
        : animate === "fly"
          ? FLY_TRANSITION
          : animate === "hover"
            ? HOVER_TRANSITION
            : animate
              ? TRANSITION
              : "none",
    );
    const sheet = document.getElementById("label-sheet");
    if (sheet) {
      put(sheet, "--cam-ease", animate ? ease : "0ms");
      put(sheet, "--tilt", `${tilt}deg`);
      put(sheet, "--rot", `${rot}deg`);
    }
    // On phones, while the camera eases: pause the cloud and sea redraws (GPU) and the small looping decorations
    // (flickering windows, breathing markers, sea life, wing beats). The terrain redraws on the main thread during a
    // move, and every main-thread frame also restyles each running animation, which a phone feels. They pick up again
    // when the move ends.
    if (animate && animate !== "dive" && coarse.current) {
      const ms = Number.parseInt(ease, 10);
      holdGpuFrames(ms);
      for (const a of layer.getAnimations({ subtree: true })) {
        if (a instanceof CSSAnimation && DECOR.has(a.animationName) && a.playState === "running") {
          a.pause();
          pausedDecor.current.add(a);
        }
      }
      clearTimeout(movingTimer.current);
      movingTimer.current = window.setTimeout(() => {
        pausedDecor.current.forEach((a) => a.play());
        pausedDecor.current.clear();
      }, ms + 50);
    }
    const nav = document.getElementById("map-navbar");
    if (nav) {
      put(
        nav,
        "--map-ease",
        animate === "dive"
          ? DIVE_EASE
          : animate === "fly"
            ? FLY_EASE
            : animate === "hover"
              ? HOVER_EASE
              : animate
                ? EASE
                : "0ms",
      );
      put(nav, "--map-heading", `${((-shownX / baseW) * 360).toFixed(2)}`);
      put(nav, "--map-turn", `${rot}deg`);
    }
    const pose = `rotateX(${tilt}deg) rotateZ(${rot}deg) scale(${scale}) translate(${shownX}px, ${shownY}px)`;
    layer.style.transform = `translate(-50%, -50%) ${pose}`;
    layer.dispatchEvent(
      new CustomEvent<CameraMove>("camera", {
        detail: {
          ms: animate === "dive" ? DIVE_MS : animate === "fly" ? 1600 : animate === "hover" ? 1400 : animate ? 800 : 0,
          pose,
          width: baseW,
          height: baseH,
        },
      }),
    );
  }, []);

  // Hover a kingdom (or null): glow and label are driven by `hovered`; the camera eases in toward it.
  const changeHover = useCallback(
    (id: string | null) => {
      if (phaseRef.current !== "map") return; // the click sequence owns the camera
      if (drag.current || pointers.current.size > 1) return; // no hover changes mid-drag or mid-pinch
      if ((hover.current?.id ?? null) === id) return;
      if (!movedSinceHover.current) return;
      movedSinceHover.current = false;
      const k = id ? KINGDOMS.find((q) => q.id === id) : null;
      if (k) {
        const baseW = Math.max(window.innerWidth, window.innerHeight * ASPECT);
        const baseH = baseW / ASPECT;
        // Offset that would centre the kingdom; move a small share of the way there.
        const tx = -(k.centre[0] / 1679 - 0.5) * baseW;
        const ty = -(k.centre[1] / 937 - 0.5) * baseH;
        hover.current = {
          id: k.id,
          dx: (tx - offset.current.x) * HOVER_PULL,
          dy: (ty - offset.current.y) * HOVER_PULL,
        };
      } else {
        hover.current = null;
      }
      setHovered(k ? k.id : null);
      render(offset.current.x, offset.current.y, "hover");
    },
    [render],
  );

  const hoverTimer = useRef(0);
  const requestHover = useCallback(
    (id: string | null) => {
      clearTimeout(hoverTimer.current);
      if ((hover.current?.id ?? null) === id) return;
      hoverTimer.current = window.setTimeout(() => changeHover(id), id ? HOVER_IN_MS : HOVER_OUT_MS);
    },
    [changeHover],
  );
  const hoverNow = useCallback(
    (id: string | null) => {
      clearTimeout(hoverTimer.current);
      changeHover(id);
    },
    [changeHover],
  );
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const rememberBook = useCallback((id: string) => {
    setLastBook(id);
    store.set(LAST_BOOK_KEY, id);
  }, []);

  // Restore the last book, theme and journey from the previous visit.
  useEffect(() => {
    const book = store.get(LAST_BOOK_KEY);
    const theme = store.get(THEME_KEY);
    let trail: string[] = [];
    try {
      const saved: unknown = JSON.parse(store.get(JOURNEY_KEY) ?? "[]");
      if (Array.isArray(saved)) trail = saved.filter((id) => KINGDOMS.some((k) => k.id === id)).slice(-JOURNEY_MAX);
    } catch {
      // a damaged saved trail just starts over
    }
    const t = window.setTimeout(() => {
      if (book && KINGDOMS.some((k) => k.id === book)) setLastBook(book);
      if (theme === "day") setNight(false);
      if (trail.length) setJourney(trail);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-theme", night);
    if (night) document.documentElement.setAttribute("data-theme", "night");
  }, [night]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const goPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
    if (p !== "map") setSearchOpen(false); // the navbar (and its search) steps aside
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Enter a kingdom: fly the camera to it while the clouds part, flare and fade, then open its books page.
  const openKingdom = useCallback(
    (id: string) => {
      const k = KINGDOMS.find((q) => q.id === id);
      if (!k || (phaseRef.current !== "map" && phaseRef.current !== "drawer")) return;
      goPhase("flying");
      hover.current = null;
      setHovered(id);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setFlash("black");
        later(300, () => {
          setBooksId(id);
          rememberBook(id);
          goPhase("books");
          setFlash("clearing");
        });
        return;
      }
      const vw = window.innerWidth;
      const baseW = Math.max(vw, window.innerHeight * ASPECT);
      const baseH = baseW / ASPECT;
      const kingdomW = (k.size[0] / 1679) * baseW;
      flight.current = {
        id,
        scale: Math.min(3.2, Math.max(2, LEVELS[levelRef.current].scale, (0.55 * vw) / kingdomW)),
        tilt: FLY_TILT,
        rot: FLY_ROT,
        x: -(k.centre[0] / 1679 - 0.5) * baseW,
        y: -(k.centre[1] / 937 - 0.5) * baseH,
      };
      render(offset.current.x, offset.current.y, "fly");
      setPart({ x: k.centre[0], y: k.centre[1], open: false });
      later(200, () => setPart({ x: k.centre[0], y: k.centre[1], open: true }));
      later(1100, () => setFlash("flare"));
      later(1400, () => setFlash("black"));
      later(1750, () => {
        setBooksId(id);
        rememberBook(id);
        setBooksLeaving(false);
        goPhase("books");
        setFlash("clearing");
      });
      later(2600, () => setFlash("none"));
    },
    [goPhase, later, render, rememberBook],
  );

  // Back to Map from the books page: it fades out over the zoomed-in kingdom, then the camera eases home.
  const closeBooks = useCallback(() => {
    if (phaseRef.current !== "books") return;
    goPhase("returning");
    setBooksLeaving(true);
    later(500, () => {
      setBooksId(null);
      setBooksLeaving(false);
      setFlash("none");
      flight.current = null;
      setHovered(null);
      render(offset.current.x, offset.current.y, "hover");
      setPart((p) => (p ? { ...p, open: false } : p));
    });
    later(1900, () => {
      setPart(null);
      movedSinceHover.current = true;
      goPhase("map");
    });
  }, [goPhase, later, render]);

  // First click on a kingdom: frame it beside the discovery drawer (or above the bottom sheet on narrow screens).
  const focusKingdom = useCallback(
    (id: string) => {
      const k = KINGDOMS.find((q) => q.id === id);
      if (!k) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const baseW = Math.max(vw, vh * ASPECT);
      const baseH = baseW / ASPECT;
      const lv = LEVELS[levelRef.current];
      const scale = Math.max(FOCUS_SCALE, lv.scale);
      const wide = vw >= DRAWER_BREAKPOINT;
      // Offset that centres the kingdom, then shift it into the strip left of the paper (16% across, 52% down)
      // or above the bottom sheet (20% down). Screen shift -> map plane: undo the tilt, the turn and the zoom.
      const sx = wide ? (0.16 - 0.5) * vw : 0;
      const sy = ((wide ? 0.02 : 0.2 - 0.5) * vh) / Math.cos(rad(FOCUS_TILT));
      const c = Math.cos(rad(FOCUS_ROT));
      const sn = Math.sin(rad(FOCUS_ROT));
      flight.current = {
        id,
        scale,
        tilt: FOCUS_TILT,
        rot: FOCUS_ROT,
        x: -(k.centre[0] / 1679 - 0.5) * baseW + (sx * c + sy * sn) / scale,
        y: -(k.centre[1] / 937 - 0.5) * baseH + (-sx * sn + sy * c) / scale,
      };
      hover.current = null;
      setHovered(id);
      render(offset.current.x, offset.current.y, "hover");
    },
    [render],
  );

  const openDrawer = useCallback(
    (id: string) => {
      if (phaseRef.current === "drawer") {
        if (drawerId === id) return;
      } else if (phaseRef.current !== "map") {
        return;
      }
      goPhase("drawer");
      setDiscovered(true);
      // Extend the journey trail from the last kingdom discovered to this one.
      setJourney((j) => {
        if (j[j.length - 1] === id) return j;
        const next = [...j, id].slice(-JOURNEY_MAX);
        store.set(JOURNEY_KEY, JSON.stringify(next));
        return next;
      });
      setJourneyFresh(true);
      focusKingdom(id);
      setDrawerId(id);
      setDrawerOpen(true);
    },
    [drawerId, focusKingdom, goPhase],
  );

  // Back to Map: the drawer slides away and the camera eases back to where the user left it.
  const closeDrawer = useCallback(() => {
    if (phaseRef.current !== "drawer") return;
    setDrawerOpen(false);
    flight.current = null;
    setHovered(null);
    render(offset.current.x, offset.current.y, "hover");
    later(950, () => {
      setDrawerId(null);
      movedSinceHover.current = true;
      goPhase("map");
    });
  }, [goPhase, later, render]);

  // Enter Kingdom: the drawer slides away, then the cinematic flight into the kingdom begins.
  const enterFromDrawer = useCallback(() => {
    const id = drawerId;
    if (!id || phaseRef.current !== "drawer") return;
    setDrawerOpen(false);
    later(350, () => openKingdom(id));
    later(900, () => setDrawerId(null)); // after the paper has slid out
  }, [drawerId, later, openKingdom]);

  // The page title steps aside while the flight or the books page is up (see .site-title in globals.css).
  useEffect(() => {
    // The drawer keeps the title (it sits over the paper like the reference's logo).
    document.body.toggleAttribute("data-overlay", phase !== "map" && phase !== "drawer"); // the page drawer has its own tabs up there
  }, [phase]);

  // Explore: dive from altitude down to the map, then hand over to the normal map controls.
  const startMusic = music.start;
  const explore = useCallback(() => {
    if (phaseRef.current !== "intro") return;
    startMusic();
    setDiving(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    phaseRef.current = "returning"; // altitude off for the next render; input stays locked until done
    render(offset.current.x, offset.current.y, reduced ? false : "dive");
    later(reduced ? 450 : DIVE_MS, () => {
      setDiving(false);
      goPhase("map");
    });
  }, [goPhase, later, render, startMusic]);

  const openPage = useCallback(
    (page: SitePage) => {
      if (phaseRef.current !== "map" && phaseRef.current !== "page") return;
      goPhase("page");
      setSitePage(page);
      setPageOpen(true);
    },
    [goPhase],
  );

  const closePage = useCallback(() => {
    if (phaseRef.current !== "page") return;
    setPageOpen(false);
    later(950, () => {
      setSitePage(null);
      movedSinceHover.current = true;
      goPhase("map");
    });
  }, [goPhase, later]);

  // Day/night: clouds roll across the screen and the light changes while they cover the map, passing through a
  // warm dusk (or dawn) glow. With reduced motion the light simply crossfades.
  const toggleTheme = useCallback(() => {
    if (sweeping.current) return;
    const to = night ? "day" : "night";
    store.set(THEME_KEY, to);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNight(!night);
      return;
    }
    sweeping.current = true;
    setSweep(to);
    horizonRef.current?.animate([{ opacity: 0 }, { opacity: 0.4, offset: 0.45 }, { opacity: 0 }], {
      duration: SWEEP_MS + 900,
      easing: "ease-in-out",
    });
  }, [night]);
  const sweepMidpoint = useCallback(() => setNight(sweep === "night"), [sweep]);
  const sweepDone = useCallback(() => {
    sweeping.current = false;
    setSweep(null);
  }, []);

  // Search: fly the camera to the kingdom (at level II or closer), then light it up for a moment.
  const flyTo = useCallback(
    (id: string) => {
      const k = KINGDOMS.find((q) => q.id === id);
      if (!k || phaseRef.current !== "map") return;
      setSearchOpen(false);
      setExplored(true);
      const baseW = Math.max(window.innerWidth, window.innerHeight * ASPECT);
      const baseH = baseW / ASPECT;
      if (levelRef.current === 1) {
        levelRef.current = 2;
        setLevel(2);
      }
      hover.current = null;
      render(-(k.centre[0] / 1679 - 0.5) * baseW, -(k.centre[1] / 937 - 0.5) * baseH, "fly");
      setHovered(id);
      clearTimeout(pingTimer.current);
      pingTimer.current = window.setTimeout(() => {
        // Unless the user has since hovered something else, let the highlight go.
        if (!hover.current && phaseRef.current === "map") setHovered((h) => (h === id ? null : h));
      }, PING_MS);
    },
    [render],
  );
  useEffect(() => () => clearTimeout(pingTimer.current), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const changeLevel = useCallback(
    (next: Level) => {
      if (phaseRef.current !== "map") return;
      setExplored(true);
      levelRef.current = next;
      setLevel(next);
      render(offset.current.x, offset.current.y, true);
    },
    [render],
  );

  // Zooming moves between levels I and II; level III is only opened from the control or the 3 key.
  const zoomStep = useCallback(
    (dir: 1 | -1) => {
      const now = performance.now();
      if (now - lastStep.current < STEP_COOLDOWN) return;
      const current = levelRef.current;
      const next: Level = dir === 1 ? (current === 1 ? 2 : current) : (Math.max(1, current - 1) as Level);
      if (next === current) return;
      lastStep.current = now;
      changeLevel(next);
    },
    [changeLevel],
  );

  useEffect(() => {
    const viewer = viewerRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (phaseRef.current !== "map") return;
      if (Math.abs(e.deltaY) < 4) return;
      zoomStep(e.deltaY < 0 ? 1 : -1);
    };
    // React's onWheel is passive, so it can't stop the page from zooming/scrolling.
    viewer?.addEventListener("wheel", onWheel, { passive: false });
    const onResize = () => render(offset.current.x, offset.current.y, false);
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as Element | null)?.closest?.("input, textarea, [contenteditable='true']")) return; // typing
      if (e.key === "/" && phaseRef.current === "map") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        changeLevel(Number(e.key) as Level);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      viewer?.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [render, changeLevel, zoomStep]);

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    // A press that barely moved is a click: if it landed on a kingdom, open its discovery drawer.
    const d0 = drag.current;
    if (d0 && e.type === "pointerup" && Math.hypot(e.clientX - d0.pointerX, e.clientY - d0.pointerY) < CLICK_SLOP) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const id = el?.closest("[data-kingdom]")?.getAttribute("data-kingdom");
      if (id) {
        drag.current = null;
        pinchStart.current = null;
        openDrawer(id);
        return;
      }
    }
    if (phaseRef.current !== "map") {
      // With the drawer open the map is only clickable, not draggable.
      drag.current = null;
      return;
    }
    // Spring back if the map was pulled past its limit.
    const wasDragging = drag.current !== null;
    if (wasDragging) render(offset.current.x, offset.current.y, true);
    drag.current = null;
    if (pointers.current.size < 2) pinchStart.current = null;
    // Hover was frozen during the drag: pick up whatever kingdom is now under the pointer.
    if (wasDragging && e.pointerType !== "touch") {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      hoverNow(el?.closest("[data-kingdom]")?.getAttribute("data-kingdom") ?? null);
    }
  };

  return (
    <>
      <div
        ref={viewerRef}
        className="relative h-dvh w-full cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
        style={{ perspective: PERSPECTIVE, backgroundColor: PARCHMENT, transition: "background-color 900ms ease" }}
        onPointerDown={(e) => {
          // Map: drag, pinch or click. Drawer: clicks only (to switch kingdom). Otherwise: ignore.
          if (phaseRef.current !== "map" && phaseRef.current !== "drawer") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            // Second finger: stop panning and start measuring the pinch.
            drag.current = null;
            const [a, b] = [...pointers.current.values()];
            pinchStart.current = Math.hypot(a.x - b.x, a.y - b.y);
            return;
          }
          drag.current = {
            pointerX: e.clientX,
            pointerY: e.clientY,
            startX: offset.current.x,
            startY: offset.current.y,
          };
        }}
        onPointerMove={(e) => {
          if (e.movementX !== 0 || e.movementY !== 0) movedSinceHover.current = true;
          if (pointers.current.has(e.pointerId)) {
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          }
          if (pinchStart.current !== null && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.current;
            if (ratio > PINCH_IN || ratio < PINCH_OUT) {
              zoomStep(ratio > 1 ? 1 : -1);
              pinchStart.current = Math.hypot(a.x - b.x, a.y - b.y);
            }
            return;
          }
          const d = drag.current;
          if (!d || phaseRef.current !== "map") return;
          const { tilt, rot } = LEVELS[levelRef.current];
          const scale = LEVELS[levelRef.current].scale * (hover.current ? HOVER_ZOOM : 1);
          // Screen delta -> map-plane delta: undo the tilt, undo the rotation, undo the scale.
          const dx = e.clientX - d.pointerX;
          const dy = (e.clientY - d.pointerY) / Math.cos(rad(tilt));
          const cos = Math.cos(rad(rot));
          const sin = Math.sin(rad(rot));
          if (!explored && Math.hypot(e.clientX - d.pointerX, e.clientY - d.pointerY) >= CLICK_SLOP) setExplored(true);
          render(d.startX + (dx * cos + dy * sin) / scale, d.startY + (-dx * sin + dy * cos) / scale, false, true);
        }}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => {
          movedSinceHover.current = true; // leaving the map always clears the hover
          hoverNow(null);
        }}
      >
        <Terrain layerRef={layerRef} onReady={setTerrainOk} />
        <div
          ref={layerRef}
          className="absolute left-1/2 top-1/2"
          style={
            {
              width: "max(100vw, calc(100dvh * 1679 / 937))",
              "--mw": "max(100vw, calc(100dvh * 1679 / 937))",
              transform: "translate(-50%, -50%)",
              transformStyle: "preserve-3d",
            } as React.CSSProperties
          }
        >
          <Image
            src={map}
            alt="Map of Protheka"
            loading="eager"
            fetchPriority="high"
            // The map is as wide as the screen, or wider on tall screens (the layer is 179% of the height).
            sizes="(min-aspect-ratio: 1679/937) 100vw, 179vh"
            draggable={false}
            className="pointer-events-none h-auto w-full"
            style={{ visibility: terrainOk ? "hidden" : "visible" }}
          />
          {/* Painterly relief: soft upper-left light and lower-right shadow on the drawn trees and mountains,
              computed from the map's own ink (public/relief/relief.webp). The map art itself is untouched. */}
          {/* Loaded once the page is idle: it's subtle shading, under the intro's clouds at first, so the first paint
              doesn't wait for it. */}
          {idle && !terrainOk && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/relief/relief.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none"
            />
          )}
          {/* Sea life sits under the sea tint, so its paper patches take the same colour as the water */}
          <SeaLife />
          {idle && <Sea />}
          <Kingdoms hovered={hovered} onHover={requestHover} />
          {/* Night: the map dims to a moonlit blue-sepia. It sits just above the paper, sea and kingdom glows (2.5px)
              and under the location markers, labels and clouds, so those stay luminous like lights in the dark. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              transform: "translateZ(2.5px)",
              background: "radial-gradient(ellipse at center, #1f2840 0%, #1c2438 60%, #141a2a 100%)",
              opacity: night ? 0.55 : 0,
              transition: `opacity ${sweep ? 1600 : 900}ms ease`,
            }}
          />
          {/* Dusk (or dawn) glow, pulsed by the day/night change (toggleTheme) */}
          <div
            ref={horizonRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              transform: "translateZ(2.6px)",
              opacity: 0,
              background:
                sweep === "day"
                  ? "radial-gradient(ellipse 120% 90% at 20% 0%, rgba(255, 196, 160, 0.85), rgba(236, 150, 120, 0.55) 55%, rgba(150, 110, 140, 0.45))"
                  : "radial-gradient(ellipse 120% 90% at 85% 100%, rgba(232, 140, 50, 0.9), rgba(196, 96, 50, 0.6) 55%, rgba(110, 60, 70, 0.5))",
            }}
          />
          <CastleLights night={night} />
          <Journey stops={journey} fresh={journeyFresh} />
          <RegionLabels hovered={hovered} />
          <Birds active={phase === "map"} night={night} />
          {idle && <Clouds part={part} />}
        </div>

        {/* Haze toward the horizon on the tilted levels */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-[800ms]"
          style={{
            opacity: LEVELS[level].haze,
            background: `linear-gradient(to bottom, ${PARCHMENT} 0%, ${PARCHMENT} 12%, transparent 50%)`,
          }}
        />

        {/* The level control steps aside while the camera is flying or a kingdom is open */}
        <div
          style={{ opacity: phase === "map" ? 1 : 0, transition: "opacity 600ms ease" }}
          className={phase === "map" ? "" : "pointer-events-none"}
        >
          <LevelControl level={level} onChange={changeLevel} />
        </div>
      </div>

      <MapHints visible={phase === "map" && !searchOpen} done={explored && discovered} />

      {sweep && <ThemeSweep to={sweep} onMidpoint={sweepMidpoint} onDone={sweepDone} />}

      {searchUsed && <MapSearch open={searchOpen} onClose={closeSearch} onPick={flyTo} />}

      {phase === "intro" || diving ? <Intro diving={diving} onExplore={explore} /> : null}

      {sitePage && <PageDrawer page={sitePage} open={pageOpen} onBack={closePage} onSwitch={openPage} />}

      <MapNavbar
        onOpenPage={openPage}
        searchOpen={searchOpen}
        onSearch={() => setSearchOpen((o) => !o)}
        visible={phase === "map"}
        lastBook={lastBook}
        onContinue={() => lastBook && openKingdom(lastBook)}
        night={night}
        onToggleTheme={toggleTheme}
        muted={music.muted}
        onToggleSound={music.toggle}
      />

      {/* Outside the viewer: its perspective would trap these fixed, full-screen layers under the title */}
      {/* Cinematic transition: a warm flare over the kingdom, then a fade through black */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,236,190,0.95), rgba(255,200,120,0.35) 30%, transparent 65%)",
          opacity: flash === "flare" || flash === "black" ? 1 : 0,
          transition: "opacity 450ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background: "radial-gradient(circle at 50% 50%, #120d08 0%, #050302 70%)",
          opacity: flash === "black" ? 1 : 0,
          transition: flash === "clearing" ? "opacity 850ms ease-out" : "opacity 350ms ease-in",
        }}
      />

      {drawerId && <KingdomDrawer id={drawerId} open={drawerOpen} onBack={closeDrawer} onEnter={enterFromDrawer} />}

      {booksId && <KingdomBooks id={booksId} leaving={booksLeaving} onBack={closeBooks} />}
    </>
  );
}

const NUMERALS: Record<Level, string> = { 1: "I", 2: "II", 3: "III" };

function LevelControl({ level, onChange }: { level: Level; onChange: (level: Level) => void }) {
  return (
    <div
      className="absolute right-6 top-1/2 z-20 flex h-[26vh] min-h-40 -translate-y-1/2 gap-2"
      style={{
        color: "var(--map-ink)",
        // Two stacked glows so the ink stays readable over dense drawings (a dark halo at night).
        filter: "drop-shadow(0 0 2px var(--map-glow)) drop-shadow(0 0 7px var(--map-glow))",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Level labels, one per third of the rule, each with a small tick */}
      <div className="relative h-full w-10">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Zoom level ${n}`}
            aria-current={level === n}
            onClick={() => onChange(n)}
            className={`font-display absolute right-0 flex -translate-y-1/2 cursor-pointer items-center gap-1.5 text-[clamp(1rem,1.25vw,1.35rem)] leading-none tracking-widest [-webkit-text-stroke:4px_var(--map-glow)] [paint-order:stroke_fill] transition-opacity ${
              level === n ? "font-bold opacity-100" : "font-semibold opacity-80 hover:opacity-100"
            }`}
            style={{ top: `${((n - 1) * 2 + 1) * (100 / 6)}%` }}
          >
            {NUMERALS[n]}
            <span className="h-px w-1.5 bg-current" />
          </button>
        ))}
      </div>

      <Progress
        vertical
        value={(level / 3) * 100}
        aria-label="Zoom level"
        className="h-full w-1 flex-nowrap gap-0"
        trackClassName="bg-transparent before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-current before:opacity-70"
        indicatorClassName="bg-current duration-[800ms]"
        indicatorStyle={{
          height: `${100 / 3}%`,
          // % transforms use the marker's own height, so each step is exactly one third of the rule.
          transform: `translateY(${(level - 1) * 100}%)`,
        }}
      />
    </div>
  );
}

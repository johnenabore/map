"use client";

type Task = { every: number; phase: number; draw: (now: number) => void };

const SPAN = 12; // frames over which the load is balanced (a multiple of every `every` in use: 1, 2, 3, 4, 6)
const tasks = new Set<Task>();
const load = new Array<number>(SPAN).fill(0);
let frame = 0;
let raf = 0;
// While held (a camera move on a phone), nothing redraws and the layers' clock stands still, so the clouds and sea
// carry on from where they were afterwards instead of jumping ahead.
let holdUntil = 0;
let held = 0;
let last = 0;
let holding = false;

const wake = () => {
  if (!raf && tasks.size) raf = requestAnimationFrame(loop);
};

function loop(now: number) {
  const dt = last ? now - last : 0;
  last = now;
  if (now < holdUntil) {
    // Stop the loop until the hold ends: no frames at all, so the main thread stays idle during the move.
    held += dt;
    holding = true;
    raf = 0;
    window.setTimeout(wake, holdUntil - now);
    return;
  }
  if (holding) {
    held += dt; // the time spent stopped
    holding = false;
  }
  raf = tasks.size ? requestAnimationFrame(loop) : 0;
  const f = frame++ % SPAN;
  for (const t of tasks) if (f % t.every === t.phase) t.draw(now - held);
}

// Pause all redraws for `ms`.
export function holdGpuFrames(ms: number) {
  holdUntil = Math.max(holdUntil, performance.now() + ms);
}

// The layers' clock: real time minus time spent held. Use it for a layer's start time.
export const gpuNow = () => performance.now() - held;

export function onGpuFrame(every: number, draw: (now: number) => void) {
  let phase = 0;
  let best = Infinity;
  for (let p = 0; p < every; p++) {
    let worst = 0;
    for (let f = p; f < SPAN; f += every) worst = Math.max(worst, load[f]);
    if (worst < best) {
      best = worst;
      phase = p;
    }
  }
  for (let f = phase; f < SPAN; f += every) load[f]++;
  const task: Task = { every, phase, draw };
  tasks.add(task);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    if (!tasks.delete(task)) return;
    for (let f = phase; f < SPAN; f += every) load[f]--;
    if (!tasks.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

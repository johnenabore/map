"use client";

type Task = { every: number; phase: number; draw: (now: number) => void };

const SPAN = 12;
const tasks = new Set<Task>();
const load = new Array<number>(SPAN).fill(0);
let frame = 0;
let raf = 0;
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
  // While held, stop the loop entirely and freeze the layers' clock so nothing jumps afterwards.
  if (now < holdUntil) {
    held += dt;
    holding = true;
    raf = 0;
    window.setTimeout(wake, holdUntil - now);
    return;
  }
  if (holding) {
    held += dt;
    holding = false;
  }
  raf = tasks.size ? requestAnimationFrame(loop) : 0;
  const f = frame++ % SPAN;
  for (const t of tasks) if (f % t.every === t.phase) t.draw(now - held);
}

export function holdGpuFrames(ms: number) {
  holdUntil = Math.max(holdUntil, performance.now() + ms);
}

export const gpuNow = () => performance.now() - held;

// Gives each layer the least-loaded starting frame so layers take turns drawing.
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

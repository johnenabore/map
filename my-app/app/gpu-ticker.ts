"use client";

type Task = { every: number; phase: number; draw: (now: number) => void };

const SPAN = 12; // frames over which the load is balanced (a multiple of every `every` in use: 1, 2, 3, 4, 6)
const tasks = new Set<Task>();
const load = new Array<number>(SPAN).fill(0);
let frame = 0;
let raf = 0;

function loop(now: number) {
  raf = tasks.size ? requestAnimationFrame(loop) : 0;
  const f = frame++ % SPAN;
  for (const t of tasks) if (f % t.every === t.phase) t.draw(now);
}

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

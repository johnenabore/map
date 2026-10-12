"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { gpuNow, onGpuFrame } from "./gpu-ticker";

interface Layer {
  z: number;
  extent: number;
  res: readonly [number, number];
  scale: number;
  stretch: number;
  speed: number;
  cover: number;
  bank: number;
  opacity: number;
  shadow: number;
}

export const LAYERS = {
  low: {
    z: 50,
    extent: 1.8,
    res: [896, 504],
    scale: 2.4,
    stretch: 1,
    speed: 0.066,
    cover: 0.5,
    bank: 0.35,
    opacity: 0.72,
    shadow: 0.32,
  },
  high: {
    z: 300,
    extent: 1.8,
    res: [896, 504],
    scale: 3.6,
    stretch: 0.5,
    speed: 0.09,
    cover: 0.52,
    bank: 0.4,
    opacity: 0.55,
    shadow: 0,
  },
  wisps: {
    z: 240,
    extent: 1.8,
    res: [768, 432],
    scale: 1.4,
    stretch: 0.7,
    speed: 0.12,
    cover: 0.6,
    bank: 0.3,
    opacity: 0.35,
    shadow: 0,
  },
  introFar: {
    z: 0,
    extent: 1,
    res: [960, 540],
    scale: 1.6,
    stretch: 1,
    speed: 0.03,
    cover: 0.42,
    bank: 0.3,
    opacity: 0.75,
    shadow: 0,
  },
  introMid: {
    z: 0,
    extent: 1,
    res: [960, 540],
    scale: 2.4,
    stretch: 1,
    speed: 0.04,
    cover: 0.47,
    bank: 0.35,
    opacity: 0.7,
    shadow: 0,
  },
  introNear: {
    z: 0,
    extent: 1,
    res: [960, 540],
    scale: 1.2,
    stretch: 1,
    speed: 0.05,
    cover: 0.53,
    bank: 0.3,
    opacity: 0.6,
    shadow: 0,
  },
  sweep: {
    z: 0,
    extent: 1,
    res: [1152, 432],
    scale: 1.5,
    stretch: 0.8,
    speed: 0.06,
    cover: 0.3,
    bank: 0.25,
    opacity: 0.95,
    shadow: 0,
  },
} satisfies Record<string, Layer>;

const ASPECT = 1679 / 937;
const NIGHT_FADE_MS = 900; 

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform float uTime, uScale, uStretch, uSpeed, uCover, uBank, uOpacity, uShadow, uAspect, uSeed, uExtent, uDim;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p, float wind, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    sum += amp * noise(vec3(p.x - wind * 0.12 * float(i), p.yz));
    p = vec3(p.xy * 2.03 + vec2(17.0, 5.0), p.z * 1.7 + 3.0);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  float t = uTime;
  float wind = t * uSpeed;
  vec2 uv = (vUv - 0.5) * uExtent + 0.5;
  vec2 p = vec2(uv.x * uAspect * uStretch, uv.y) * uScale + uSeed;
  vec2 q = p - vec2(wind, 0.0);

  vec2 w = vec2(
    fbm(vec3(q * 0.8 + vec2(3.1, 1.7), t * 0.05), 0.0, 3),
    fbm(vec3(q * 0.8 + vec2(7.7, 9.2), t * 0.05 + 5.0), 0.0, 3));
  vec2 qw = q + (w - 0.5) * 1.5;

  vec2 uvA = vec2(uv.x * uAspect, uv.y);
  float bank = fbm(vec3(uvA * 1.1 + uSeed * 0.37 - vec2(wind / uScale * 0.35, 0.0), t * 0.02), 0.0, 3);
  float bankTerm = (bank - 0.5) * uBank;

  float tt = t * 0.06;
  float d = fbm(vec3(qw, tt), wind, 5) + bankTerm;
  float dens = smoothstep(uCover, uCover + 0.17, d);

  float dl = fbm(vec3(qw + vec2(-0.16, -0.22), tt), wind, 5) + bankTerm;
  float densL = smoothstep(uCover, uCover + 0.17, dl);
  float thick = smoothstep(uCover + 0.08, uCover + 0.5, d);
  float rim = clamp((dens - densL) * 2.0, 0.0, 1.0) * (1.0 - thick);
  float lit = clamp(0.74 - (densL - dens) * 2.8 - thick * 0.3 + rim * 0.35, 0.0, 1.0);
  vec3 col = mix(vec3(0.5, 0.45, 0.4), vec3(1.0, 0.99, 0.96), lit);

  float alpha = dens * uOpacity * (0.5 + 0.5 * smoothstep(uCover + 0.03, uCover + 0.28, d));
  vec4 cloud = vec4(col * alpha, alpha);

  vec4 shade = vec4(0.0);
  if (uShadow > 0.0) {
    float ds = fbm(vec3(qw + vec2(0.13, 0.2), tt), wind, 5) + bankTerm;
    float sa = smoothstep(uCover, uCover + 0.22, ds) * uShadow;
    shade = vec4(vec3(0.23, 0.17, 0.1) * sa, sa);
  }
  vec4 col4 = cloud + shade * (1.0 - alpha);
  float luma = dot(col4.rgb, vec3(0.2126, 0.7152, 0.0722));
  col4.rgb = mix(col4.rgb, mix(vec3(luma), col4.rgb, 0.6) * 0.42, uDim);
  gl_FragColor = col4;
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Cloud shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export interface CloudPart {
  x: number;
  y: number;
  open: boolean;
}

// A soft hole around the parted point, positioned in this canvas's own (larger) frame.
const partMask = (part: CloudPart | null | undefined, extent: number): React.CSSProperties => {
  if (!part) return {};
  const px = ((part.x / 1679 - 0.5) / extent + 0.5) * 100;
  const py = ((part.y / 937 - 0.5) / extent + 0.5) * 100;
  const mask = `radial-gradient(circle at ${px}% ${py}%, transparent var(--part), black calc(var(--part) * 1.9))`;
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    ["--part" as string]: part.open ? `${22 / extent}%` : "0%",
    transition: "--part 1200ms cubic-bezier(0.45, 0, 0.25, 1)",
  };
};

export function ShaderLayer({
  layer,
  seed,
  onFail,
  part,
  className = "",
  nightDim = false,
}: {
  layer: Layer;
  seed: number;
  onFail: () => void;
  part?: CloudPart | null;
  className?: string;
  nightDim?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl?.createProgram();
    if (!gl || !vs || !fs || !program) {
      onFail();
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onFail();
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string, value: number) => gl.uniform1f(gl.getUniformLocation(program, name), value);
    uniform("uScale", layer.scale);
    uniform("uStretch", layer.stretch);
    uniform("uSpeed", layer.speed);
    uniform("uCover", layer.cover);
    uniform("uBank", layer.bank);
    uniform("uOpacity", layer.opacity);
    uniform("uShadow", layer.shadow);
    uniform("uAspect", ASPECT);
    uniform("uExtent", layer.extent);
    uniform("uSeed", seed);
    const uTime = gl.getUniformLocation(program, "uTime");
    const uDim = gl.getUniformLocation(program, "uDim");

    gl.viewport(0, 0, layer.res[0], layer.res[1]);
    gl.clearColor(0, 0, 0, 0);

    const start = Math.random() * 200;
    const t0 = gpuNow();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isNight = () => nightDim && document.documentElement.getAttribute("data-theme") === "night";
    let dim = isNight() ? 1 : 0;
    let lastNow = t0;
    let drawn = false;
    const draw = (now: number) => {
      const target = isNight() ? 1 : 0;
      const step = (now - lastNow) / NIGHT_FADE_MS;
      lastNow = now;
      const before = dim;
      dim = target > dim ? Math.min(target, dim + step) : Math.max(target, dim - step);
      if (still && drawn && dim === before) return;
      drawn = true;
      // Night dimming happens in the shader; a CSS filter would re-filter the canvas every frame.
      gl.uniform1f(uDim, dim);
      gl.uniform1f(uTime, start + ((still ? t0 : now) - t0) / 1000);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    draw(t0);
    const stop = onGpuFrame(2, draw);

    return () => {
      stop();
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [layer, seed, onFail, nightDim]);

  return (
    <canvas
      ref={canvasRef}
      width={layer.res[0]}
      height={layer.res[1]}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{
        left: `${-(layer.extent - 1) * 50}%`,
        top: `${-(layer.extent - 1) * 50}%`,
        width: `${layer.extent * 100}%`,
        height: `${layer.extent * 100}%`,
        transform: layer.z ? `translateZ(${layer.z}px)` : undefined,
        ...partMask(part, layer.extent),
      }}
    />
  );
}

const TEXTURES = {
  shadow: { src: "/clouds/cloud-shadow.webp", opacity: 0.22, z: 2, drift: 220, offset: "1.2%, 2%" },
  low: { src: "/clouds/cloud-low.webp", opacity: 0.55, z: 30, drift: 220 },
  high: { src: "/clouds/cloud-high.webp", opacity: 0.4, z: 90, drift: 140, sway: 90 },
} as const;

function TextureLayer({
  src,
  opacity,
  z,
  drift,
  sway,
  offset,
}: {
  src: string;
  opacity: number;
  z: number;
  drift: number;
  sway?: number;
  offset?: string;
}) {
  return (
    <div
      className="map-cloud pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity, transform: `translateZ(${z}px)${offset ? ` translate(${offset})` : ""}` }}
      aria-hidden="true"
    >
      <div
        className={`absolute -inset-y-[3%] inset-x-0 ${sway ? "cloud-anim" : ""}`}
        style={sway ? { animation: `cloud-sway ${sway}s ease-in-out infinite` } : undefined}
      >
        <div
          className="cloud-anim absolute inset-y-0 left-0 w-[200%]"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: "50% 100%",
            backgroundRepeat: "repeat-x",
            animation: `cloud-drift ${drift}s linear infinite`,
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}

function Clouds({ part = null }: { part?: CloudPart | null }) {
  const [fallback, setFallback] = useState(false);
  const fail = useCallback(() => setFallback(true), []);

  if (fallback) {
    return (
      <>
        <TextureLayer {...TEXTURES.shadow} />
        <TextureLayer {...TEXTURES.low} />
        <TextureLayer {...TEXTURES.high} />
      </>
    );
  }
  return (
    <>
      <ShaderLayer layer={LAYERS.low} seed={11.3} onFail={fail} part={part} nightDim />
      <ShaderLayer layer={LAYERS.high} seed={47.9} onFail={fail} part={part} nightDim />
      <ShaderLayer layer={LAYERS.wisps} seed={83.1} onFail={fail} part={part} nightDim />
    </>
  );
}

export default memo(Clouds);

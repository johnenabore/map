"use client";

import { useEffect, useRef } from "react";

// A living sea, drawn by a WebGL shader over the map's water: a cool, slightly darker tint, slow wave ripples and
// a soft glow / foam line along the coasts so the islands stand out. Muted, so the map stays an old sepia chart.
// The shader reads /sea/sea-mask.png, baked from the map art: R = sea (soft edge), G = distance to the coast
// (0 at the coast, 1 at ~70 map px out), B = a slow blob field that varies the tint. Like the clouds, the canvas
// sits in the map's 3D layer (just above the paper), so it tilts, zooms and pans with the map.
const LOOK = {
  tint: [0.27, 0.36, 0.43], // cool blue-grey
  tintAmount: 0.24,
  shade: [0.2, 0.17, 0.14], // dark brown-grey, to sink the water a little below the land
  shadeAmount: 0.1,
  crest: [0.86, 0.9, 0.9], // ripple crests
  crestAmount: 0.12,
  foam: [0.97, 0.93, 0.82], // pale cream coast glow
  glowAmount: 0.34,
  foamAmount: 0.4,
  cycle: 38, // seconds for a ripple to travel one wavelength
} as const;

const SEA_Z = 2;
const RES_X = 1120;
const RES_Y = 630;
const FRAME_MS = 1000 / 24;
const ASPECT = 1679 / 937;
const MASK_URL = "/sea/sea-mask.png";

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // (0,0) = top-left of the map, like the mask
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMask;
uniform float uTime, uAspect, uCycle;
uniform vec3 uTint, uShade, uCrest, uFoam;
uniform float uTintAmount, uShadeAmount, uCrestAmount, uGlowAmount, uFoamAmount;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float sstep(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }

void main() {
  vec3 m = texture2D(uMask, vUv).rgb;
  float sea = m.r;
  if (sea < 0.01) { gl_FragColor = vec4(0.0); return; }
  float dist = m.g;           // 0 at the coast, 1 far out
  float blob = m.b;
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  float t = uTime / uCycle;

  // Long, soft wave bands drifting slowly, warped by noise so they are not regular.
  vec2 warp = vec2(noise(p * 6.0 + t * 2.0), noise(p * 6.0 + 9.0 - t * 2.0)) - 0.5;
  float w1 = sin((p.x * 5.0 + p.y * 9.0 + warp.x * 2.2) * 6.2832 - t * 6.2832);
  float w2 = sin((p.x * 8.0 - p.y * 6.0 + warp.y * 2.6) * 6.2832 + t * 6.2832 * 0.8);
  float ripple = (w1 * 0.55 + w2 * 0.45) * 0.5 + 0.5;
  float crest = sstep(0.72, 0.98, ripple);
  float calm = sstep(0.08, 0.4, dist);            // ripples fade out near the coast, where the foam is

  // Cool tint with slow variation, a slight dark shade, then the faint crests.
  float tintA = uTintAmount * (0.8 + 0.4 * blob) * sea;
  vec3 col = uTint * tintA;
  float a = tintA;
  float shA = uShadeAmount * (0.6 + 0.8 * (1.0 - blob)) * sea;
  col = col * (1.0 - shA) + uShade * shA; a = shA + a * (1.0 - shA);
  float crA = crest * calm * uCrestAmount * sea;
  col = col * (1.0 - crA) + uCrest * crA; a = crA + a * (1.0 - crA);

  // Coast glow: a pale band that breathes slowly, with a thin brighter foam line right at the shore.
  float breathe = 0.85 + 0.15 * sin(t * 6.2832 * 1.7 + noise(p * 9.0) * 6.2832);
  float glow = (1.0 - sstep(0.0, 0.16 * breathe, dist)) * uGlowAmount;
  float line = (1.0 - sstep(0.0, 0.035 * breathe, dist)) * uFoamAmount;
  float lap = 0.75 + 0.25 * noise(p * 40.0 + t * 14.0);   // the foam line flickers a little
  float fA = clamp(glow + line * lap, 0.0, 0.8) * sea;
  col = col * (1.0 - fA) + uFoam * fA; a = fA + a * (1.0 - fA);

  gl_FragColor = vec4(col, a);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Sea shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function Sea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // If WebGL or the mask is unavailable, nothing is drawn and the map simply looks as drawn.
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl?.createProgram();
    if (!gl || !vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    const loc = (name: string) => gl.getUniformLocation(program, name);
    let disposed = false;
    let raf = 0;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      // The mask is data, not colour: keep the browser from converting or premultiplying it.
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.uniform1i(loc("uMask"), 0);
      gl.uniform1f(loc("uAspect"), ASPECT);
      gl.uniform1f(loc("uCycle"), LOOK.cycle);
      gl.uniform3fv(loc("uTint"), LOOK.tint);
      gl.uniform3fv(loc("uShade"), LOOK.shade);
      gl.uniform3fv(loc("uCrest"), LOOK.crest);
      gl.uniform3fv(loc("uFoam"), LOOK.foam);
      gl.uniform1f(loc("uTintAmount"), LOOK.tintAmount);
      gl.uniform1f(loc("uShadeAmount"), LOOK.shadeAmount);
      gl.uniform1f(loc("uCrestAmount"), LOOK.crestAmount);
      gl.uniform1f(loc("uGlowAmount"), LOOK.glowAmount);
      gl.uniform1f(loc("uFoamAmount"), LOOK.foamAmount);
      gl.viewport(0, 0, RES_X, RES_Y);
      gl.clearColor(0, 0, 0, 0);

      const uTime = loc("uTime");
      const start = Math.random() * 100;
      const t0 = performance.now();
      const draw = (now: number) => {
        gl.uniform1f(uTime, start + (now - t0) / 1000);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        draw(t0); // one still frame
        return;
      }
      let last = 0;
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (now - last < FRAME_MS) return;
        last = now;
        draw(now);
      };
      raf = requestAnimationFrame(loop);
    };
    image.src = MASK_URL;

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={RES_X}
      height={RES_Y}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ transform: `translateZ(${SEA_Z}px)` }}
    />
  );
}

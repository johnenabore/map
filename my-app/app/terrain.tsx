"use client";

import { type RefObject, useEffect, useRef } from "react";

const MAP_W = 1679;
const MAP_H = 937;
const PERSPECTIVE = 1200; // must match the viewer's CSS perspective
const LIFT = 22; // height of the tallest peaks, in map pixels
const LIGHT = 0.15; // extra slope shading from the height map (the painted relief does most of it)

const VERTEX = `
uniform sampler2D uHeight;
uniform float uLift;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.y = -p.y; // CSS y points down
  p.z = texture2D(uHeight, uv).r * uLift; // toward the viewer
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = `
uniform sampler2D uMap;
uniform sampler2D uRelief;
uniform sampler2D uHeight;
uniform vec2 uTexel;
uniform float uLight;
varying vec2 vUv;
void main() {
  vec4 base = texture2D(uMap, vUv);
  vec4 relief = texture2D(uRelief, vUv);
  vec3 col = mix(base.rgb, relief.rgb, relief.a);
  // Gentle light from the upper-left from the height map's slope.
  float hl = texture2D(uHeight, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture2D(uHeight, vUv + vec2(uTexel.x, 0.0)).r;
  float hu = texture2D(uHeight, vUv - vec2(0.0, uTexel.y)).r;
  float hd = texture2D(uHeight, vUv + vec2(0.0, uTexel.y)).r;
  vec3 n = normalize(vec3(hl - hr, hu - hd, 0.12));
  float lit = dot(n, normalize(vec3(-1.0, -1.0, 1.2))) - 0.64;
  col *= 1.0 + lit * uLight * 2.0;
  // Everything stays in the images' own sRGB values, blended like the browser does for the flat map.
  gl_FragColor = vec4(col, 1.0);
}`;

export interface CameraMove {
  ms: number;
  pose: string; // the layer transform after its translate(-50%, -50%)
  width: number;
  height: number;
}

export default function Terrain({
  layerRef,
  onReady,
}: {
  layerRef: RefObject<HTMLDivElement | null>;
  onReady: (ok: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const THREE = await import("three");
        if (disposed) return;
        // No multisampling: it is costly on a full-screen canvas and the painted map has no hard edges to smooth.
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);

        const loader = new THREE.TextureLoader();
        const [map, relief, height] = await Promise.all(
          ["/new-map.png", "/relief/relief.png", "/terrain/height.png"].map((src) => loader.loadAsync(src)),
        );
        if (disposed) {
          renderer.dispose();
          return;
        }
        // No colour-space conversion: the shader blends raw sRGB values, exactly like the flat map in the page.
        // 4x anisotropy keeps the tilted map crisp; higher costs a lot of texture reads for no visible gain.
        map.anisotropy = relief.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

        const geometry = new THREE.PlaneGeometry(MAP_W, MAP_H, 420, 234);
        const material = new THREE.ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          uniforms: {
            uMap: { value: map },
            uRelief: { value: relief },
            uHeight: { value: height },
            uLift: { value: LIFT },
            uTexel: { value: new THREE.Vector2(1 / MAP_W, 1 / MAP_H) },
            uLight: { value: LIGHT },
          },
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;
        const scene = new THREE.Scene();
        scene.add(mesh);

        // Camera = the CSS viewer: points in viewer-centred CSS px (y down, z toward the viewer) project as
        // clip = (2d/vw·x, −2d/vh·y, −z, d − z), which is exactly CSS perspective with its origin at the centre.
        const camera = new THREE.Camera();
        const css = new THREE.Matrix4();
        const toLayer = new THREE.Matrix4();
        const toMap = new THREE.Matrix4();
        let lastKey = "";

        // The terrain only redraws while the camera moves. map-viewer.tsx fires a "camera" event on the layer each
        // time it changes the view (with how long the move lasts); in between, no frames run at all, so nothing
        // reads the page layout each frame.
        let awakeUntil = performance.now() + 1000;
        let direct: CameraMove | null = null; // the exact pose of an immediate move, when there is one
        const frame = (now: number) => {
          if (now > awakeUntil) {
            raf = 0;
            return;
          }
          raf = requestAnimationFrame(frame);
          const layer = layerRef.current;
          if (!layer) return;
          const vw = canvas.clientWidth;
          const vh = canvas.clientHeight;
          // An immediate move hands over its pose; an eased one is read from the page as it animates.
          const lw = direct ? direct.width : layer.offsetWidth;
          const lh = direct ? direct.height : layer.offsetHeight;
          const transform = direct
            ? `translate(${-lw / 2}px, ${-lh / 2}px) ${direct.pose}`
            : getComputedStyle(layer).transform;
          const key = `${transform}|${vw}|${vh}|${lw}|${lh}`;
          if (key === lastKey || !vw || !vh || !lw) return; // nothing moved: leave the GPU idle
          lastKey = key;

          const size = renderer.getSize(new THREE.Vector2());
          if (size.x !== vw || size.y !== vh) renderer.setSize(vw, vh, false);
          const d = PERSPECTIVE;
          camera.projectionMatrix.set((2 * d) / vw, 0, 0, 0, 0, (-2 * d) / vh, 0, 0, 0, 0, -1, 0, 0, 0, -1, d);
          camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

          css.fromArray(
            transform === "none" ? new DOMMatrix().toFloat32Array() : new DOMMatrix(transform).toFloat32Array(),
          );
          // The layer's top-left sits at the viewer centre and its transform origin is its own centre.
          toLayer.makeTranslation(lw / 2, lh / 2, 0);
          toMap.makeScale(lw / MAP_W, lw / MAP_W, lw / MAP_W);
          mesh.matrix.copy(toLayer).multiply(css).multiply(toMap);
          mesh.matrixWorld.copy(mesh.matrix);
          renderer.render(scene, camera);
        };

        const onLost = (e: Event) => {
          e.preventDefault();
          onReady(false);
        };
        const wake = (e: Event) => {
          const move = (e as CustomEvent<CameraMove | undefined>).detail;
          const ms = move?.ms ?? 0;
          direct = move && ms === 0 ? move : null;
          awakeUntil = Math.max(awakeUntil, performance.now() + ms + 200);
          if (!raf) raf = requestAnimationFrame(frame);
        };
        const layerEl = layerRef.current;
        layerEl?.addEventListener("camera", wake);
        window.addEventListener("resize", wake);
        canvas.addEventListener("webglcontextlost", onLost);
        raf = requestAnimationFrame(frame);
        onReady(true);

        cleanup = () => {
          cancelAnimationFrame(raf);
          layerEl?.removeEventListener("camera", wake);
          window.removeEventListener("resize", wake);
          canvas.removeEventListener("webglcontextlost", onLost);
          geometry.dispose();
          material.dispose();
          map.dispose();
          relief.dispose();
          height.dispose();
          renderer.dispose();
        };
      } catch (err) {
        console.warn("3D terrain unavailable, showing the flat map:", err);
        if (!disposed) onReady(false);
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [layerRef, onReady]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}

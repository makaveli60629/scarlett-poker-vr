// dissolve.js — Pixel-ish dissolve shader (Quest-friendly)
// Applies a dithered threshold dissolve based on world position + hash.

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

const vtx = /* glsl */`
  varying vec3 vPos;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const frag = /* glsl */`
  precision mediump float;
  varying vec3 vPos;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uColor;

  // Cheap hash
  float hash(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main(){
    // "Pixel" grid in UV-space + slight world wobble
    vec2 grid = floor((vUv + vPos.xz * 0.03) * 96.0) / 96.0;
    float n = hash(grid);

    // Progress goes 0 -> 1. Dissolve when noise below progress.
    float cut = uProgress;
    if (n < cut) discard;

    // Edge glow near threshold
    float edge = smoothstep(cut + 0.02, cut, n);
    vec3 col = mix(uColor, vec3(0.0), edge);
    float alpha = 1.0 - edge * 0.85;

    gl_FragColor = vec4(col, alpha);
  }
`;

export class Dissolve {
  constructor(object3d, opts = {}) {
    this.obj = object3d;
    this.done = false;
    this.start = performance.now();
    this.duration = opts.duration ?? 900; // ms

    const color = new THREE.Color(opts.color ?? 0xff1a1a);

    // Store original materials and swap with dissolve material per-mesh.
    this.original = new Map();
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
      },
      vertexShader: vtx,
      fragmentShader: frag,
    });

    object3d.traverse((n) => {
      if (n.isMesh) {
        this.original.set(n, n.material);
        n.material = this.material;
      }
    });
  }

  update() {
    if (this.done) return;
    const now = performance.now();
    const t = Math.min(1, (now - this.start) / this.duration);
    this.material.uniforms.uTime.value = now * 0.001;
    this.material.uniforms.uProgress.value = t;

    if (t >= 1) {
      this.done = true;
      // Caller removes object from scene; restore not needed.
    }
  }
}

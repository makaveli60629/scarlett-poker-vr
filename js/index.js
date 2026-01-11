// /js/index.js — XR-FIRST MASTER (fixes “VR is black even with probes”)

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

const L = window.ScarlettLog?.push || console.log;
const setMode = window.ScarlettLog?.setMode?.bind(window.ScarlettLog) || (() => {});

L("[index] runtime start ✅", "ok");
setMode("init");

const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.autoClear = true;

// HARD clear color (if you still see black, XR layer isn’t presenting)
renderer.setClearColor(0x2244ff, 1);

app.appendChild(renderer.domElement);

renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  L("[webgl] CONTEXT LOST ❌", "bad");
}, false);
renderer.domElement.addEventListener("webglcontextrestored", () => {
  L("[webgl] context restored ✅", "ok");
}, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2244ff);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 3000);
camera.position.set(0, 1.6, 3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// Lights (doesn’t matter for MeshBasic probes, but keep anyway)
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const headLamp = new THREE.PointLight(0xffffff, 2.7, 40);
camera.add(headLamp);

// Debug room
const debugRoot = new THREE.Group();
scene.add(debugRoot);
debugRoot.add(new THREE.GridHelper(30, 30));
const axes = new THREE.AxesHelper(2);
axes.position.y = 0.02;
debugRoot.add(axes);

// Probes (NO lighting needed)
const probeRoot = new THREE.Group();
player.add(probeRoot);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.6, 0.6),
  new THREE.MeshBasicMaterial({ color: 0xff00ff })
);
cube.position.set(0, 1.6, -2);
probeRoot.add(cube);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 24, 18),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
sphere.position.set(1.0, 1.2, -1.5);
probeRoot.add(sphere);

L("[index] probes + debug room installed ✅", "ok");

// VRButton
try {
  const btn = VRButton.createButton(renderer);
  const host = document.getElementById("vrSlot") || document.body;
  host.appendChild(btn);
  L("[index] VRButton appended ✅", "ok");
} catch (e) {
  L("[index] VRButton failed: " + (e?.message || e), "warn");
}

// Controllers + rays
function makeRay() {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0,0,-1)]);
  const m = new THREE.LineBasicMaterial({ color: 0x7fe7ff });
  const line = new THREE.Line(g, m);
  line.scale.z = 8;
  return line;
}
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  lasers: []
};
player.add(controllers.left);
player.add(controllers.right);
controllers.left.add(makeRay());
controllers.right.add(makeRay());
L("[index] controller rays installed ✅", "ok");

// Resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---- World build (keep, but it is NOT required to see probes) ----
let WorldLike = null;
let ctx = null;
let worldFrame = null;

async function loadWorld() {
  setMode("importing world");
  L("[index] importing ./world.js …");
  const mod = await import("./world.js");
  L("[index] world.js exports: " + Object.keys(mod).join(", "), "ok");
  WorldLike = mod.World || mod.HybridWorld || mod.default || null;
  if (!WorldLike) throw new Error("No usable world export found.");
  if (typeof WorldLike.build === "function") {
    if (typeof WorldLike.frame === "function") worldFrame = WorldLike.frame.bind(WorldLike);
    ctx = { THREE, scene, renderer, camera, player, controllers, log: console.log, BUILD: Date.now() };
    L("[index] calling world.build() …");
    await WorldLike.build(ctx);
    L("[index] world start ✅", "ok");
  } else {
    L("[index] world has no build() (skipping)", "warn");
  }
}
loadWorld().catch(e => {
  L("[index] world load FAIL ❌", "bad");
  L(String(e?.stack || e), "muted");
});

// ---- XR-FIRST loops ----
const clock = new THREE.Clock();
let elapsed = 0;

function tick() {
  const dt = clock.getDelta();
  elapsed += dt;

  // keep forcing clear color in case background doesn’t apply in XR
  renderer.setClearColor(0x2244ff, 1);

  if (worldFrame && ctx) {
    try { worldFrame(ctx, dt, elapsed); } catch {}
  }

  renderer.render(scene, camera);
}

// 2D loop (always runs when NOT in XR)
let rafId = 0;
function start2DLoop() {
  cancelAnimationFrame(rafId);
  const loop = () => {
    if (!renderer.xr.isPresenting) {
      tick();
      rafId = requestAnimationFrame(loop);
    }
  };
  loop();
}

// XR loop (ONLY when XR session starts)
function startXRLoop() {
  renderer.setAnimationLoop(() => tick());
}

renderer.xr.addEventListener("sessionstart", () => {
  L("[vr] sessionstart ✅ (switching to XR loop)", "ok");
  startXRLoop();
});
renderer.xr.addEventListener("sessionend", () => {
  L("[vr] sessionend (switching to 2D loop)", "warn");
  renderer.setAnimationLoop(null);
  start2DLoop();
});

start2DLoop();
L("[index] loops armed ✅ (2D now, XR on sessionstart)", "ok");

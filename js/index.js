// /js/index.js — MASTER XR Canvas-Only Mode (fixes “Quest VR black but code runs”)

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

const L = window.ScarlettLog?.push || console.log;

L("[index] runtime start ✅", "ok");
L(`[env] secureContext=${window.isSecureContext} ua=${navigator.userAgent}`, "ok");
L(`[env] navigator.xr=${!!navigator.xr}`, navigator.xr ? "ok" : "bad");

const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.autoClear = true;
renderer.setClearColor(0x2244ff, 1);

app.appendChild(renderer.domElement);

// Canvas must be top
Object.assign(renderer.domElement.style, {
  position: "fixed",
  inset: "0",
  width: "100%",
  height: "100%",
  zIndex: "2147483647",
  pointerEvents: "auto"
});

// Scene/camera/rig
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2244ff);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 3000);
camera.position.set(0, 1.6, 3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

// Failsafe lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
const headLamp = new THREE.PointLight(0xffffff, 2.7, 40);
camera.add(headLamp);

// Debug room + probes
scene.add(new THREE.GridHelper(30, 30));
const axes = new THREE.AxesHelper(2);
axes.position.y = 0.02;
scene.add(axes);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.6, 0.6),
  new THREE.MeshBasicMaterial({ color: 0xff00ff })
);
cube.position.set(0, 1.6, -2);
player.add(cube);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 24, 18),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
sphere.position.set(1.0, 1.2, -1.5);
player.add(sphere);

L("[index] probes installed ✅ (must be visible if canvas is visible)", "ok");

// Controllers rays
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

// --- UI host (2D only) ---
function ensureHost() {
  let host = document.getElementById("vrSlot");
  if (!host) {
    host = document.createElement("div");
    host.id = "vrSlot";
    document.body.appendChild(host);
  }
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "18px",
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    zIndex: "99999",
    pointerEvents: "auto"
  });
  return host;
}
const host = ensureHost();

try {
  const btn = VRButton.createButton(renderer);
  host.appendChild(btn);
  L("[index] VRButton appended ✅", "ok");
} catch (e) {
  L("[index] VRButton failed: " + (e?.message || e), "warn");
}

// -------- XR CANVAS-ONLY MODE --------
// In XR, hide EVERYTHING except canvas to prevent black overlays.
let saved = null;

function enterCanvasOnly() {
  if (saved) return;

  const bodyChildren = Array.from(document.body.children);
  saved = bodyChildren.map(el => ({
    el,
    display: el.style.display,
    visibility: el.style.visibility,
    pointerEvents: el.style.pointerEvents,
    zIndex: el.style.zIndex
  }));

  for (const el of bodyChildren) {
    if (el === renderer.domElement) continue;
    // hide all overlays (hud/log/vrSlot/etc.)
    el.style.display = "none";
  }

  // also neutralize body backgrounds that can appear as black panels
  document.body.style.background = "#000";
  document.documentElement.style.background = "#000";

  L("[xr] CANVAS-ONLY MODE ON ✅", "ok");
}

function exitCanvasOnly() {
  if (!saved) return;
  for (const s of saved) {
    s.el.style.display = s.display;
    s.el.style.visibility = s.visibility;
    s.el.style.pointerEvents = s.pointerEvents;
    s.el.style.zIndex = s.zIndex;
  }
  saved = null;
  L("[xr] CANVAS-ONLY MODE OFF", "warn");
}

renderer.xr.addEventListener("sessionstart", () => {
  L("[vr] renderer sessionstart ✅", "ok");
  enterCanvasOnly();
});
renderer.xr.addEventListener("sessionend", () => {
  L("[vr] renderer sessionend", "warn");
  exitCanvasOnly();
});

// Watchdog for presenting flips (in case events fail)
let lastPresenting = false;
setInterval(() => {
  const p = !!renderer.xr.isPresenting;
  if (p !== lastPresenting) {
    lastPresenting = p;
    L("[vr] presenting=" + p, p ? "ok" : "warn");
    if (p) enterCanvasOnly();
    else exitCanvasOnly();
  }
}, 250);

// Resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---- World build (keep it) ----
let WorldLike = null;
let ctx = null;
let worldFrame = null;

(async () => {
  try {
    L("[index] importing ./world.js …");
    const mod = await import("./world.js");
    L("[index] world.js exports: " + Object.keys(mod).join(", "), "ok");
    WorldLike = mod.World || mod.HybridWorld || mod.default || null;

    if (WorldLike?.frame) worldFrame = WorldLike.frame.bind(WorldLike);

    if (WorldLike?.build) {
      ctx = { THREE, scene, renderer, camera, player, controllers, log: console.log, BUILD: Date.now() };
      L("[index] calling world.build() …");
      await WorldLike.build(ctx);
      L("[index] world start ✅", "ok");
    } else {
      L("[index] world has no build()", "warn");
    }
  } catch (e) {
    L("[index] world load FAIL ❌", "bad");
    L(String(e?.stack || e), "muted");
  }
})();

// ---- Render loop (works in 2D and XR) ----
const clock = new THREE.Clock();
let elapsed = 0;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  elapsed += dt;

  renderer.setClearColor(0x2244ff, 1);

  if (worldFrame && ctx) {
    try { worldFrame(ctx, dt, elapsed); } catch {}
  }

  renderer.render(scene, camera);
});

L("[index] animation loop armed ✅", "ok");

// /js/index.js — FINAL MASTER
// ✅ Fixes Quest black screen: Canvas-only mode during XR
// ✅ Probes + grid always (diagnostic baseline)
// ✅ Controller rays always
// ✅ Auto-mounts world root/group if world builds off-scene
// ✅ Android touch dual-stick movement for diagnostics (disabled automatically in XR)

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { AndroidControls } from "./android_controls.js"; // <-- create this file (I gave it earlier)

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

L("[index] probes installed ✅", "ok");

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

// Android diagnostics controls (auto-disabled in XR)
let android = null;
try {
  android = AndroidControls.init({ renderer, player, camera, log: console.log });
} catch (e) {
  L("[android] controls not loaded (ok): " + (e?.message || e), "warn");
}

// UI host (2D only)
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

// Standard VRButton
try {
  const btn = VRButton.createButton(renderer);
  host.appendChild(btn);
  L("[index] VRButton appended ✅", "ok");
} catch (e) {
  L("[index] VRButton failed: " + (e?.message || e), "warn");
}

// -------- XR CANVAS-ONLY MODE --------
// Hide EVERYTHING except canvas during XR to prevent overlays causing black screen.
let saved = null;

function enterCanvasOnly() {
  if (saved) return;

  const bodyChildren = Array.from(document.body.children);
  saved = bodyChildren.map(el => ({
    el,
    display: el.style.display
  }));

  for (const el of bodyChildren) {
    if (el === renderer.domElement) continue;
    el.style.display = "none";
  }

  document.body.style.background = "#000";
  document.documentElement.style.background = "#000";

  L("[xr] CANVAS-ONLY MODE ON ✅", "ok");
}

function exitCanvasOnly() {
  if (!saved) return;
  for (const s of saved) s.el.style.display = s.display;
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

// Watchdog for presenting flips
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

// ---- World build + auto-mount ----
let WorldLike = null;
let ctx = null;
let worldFrame = null;

function tryAutoMountWorld(obj) {
  // Many worlds build into obj.group / obj.root / obj.world / obj.sceneRoot, etc.
  const candidates = [
    obj?.group,
    obj?.root,
    obj?.world,
    obj?.worldRoot,
    obj?.sceneRoot,
    obj?.container
  ].filter(Boolean);

  for (const c of candidates) {
    if (c && c.isObject3D) {
      if (!c.parent) {
        scene.add(c);
        L("[world] auto-mounted world root ✅", "ok");
      } else {
        L("[world] world root already parented ✅", "ok");
      }
      return true;
    }
  }

  return false;
}

(async () => {
  try {
    L("[index] importing ./world.js …");
    const mod = await import("./world.js");
    L("[index] world.js exports: " + Object.keys(mod).join(", "), "ok");
    WorldLike = mod.World || mod.HybridWorld || mod.default || null;
    if (!WorldLike) throw new Error("No usable world export found.");

    if (WorldLike.frame) worldFrame = WorldLike.frame.bind(WorldLike);

    if (WorldLike.build) {
      ctx = { THREE, scene, renderer, camera, player, controllers, log: console.log, BUILD: Date.now() };
      L("[index] calling world.build() …");
      await WorldLike.build(ctx);

      // attempt auto-mount if the world built off-scene
      const mounted = tryAutoMountWorld(WorldLike);
      if (!mounted) L("[world] no root/group found to auto-mount (ok)", "warn");

      L("[index] world start ✅", "ok");
    } else {
      L("[index] world has no build()", "warn");
    }
  } catch (e) {
    L("[index] world load FAIL ❌", "bad");
    L(String(e?.stack || e), "muted");
  }
})();

// ---- Render loop ----
const clock = new THREE.Clock();
let elapsed = 0;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  elapsed += dt;

  renderer.setClearColor(0x2244ff, 1);

  // Android move/look (only when not in XR; AndroidControls does that internally too)
  if (android && !renderer.xr.isPresenting) {
    try { android.update(dt); } catch {}
  }

  if (worldFrame && ctx) {
    try { worldFrame(ctx, dt, elapsed); } catch {}
  }

  renderer.render(scene, camera);
});

L("[index] animation loop armed ✅", "ok");

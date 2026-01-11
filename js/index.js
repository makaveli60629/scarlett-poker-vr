// /js/index.js — XR Session Guaranteed + Watchdog (Quest black / missing sessionstart)
// ✅ Manual ENTER VR button (direct requestSession + setSession)
// ✅ Poll watchdog for renderer.xr.isPresenting
// ✅ Still includes probes + debug room + controller rays
// ✅ XR loop starts when presenting (event OR watchdog)

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

const L = window.ScarlettLog?.push || console.log;
const setMode = window.ScarlettLog?.setMode?.bind(window.ScarlettLog) || (() => {});

L("[index] runtime start ✅", "ok");
setMode("init");

const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing");

L(`[env] secureContext=${window.isSecureContext} ua=${navigator.userAgent}`, "ok");
L(`[env] navigator.xr=${!!navigator.xr}`, navigator.xr ? "ok" : "bad");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.autoClear = true;
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

// Lights (extra safety)
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

// Probes (MeshBasic = must show if rendering)
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

// UI host for buttons
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

function makeBtn(text) {
  const b = document.createElement("button");
  b.textContent = text;
  Object.assign(b.style, {
    fontSize: "16px",
    padding: "12px 18px",
    borderRadius: "14px",
    border: "1px solid rgba(127,231,255,.35)",
    background: "rgba(0,0,0,.55)",
    color: "#7fe7ff",
    boxShadow: "0 12px 40px rgba(0,0,0,.45)",
    cursor: "pointer"
  });
  return b;
}

const host = ensureHost();

// Manual ENTER VR (this is the important part)
const enterVR = makeBtn("ENTER VR (MANUAL)");
host.appendChild(enterVR);

enterVR.onclick = async () => {
  try {
    L("[vr] manual enter pressed");
    if (!navigator.xr) throw new Error("navigator.xr missing");
    const supported = await navigator.xr.isSessionSupported?.("immersive-vr");
    L("[vr] isSessionSupported(immersive-vr)=" + supported, supported ? "ok" : "bad");
    if (!supported) throw new Error("immersive-vr not supported");

    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
    });

    L("[vr] requestSession ✅, calling renderer.xr.setSession() …", "ok");
    await renderer.xr.setSession(session);

    // log session events too (not just renderer)
    session.addEventListener("end", () => L("[vr] session end event", "warn"));
    L("[vr] renderer.xr.setSession ✅", "ok");
  } catch (e) {
    L("[vr] manual enter FAIL ❌", "bad");
    L(String(e?.stack || e), "muted");
    alert("ENTER VR failed: " + (e?.message || e));
  }
};

// Standard VRButton (still useful)
try {
  const btn = VRButton.createButton(renderer);
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

// ---- World build (keep) ----
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

  if (typeof WorldLike.frame === "function") worldFrame = WorldLike.frame.bind(WorldLike);
  if (typeof WorldLike.build === "function") {
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

// ---- XR-FIRST loops + watchdog ----
const clock = new THREE.Clock();
let elapsed = 0;

function tick() {
  const dt = clock.getDelta();
  elapsed += dt;

  renderer.setClearColor(0x2244ff, 1);

  if (worldFrame && ctx) {
    try { worldFrame(ctx, dt, elapsed); } catch {}
  }

  renderer.render(scene, camera);
}

// 2D loop
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

// XR loop
function startXRLoop() {
  renderer.setAnimationLoop(() => tick());
}

// Event-based switching (if it fires)
renderer.xr.addEventListener("sessionstart", () => {
  L("[vr] renderer sessionstart ✅", "ok");
  startXRLoop();
});
renderer.xr.addEventListener("sessionend", () => {
  L("[vr] renderer sessionend", "warn");
  renderer.setAnimationLoop(null);
  start2DLoop();
});

// WATCHDOG (works even if events don’t fire)
let lastPresenting = false;
setInterval(() => {
  const p = !!renderer.xr.isPresenting;
  if (p !== lastPresenting) {
    lastPresenting = p;
    L("[vr] presenting=" + p, p ? "ok" : "warn");
    if (p) startXRLoop();
    else {
      renderer.setAnimationLoop(null);
      start2DLoop();
    }
  }
}, 250);

start2DLoop();
L("[index] loops armed ✅ (2D now, XR on presenting)", "ok");

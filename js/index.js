// /js/index.js — ScarlettVR Prime Entry (FULL) v15.0
// SINGLE ENTRY • CORE XR + ANDROID DEV CONTROLS • BLACK-SCREEN GUARDS • DIAGNOSTICS
// ✅ Fixes “Quest XR black screen” by forcing: safety lights, non-transparent clear, safe spawn,
// ✅ Re-adds world on XR session start if it got lost,
// ✅ DOM Overlay is OPTIONAL + gated (won’t break XR if missing),
// ✅ Minimal dev HUD + log copy for Android debugging,
// ✅ No main.js, no duplicates.

const BUILD = "INDEX_FULL_v15_0";

const log = (...a) => console.log(`[index ${BUILD}]`, ...a);
const warn = (...a) => console.warn(`[index ${BUILD}]`, ...a);
const err = (...a) => console.error(`[index ${BUILD}]`, ...a);

// -----------------------------
// Imports (Three via CDN ESM)
// -----------------------------
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";
import { World } from "./world.js"; // must export { World } with create(ctx) returning { group } or { root/group }

// -----------------------------
// Globals
// -----------------------------
let renderer, scene, camera;
let playerRig = null;
let world = null;

const state = {
  isXR: false,
  last: performance.now(),
  dt: 0,
  keys: new Set(),
  touch: { forward: 0, strafe: 0, turn: 0 },
  moveSpeed: 2.0,
  turnSpeed: 1.6,
  debug: {
    cube: null,
    lastHud: 0,
    hudEl: null,
    hudVisible: true
  }
};

// -----------------------------
// Boot
// -----------------------------
boot().catch((e) => err("boot fatal", e));

async function boot() {
  log("runtime start ✅");
  log("href=", location.href);
  log("secureContext=", window.isSecureContext);
  log("ua=", navigator.userAgent);
  log("navigator.xr=", !!navigator.xr);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.02, 500);
  camera.position.set(0, 1.6, 2.0);

  // Player rig (camera parent)
  playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.position.set(0, 1.6, 2.0);
  playerRig.add(camera);
  scene.add(playerRig);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,                 // IMPORTANT: avoid XR alpha black surprises
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // IMPORTANT: non-transparent clear in XR
  renderer.setClearColor(0x000000, 1);
  renderer.autoClear = true;
  renderer.toneMappingExposure = 1.0;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // Safety lights (this is THE #1 fix for “XR black screen” on standard materials)
  ensureSafetyLights(scene);

  // Always-visible debug cube (proves XR render is working even if world is missing)
  state.debug.cube = makeDebugCube();
  scene.add(state.debug.cube);

  // Tiny origin axes for sanity
  scene.add(makeAxes(0.6));

  // Floor (prevents “floating in void”)
  scene.add(makeFloor());

  // Dev HUD (Android + desktop)
  initDevHud();

  // Input (keyboard + touch)
  wireKeyboard();
  wireTouchControls();

  // World load (kept resilient)
  await loadWorld();

  // XR Button + session hooks
  installXR();

  // Resize
  window.addEventListener("resize", onResize);
  onResize();

  // Animate
  renderer.setAnimationLoop(tick);
  log("animation loop ✅");
}

async function loadWorld() {
  try {
    log("world: loading…");

    const ctx = {
      THREE,
      scene,
      camera,
      renderer,
      playerRig,
      log,
      warn,
      err
    };

    // World module can be either:
    // 1) World.create(ctx) -> { group }
    // 2) World(ctx) -> { group }
    // 3) exports const World = { create() {} }
    let w = null;

    if (World?.create) w = await World.create(ctx);
    else if (typeof World === "function") w = await World(ctx);
    else throw new Error("World export not found. Ensure world.js exports { World } with create(ctx).");

    // normalize
    world = w || {};
    world.group = world.group || world.root || world.scene || world.world || null;

    if (!world.group) {
      warn("world: no group/root found — only debug cube + floor will show");
      return;
    }

    // Ensure in scene
    if (!scene.children.includes(world.group)) {
      scene.add(world.group);
      log("world: added to scene ✅");
    }

    log("world: ready ✅", { children: world.group.children?.length ?? "?" });
  } catch (e) {
    err("world: failed ❌", e);
    // leave debug cube + floor + lights so you can still see something in XR
  }
}

function installXR() {
  // Create VR button
  const vrBtn = VRButton.createButton(renderer, getSessionInit());
  vrBtn.style.position = "absolute";
  vrBtn.style.left = "10px";
  vrBtn.style.bottom = "10px";
  vrBtn.style.zIndex = 9999;
  document.body.appendChild(vrBtn);
  log("VRButton appended ✅");

  // XR session lifecycle
  renderer.xr.addEventListener("sessionstart", () => {
    state.isXR = true;
    log("XR sessionstart ✅", {
      sceneChildren: scene.children.length,
      hasWorld: !!(world?.group && scene.children.includes(world.group)),
      rigPos: playerRig?.position?.toArray?.()
    });

    // Force safe spawn (prevents “inside floor” / “inside geometry” black)
    if (playerRig) playerRig.position.set(0, 1.6, 2.0);

    // Re-attach world if XR path recreated/cleared it
    if (world?.group && !scene.children.includes(world.group)) {
      scene.add(world.group);
      log("XR: world re-added ✅");
    }

    // Guarantee lights still exist
    ensureSafetyLights(scene);

    // Put debug cube in front of user each XR entry
    if (state.debug.cube) state.debug.cube.position.set(0, 1.5, -1.0);
  });

  renderer.xr.addEventListener("sessionend", () => {
    state.isXR = false;
    log("XR sessionend ✅");
  });
}

// DOM Overlay is the #1 “maybe breaks XR” feature: gate it hard.
function getSessionInit() {
  const optionalFeatures = [
    "local-floor",
    "bounded-floor",
    "local",
    "viewer",
    "hand-tracking"
  ];

  // Optional DOM Overlay (ONLY if root exists)
  const root = document.getElementById("hudRoot");
  if (root) {
    optionalFeatures.push("dom-overlay");
    log("dom-overlay: enabled (hudRoot found) ✅");
    return { optionalFeatures, domOverlay: { root } };
  } else {
    log("dom-overlay: disabled (no hudRoot) ✅");
    return { optionalFeatures };
  }
}

// -----------------------------
// Render loop
// -----------------------------
function tick(t) {
  state.dt = Math.min((t - state.last) / 1000, 0.05);
  state.last = t;

  // Simple dev locomotion for non-XR + XR (rig movement)
  applyMovement(state.dt);

  // Debug cube slow pulse (proves loop runs)
  if (state.debug.cube) {
    state.debug.cube.rotation.y += 0.6 * state.dt;
    state.debug.cube.rotation.x += 0.25 * state.dt;
  }

  // Update HUD at ~6fps
  if (state.debug.hudEl && (t - state.debug.lastHud) > 160) {
    state.debug.lastHud = t;
    state.debug.hudEl.textContent = buildHudText();
  }

  renderer.render(scene, camera);
}

// -----------------------------
// Movement (keyboard + touch)
// -----------------------------
function applyMovement(dt) {
  if (!playerRig) return;

  // Keyboard
  const forward =
    (state.keys.has("KeyW") ? 1 : 0) +
    (state.keys.has("ArrowUp") ? 1 : 0) -
    (state.keys.has("KeyS") ? 1 : 0) -
    (state.keys.has("ArrowDown") ? 1 : 0);

  const strafe =
    (state.keys.has("KeyD") ? 1 : 0) +
    (state.keys.has("ArrowRight") ? 1 : 0) -
    (state.keys.has("KeyA") ? 1 : 0) -
    (state.keys.has("ArrowLeft") ? 1 : 0);

  const turn =
    (state.keys.has("KeyE") ? 1 : 0) -
    (state.keys.has("KeyQ") ? 1 : 0);

  // Touch (mobile)
  const f = forward + state.touch.forward;
  const s = strafe + state.touch.strafe;
  const r = turn + state.touch.turn;

  if (r !== 0) playerRig.rotation.y -= r * state.turnSpeed * dt;

  if (f !== 0 || s !== 0) {
    const speed = state.moveSpeed * dt;
    const dir = new THREE.Vector3(s, 0, -f);
    dir.normalize();

    // Move in rig-forward space
    const yaw = playerRig.rotation.y;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const dx = dir.x * cos - dir.z * sin;
    const dz = dir.x * sin + dir.z * cos;

    playerRig.position.x += dx * speed;
    playerRig.position.z += dz * speed;

    // keep above floor
    if (playerRig.position.y < 0.2) playerRig.position.y = 1.6;
  }
}

// -----------------------------
// Helpers (lights, debug, floor)
// -----------------------------
function ensureSafetyLights(scene) {
  const hasLight = scene.children.some((o) => o.isLight);
  if (hasLight) return;

  const amb = new THREE.AmbientLight(0xffffff, 0.7);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.8);
  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(3, 6, 3);
  dir.castShadow = false;

  scene.add(amb, hemi, dir);
  log("safety lights added ✅");
}

function makeDebugCube() {
  const g = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  const m = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  const cube = new THREE.Mesh(g, m);
  cube.name = "DebugCube";
  cube.position.set(0, 1.5, -1.0);
  return cube;
}

function makeAxes(size = 1) {
  const axes = new THREE.AxesHelper(size);
  axes.name = "AxesHelper";
  axes.position.set(0, 0.01, 0);
  return axes;
}

function makeFloor() {
  const g = new THREE.PlaneGeometry(50, 50);
  const m = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(g, m);
  floor.name = "Floor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  return floor;
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -----------------------------
// Dev HUD (Android friendly)
// -----------------------------
function initDevHud() {
  const hudRoot = document.createElement("div");
  hudRoot.id = "hudRoot"; // if you want dom-overlay later, keep this.
  hudRoot.style.position = "fixed";
  hudRoot.style.left = "0";
  hudRoot.style.top = "0";
  hudRoot.style.right = "0";
  hudRoot.style.zIndex = "99999";
  hudRoot.style.pointerEvents = "none";
  hudRoot.style.fontFamily = "monospace";
  hudRoot.style.fontSize = "12px";
  hudRoot.style.color = "#e7f0ff";
  hudRoot.style.textShadow = "0 1px 2px rgba(0,0,0,0.9)";
  document.body.appendChild(hudRoot);

  const panel = document.createElement("div");
  panel.style.pointerEvents = "auto";
  panel.style.margin = "8px";
  panel.style.padding = "8px";
  panel.style.maxWidth = "520px";
  panel.style.background = "rgba(0,0,0,0.55)";
  panel.style.border = "1px solid rgba(255,255,255,0.15)";
  panel.style.borderRadius = "10px";
  hudRoot.appendChild(panel);

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.flexWrap = "wrap";
  row.style.marginBottom = "6px";
  panel.appendChild(row);

  const btn = (label, onClick) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.pointerEvents = "auto";
    b.style.padding = "6px 10px";
    b.style.borderRadius = "10px";
    b.style.border = "1px solid rgba(255,255,255,0.2)";
    b.style.background = "rgba(20,30,45,0.8)";
    b.style.color = "#e7f0ff";
    b.onclick = onClick;
    row.appendChild(b);
    return b;
  };

  btn("HUD Hide/Show", () => {
    state.debug.hudVisible = !state.debug.hudVisible;
    panel.style.display = state.debug.hudVisible ? "block" : "none";
  });

  btn("Re-Add World", () => {
    if (world?.group && !scene.children.includes(world.group)) {
      scene.add(world.group);
      log("manual: world re-added ✅");
    } else {
      warn("manual: world missing or already attached");
    }
  });

  btn("Safety Lights", () => ensureSafetyLights(scene));

  btn("Safe Spawn", () => {
    if (playerRig) playerRig.position.set(0, 1.6, 2.0);
    log("manual: safe spawn ✅");
  });

  btn("Copy Logs", async () => {
    try {
      const text = collectConsoleHint();
      await navigator.clipboard.writeText(text);
      log("logs copied ✅");
    } catch (e) {
      warn("clipboard blocked (ok).", e);
      alert("Clipboard blocked. Open DevTools console and copy logs manually.");
    }
  });

  const pre = document.createElement("pre");
  pre.style.margin = "0";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.userSelect = "text";
  panel.appendChild(pre);

  state.debug.hudEl = pre;

  log("dev HUD ready ✅");
}

function buildHudText() {
  const rig = playerRig?.position ? playerRig.position : { x: 0, y: 0, z: 0 };
  const hasWorld = !!(world?.group && scene.children.includes(world.group));
  const hasLight = scene.children.some((o) => o.isLight);

  return [
    `BUILD: ${BUILD}`,
    `XR: ${state.isXR ? "YES" : "no"}  |  XR available: ${!!navigator.xr}`,
    `Scene children: ${scene?.children?.length ?? "?"}  |  Lights: ${hasLight ? "YES" : "NO"}`,
    `World: ${hasWorld ? "attached ✅" : (world?.group ? "detached ⚠️" : "none ❌")}`,
    `Rig: x=${rig.x.toFixed(2)} y=${rig.y.toFixed(2)} z=${rig.z.toFixed(2)}`,
    `Clear: alpha=false, clearColor=black(1.0)`,
    `Tip: If Quest is black, ensure you can see the MAGENTA CUBE. If you can, world/materials/lights/spawn are the issue.`
  ].join("\n");
}

// Minimal “copy logs” helper (not real console scraping — gives quick state summary)
function collectConsoleHint() {
  const rig = playerRig?.position ? playerRig.position.toArray() : null;
  return [
    `BUILD=${BUILD}`,
    `href=${location.href}`,
    `secureContext=${window.isSecureContext}`,
    `ua=${navigator.userAgent}`,
    `navigator.xr=${!!navigator.xr}`,
    `isXR=${state.isXR}`,
    `sceneChildren=${scene?.children?.length ?? "?"}`,
    `hasWorld=${!!(world?.group && scene.children.includes(world.group))}`,
    `rig=${rig ? JSON.stringify(rig) : "null"}`
  ].join("\n");
}

// -----------------------------
// Input wiring
// -----------------------------
function wireKeyboard() {
  window.addEventListener("keydown", (e) => state.keys.add(e.code));
  window.addEventListener("keyup", (e) => state.keys.delete(e.code));
  log("keyboard controls ✅ (WASD/Arrows move, Q/E turn)");
}

function wireTouchControls() {
  // Simple 4-corner touch pads for mobile
  const pad = document.createElement("div");
  pad.style.position = "fixed";
  pad.style.left = "0";
  pad.style.bottom = "0";
  pad.style.right = "0";
  pad.style.height = "35vh";
  pad.style.pointerEvents = "none";
  pad.style.zIndex = "99998";
  document.body.appendChild(pad);

  const mk = (x, label) => {
    const d = document.createElement("div");
    d.textContent = label;
    d.style.position = "absolute";
    d.style.bottom = "10px";
    d.style.left = x;
    d.style.width = "22vw";
    d.style.height = "22vw";
    d.style.maxWidth = "120px";
    d.style.maxHeight = "120px";
    d.style.borderRadius = "18px";
    d.style.display = "flex";
    d.style.alignItems = "center";
    d.style.justifyContent = "center";
    d.style.background = "rgba(0,0,0,0.25)";
    d.style.border = "1px solid rgba(255,255,255,0.15)";
    d.style.color = "rgba(255,255,255,0.75)";
    d.style.fontFamily = "monospace";
    d.style.pointerEvents = "auto";
    d.style.userSelect = "none";
    pad.appendChild(d);
    return d;
  };

  const fwd = mk("8vw", "FWD");
  const back = mk("34vw", "BACK");
  const left = mk("60vw", "LEFT");
  const right = mk("86vw", "RIGHT");

  const bindHold = (el, onDown, onUp) => {
    const down = (e) => { e.preventDefault(); onDown(); };
    const up = (e) => { e.preventDefault(); onUp(); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  };

  bindHold(fwd, () => (state.touch.forward = 1), () => (state.touch.forward = 0));
  bindHold(back, () => (state.touch.forward = -1), () => (state.touch.forward = 0));
  bindHold(left, () => (state.touch.strafe = -1), () => (state.touch.strafe = 0));
  bindHold(right, () => (state.touch.strafe = 1), () => (state.touch.strafe = 0));

  // Two-finger drag anywhere = turn (basic)
  let turning = false;
  let lastX = 0;

  window.addEventListener("touchstart", (e) => {
    if (e.touches.length >= 2) {
      turning = true;
      lastX = e.touches[0].clientX;
    }
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    if (!turning || e.touches.length < 2) return;
    e.preventDefault();
    const x = e.touches[0].clientX;
    const dx = x - lastX;
    lastX = x;
    state.touch.turn = Math.max(-1, Math.min(1, dx / 60));
  }, { passive: false });

  window.addEventListener("touchend", () => {
    turning = false;
    state.touch.turn = 0;
  });

  log("touch controls ✅");
      }

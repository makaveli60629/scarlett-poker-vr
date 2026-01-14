// /js/index.js — ScarlettVR Prime Entry (FULL) v15.2
// SINGLE ENTRY • CORE XR + ANDROID DEV CONTROLS • WORLD IMPORT PROBE • DIAGNOSTICS
// ✅ Fixes “Quest XR black screen” guards
// ✅ Adds HARD PROBE for world.js import/export/runtime errors (shows on HUD)
// ✅ No main.js

const BUILD = "INDEX_FULL_v15_2";

const log = (...a) => console.log(`[index ${BUILD}]`, ...a);
const warn = (...a) => console.warn(`[index ${BUILD}]`, ...a);
const err = (...a) => console.error(`[index ${BUILD}]`, ...a);

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "./VRButton.js";

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

boot().catch((e) => err("boot fatal", e));

async function boot() {
  log("runtime start ✅ build=", BUILD);
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

  // Player rig
  playerRig = new THREE.Group();
  playerRig.name = "PlayerRig";
  playerRig.position.set(0, 1.6, 2.0);
  playerRig.add(camera);
  scene.add(playerRig);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false, // IMPORTANT: avoid XR alpha black issues
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.setClearColor(0x000000, 1);
  renderer.autoClear = true;
  renderer.toneMappingExposure = 1.0;

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  ensureSafetyLights(scene);

  // Debug cube (always visible if render works)
  state.debug.cube = makeDebugCube();
  scene.add(state.debug.cube);

  scene.add(new THREE.AxesHelper(0.6));

  // Basic floor (so you always see *something*)
  scene.add(makeFloor());

  // HUD + controls
  initDevHud();
  wireKeyboard();
  wireTouchControls();

  // ✅ WORLD LOAD (PROBE)
  await loadWorld_PROBE();

  // XR
  installXR();

  window.addEventListener("resize", onResize);
  onResize();

  renderer.setAnimationLoop(tick);
  log("animation loop ✅");
}

// ============================================================================
// WORLD LOAD — HARD PROBE (prints exact reason hasWorld=false)
// ============================================================================
async function loadWorld_PROBE() {
  try {
    log("world: loading (probe)…");

    // Dynamic import with cache-bust so GitHub Pages cache can’t lie
    const mod = await import(`./world.js?v=${Date.now()}`);

    log("world: module keys=", Object.keys(mod));

    // Support multiple export styles
    const W = mod.World || mod.default || mod.world || null;
    if (!W) {
      throw new Error("world.js loaded but no export found. Expected: export const World = {...} or default export.");
    }

    // Call World.create(ctx) OR World(ctx)
    const ctx = { THREE, scene, camera, renderer, playerRig, log, warn, err };

    let w = null;
    if (typeof W.create === "function") {
      w = await W.create(ctx);
      log("world: create(ctx) returned ✅");
    } else if (typeof W === "function") {
      w = await W(ctx);
      log("world: function(ctx) returned ✅");
    } else {
      throw new Error("World export exists, but has no create(ctx) and is not callable.");
    }

    world = w || {};
    world.group = world.group || world.root || world.scene || world.world || null;

    if (!world.group) {
      throw new Error("World returned but no group/root/scene found. Return { group } from create(ctx).");
    }

    // Attach
    if (!scene.children.includes(world.group)) {
      scene.add(world.group);
    }

    log("world: added to scene ✅", { worldChildren: world.group.children?.length ?? "?" });

    // Update HUD line immediately
    if (state.debug.hudEl) state.debug.hudEl.textContent = buildHudText();

  } catch (e) {
    err("world: failed ❌", e);
    showHudError(`WORLD LOAD FAILED:\n${e?.message || e}\n\nOpen console for stack.`);
  }
}

// ============================================================================
// XR
// ============================================================================
function installXR() {
  const vrBtn = VRButton.createButton(renderer, getSessionInit());
  vrBtn.style.position = "absolute";
  vrBtn.style.left = "10px";
  vrBtn.style.bottom = "10px";
  vrBtn.style.zIndex = 9999;
  document.body.appendChild(vrBtn);
  log("VRButton appended ✅");

  renderer.xr.addEventListener("sessionstart", () => {
    state.isXR = true;
    log("XR sessionstart ✅", {
      sceneChildren: scene.children.length,
      hasWorld: !!(world?.group && scene.children.includes(world.group)),
      rigPos: playerRig?.position?.toArray?.()
    });

    // Safe spawn
    if (playerRig) playerRig.position.set(0, 1.6, 2.0);

    // Reattach world if needed
    if (world?.group && !scene.children.includes(world.group)) {
      scene.add(world.group);
      log("XR: world re-added ✅");
    }

    ensureSafetyLights(scene);

    if (state.debug.cube) state.debug.cube.position.set(0, 1.5, -1.0);
  });

  renderer.xr.addEventListener("sessionend", () => {
    state.isXR = false;
    log("XR sessionend ✅");
  });
}

function getSessionInit() {
  const optionalFeatures = ["local-floor", "bounded-floor", "local", "viewer", "hand-tracking"];

  // Only enable dom-overlay if hudRoot exists AND you decide to use it later.
  // For now: we DO NOT request dom-overlay to avoid XR issues.
  return { optionalFeatures };
}

// ============================================================================
// LOOP
// ============================================================================
function tick(t) {
  state.dt = Math.min((t - state.last) / 1000, 0.05);
  state.last = t;

  applyMovement(state.dt);

  if (state.debug.cube) {
    state.debug.cube.rotation.y += 0.6 * state.dt;
    state.debug.cube.rotation.x += 0.25 * state.dt;
  }

  if (state.debug.hudEl && (t - state.debug.lastHud) > 160) {
    state.debug.lastHud = t;
    state.debug.hudEl.textContent = buildHudText();
  }

  renderer.render(scene, camera);
}

// ============================================================================
// MOVEMENT
// ============================================================================
function applyMovement(dt) {
  if (!playerRig) return;

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

  const turn = (state.keys.has("KeyE") ? 1 : 0) - (state.keys.has("KeyQ") ? 1 : 0);

  const f = forward + state.touch.forward;
  const s = strafe + state.touch.strafe;
  const r = turn + state.touch.turn;

  if (r !== 0) playerRig.rotation.y -= r * state.turnSpeed * dt;

  if (f !== 0 || s !== 0) {
    const speed = state.moveSpeed * dt;
    const dir = new THREE.Vector3(s, 0, -f);
    dir.normalize();

    const yaw = playerRig.rotation.y;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const dx = dir.x * cos - dir.z * sin;
    const dz = dir.x * sin + dir.z * cos;

    playerRig.position.x += dx * speed;
    playerRig.position.z += dz * speed;

    if (playerRig.position.y < 0.2) playerRig.position.y = 1.6;
  }
}

// ============================================================================
// HUD
// ============================================================================
function initDevHud() {
  const hudRoot = document.createElement("div");
  hudRoot.id = "hudRoot";
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
  panel.style.maxWidth = "560px";
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

  btn("Safe Spawn", () => {
    if (playerRig) playerRig.position.set(0, 1.6, 2.0);
    log("manual: safe spawn ✅");
  });

  btn("Safety Lights", () => ensureSafetyLights(scene));

  btn("Re-Load World", async () => {
    await loadWorld_PROBE();
  });

  btn("Copy Logs", async () => {
    try {
      const text = collectConsoleHint();
      await navigator.clipboard.writeText(text);
      log("logs copied ✅");
    } catch (e) {
      warn("clipboard blocked", e);
      alert("Clipboard blocked. Copy from console instead.");
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

function showHudError(message) {
  const hud = document.getElementById("hudRoot");
  if (!hud) return;

  const box = document.createElement("div");
  box.style.pointerEvents = "auto";
  box.style.margin = "8px";
  box.style.padding = "10px";
  box.style.background = "rgba(120,0,0,0.65)";
  box.style.border = "1px solid rgba(255,255,255,0.25)";
  box.style.borderRadius = "10px";
  box.style.whiteSpace = "pre-wrap";
  box.style.fontFamily = "monospace";
  box.textContent = message;
  hud.prepend(box);
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
    `Tip: If you see MAGENTA CUBE, rendering works. If World is none, world.js import/export is failing.`
  ].join("\n");
}

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

// ============================================================================
// INPUT
// ============================================================================
function wireKeyboard() {
  window.addEventListener("keydown", (e) => state.keys.add(e.code));
  window.addEventListener("keyup", (e) => state.keys.delete(e.code));
  log("keyboard controls ✅ (WASD/Arrows move, Q/E turn)");
}

function wireTouchControls() {
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

  // Two-finger drag to turn
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

// ============================================================================
// HELPERS
// ============================================================================
function ensureSafetyLights(scene) {
  const hasLight = scene.children.some((o) => o.isLight);
  if (hasLight) return;

  const amb = new THREE.AmbientLight(0xffffff, 0.7);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.8);
  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(3, 6, 3);

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

function makeFloor() {
  const g = new THREE.PlaneGeometry(50, 50);
  const m = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(g, m);
  floor.name = "Floor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  return floor;
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

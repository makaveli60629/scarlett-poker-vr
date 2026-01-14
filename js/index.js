// /js/index.js — ScarlettVR Prime Entry (FULL) v15.3
// SINGLE ENTRY • CORE XR + ANDROID DEV CONTROLS • WORLD IMPORT PROBE • TELEPORT PADS • BOTS ROAM
// ✅ Fixes Quest black: alpha=false, clearColor opaque, safety lights
// ✅ Fixes “lasers stuck on table”: controllers+grips+lasers parented to PlayerRig
// ✅ World import probe: shows exact reason if world fails
// ✅ Android touch movement + keyboard movement
// ✅ Teleport pads: step onto pad to teleport
// ✅ Bots roam (if world provides bots group)

const BUILD = "INDEX_FULL_v15_3";

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
  debug: { cube: null, lastHud: 0, hudEl: null, hudVisible: true }
};

// XR controllers/lasers
let xr = { c0: null, c1: null, g0: null, g1: null, ray0: null, ray1: null };
const _ray = new THREE.Raycaster();
const _tmpM = new THREE.Matrix4();
let _hitDot = null;

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

  // Renderer (XR-safe defaults)
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
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

  // Always-on safety lights + fallback floor
  ensureSafetyLights(scene);
  scene.add(makeFloor());

  // Debug cube (comment out later if you want)
  state.debug.cube = makeDebugCube();
  scene.add(state.debug.cube);

  // Hit dot (laser intersection marker)
  _hitDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  _hitDot.visible = false;
  scene.add(_hitDot);

  // HUD + controls
  initDevHud();
  wireKeyboard();
  wireTouchControls();

  // World load (probe)
  await loadWorld_PROBE();

  // XR
  installXR();

  // Resize
  window.addEventListener("resize", onResize);
  onResize();

  // Animate
  renderer.setAnimationLoop(tick);
  log("animation loop ✅");
}

// ============================================================================
// WORLD LOAD — HARD PROBE
// ============================================================================
async function loadWorld_PROBE() {
  try {
    log("world: loading (probe)…");

    // Cache-bust import
    const mod = await import(`./world.js?v=${Date.now()}`);
    log("world: module keys=", Object.keys(mod));

    const W = mod.World || mod.default || mod.world || null;
    if (!W) throw new Error("world.js loaded but no export found (expected export const World or default).");

    const ctx = { THREE, scene, camera, renderer, playerRig, log, warn, err };

    let w = null;
    if (typeof W.create === "function") {
      w = await W.create(ctx);
      log("world: create(ctx) returned ✅");
    } else if (typeof W === "function") {
      w = await W(ctx);
      log("world: function(ctx) returned ✅");
    } else {
      throw new Error("World export exists but has no create(ctx) and is not callable.");
    }

    world = w || {};
    world.group = world.group || world.root || world.scene || world.world || null;
    if (!world.group) throw new Error("World returned but no group/root/scene found. Return { group }.");

    if (!scene.children.includes(world.group)) scene.add(world.group);

    log("world: added to scene ✅", { worldChildren: world.group.children?.length ?? "?" });

    // If world has no lights, keep ours; if it has, that's fine too.
    ensureSafetyLights(scene);

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

    // Ensure lights
    ensureSafetyLights(scene);

    // Controllers/lasers (only install once)
    if (!xr.c0) installControllersAndLasers();

    // Put debug cube in front each XR entry
    if (state.debug.cube) state.debug.cube.position.set(0, 1.5, -1.0);
  });

  renderer.xr.addEventListener("sessionend", () => {
    state.isXR = false;
    log("XR sessionend ✅");
  });
}

function getSessionInit() {
  // Keep it safe (no dom-overlay requested here)
  const optionalFeatures = ["local-floor", "bounded-floor", "local", "viewer", "hand-tracking"];
  return { optionalFeatures };
}

// ============================================================================
// CONTROLLERS + LASERS (Quest) — parented to PlayerRig
// ============================================================================
function installControllersAndLasers() {
  const controller0 = renderer.xr.getController(0);
  const controller1 = renderer.xr.getController(1);
  controller0.name = "XRController0";
  controller1.name = "XRController1";

  const grip0 = renderer.xr.getControllerGrip(0);
  const grip1 = renderer.xr.getControllerGrip(1);
  grip0.name = "XRGrip0";
  grip1.name = "XRGrip1";

  // Parent everything to PlayerRig (fix stuck lasers / wrong origin)
  playerRig.add(controller0, controller1, grip0, grip1);

  // Wands
  const wandGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.18, 10);
  const wandMat0 = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x112233, emissiveIntensity: 1.0 });
  const wandMat1 = new THREE.MeshStandardMaterial({ color: 0xff66cc, emissive: 0x331122, emissiveIntensity: 1.0 });

  const wand0 = new THREE.Mesh(wandGeo, wandMat0);
  const wand1 = new THREE.Mesh(wandGeo, wandMat1);
  wand0.rotation.x = -Math.PI / 2;
  wand1.rotation.x = -Math.PI / 2;
  wand0.position.z = -0.06;
  wand1.position.z = -0.06;

  controller0.add(wand0);
  controller1.add(wand1);

  // Lasers
  const makeLaser = (colorHex) => {
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: colorHex });
    const line = new THREE.Line(geo, mat);
    line.name = "Laser";
    line.scale.z = 10;
    return line;
  };

  const ray0 = makeLaser(0x66ccff);
  const ray1 = makeLaser(0xff66cc);
  controller0.add(ray0);
  controller1.add(ray1);

  controller0.addEventListener("selectstart", () => log("c0 selectstart"));
  controller0.addEventListener("selectend", () => log("c0 selectend"));
  controller1.addEventListener("selectstart", () => log("c1 selectstart"));
  controller1.addEventListener("selectend", () => log("c1 selectend"));

  xr = { c0: controller0, c1: controller1, g0: grip0, g1: grip1, ray0, ray1 };
  log("controllers + lasers installed ✅ (parented to PlayerRig)");
}

function updateLaserHits() {
  if (!xr?.c0 || !world?.group) return;

  let anyHit = false;

  testController(xr.c0, xr.ray0);
  testController(xr.c1, xr.ray1);

  _hitDot.visible = anyHit;

  function testController(ctrl, rayLine) {
    if (!ctrl || !rayLine) return;

    _tmpM.identity().extractRotation(ctrl.matrixWorld);
    _ray.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
    _ray.ray.direction.set(0, 0, -1).applyMatrix4(_tmpM);

    const hits = _ray.intersectObject(world.group, true);
    if (hits && hits.length) {
      anyHit = true;
      const h = hits[0];
      _hitDot.position.copy(h.point);
      rayLine.scale.z = Math.max(0.25, Math.min(10, h.distance));
    } else {
      rayLine.scale.z = 10;
    }
  }
}

// ============================================================================
// LOOP
// ============================================================================
function tick(t) {
  state.dt = Math.min((t - state.last) / 1000, 0.05);
  state.last = t;

  // Movement
  applyMovement(state.dt);

  // Teleport pads by stepping on them
  handleTeleports();

  // Bots roam (if provided)
  animateBots(t);

  // Lasers hit test
  updateLaserHits();

  // Debug cube pulse
  if (state.debug.cube) {
    state.debug.cube.rotation.y += 0.6 * state.dt;
    state.debug.cube.rotation.x += 0.25 * state.dt;
  }

  // HUD refresh
  if (state.debug.hudEl && (t - state.debug.lastHud) > 160) {
    state.debug.lastHud = t;
    state.debug.hudEl.textContent = buildHudText();
  }

  renderer.render(scene, camera);
}

// ============================================================================
// MOVEMENT (keyboard + touch)
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
// TELEPORT PADS (step on pad to teleport)
// Requires: world.group.userData.teleports is a Group of pads
// ============================================================================
function handleTeleports() {
  const tp = world?.group?.userData?.teleports;
  if (!tp || !playerRig) return;

  const pads = tp.children || [];
  const px = playerRig.position.x;
  const pz = playerRig.position.z;

  for (const pad of pads) {
    const to = pad?.userData?.teleportTo;
    if (!to) continue;

    const dx = pad.position.x - px;
    const dz = pad.position.z - pz;
    const d2 = dx * dx + dz * dz;

    // Stand on pad to teleport (radius ~0.55m)
    if (d2 < 0.55 * 0.55) {
      playerRig.position.set(to.x, 1.6, to.z);
      log("teleport ✅", pad.name, "->", to, "label=", pad.userData?.label || "");
      break;
    }
  }
}

// ============================================================================
// BOTS ROAM (if world provides userData.bots)
// ============================================================================
function animateBots(tMs) {
  const bots = world?.group?.userData?.bots;
  if (!bots) return;

  const t = tMs * 0.001;
  for (const b of bots.children) {
    const r = b.userData?.roamRadius || 7.2;
    const sp = b.userData?.speed || 0.4;
    const ph = b.userData?.phase || 0;
    const a = (t * sp) + ph;
    b.position.x = Math.cos(a) * r;
    b.position.z = Math.sin(a) * r;
    b.rotation.y = -a + Math.PI / 2;
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
  panel.style.maxWidth = "620px";
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
    `Controllers: ${xr?.c0 ? "YES" : "no"}  |  Lasers: ${xr?.ray0 ? "YES" : "no"}`,
    `Teleports: ${world?.group?.userData?.teleports?.children?.length ?? 0}`,
    `Bots: ${world?.group?.userData?.bots?.children?.length ?? 0}`,
    `Tip: Step on teleport pads to warp. In XR, lasers should follow hands (not stuck).`
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

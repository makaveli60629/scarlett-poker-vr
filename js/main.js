// /js/main.js — Scarlett VR Poker MAIN v3.8 (FULL)
// Built to match your architecture where World.init() RETURNS the runtime ctx.
//
// Fixes:
// ✅ Uses returned ctx as the source of truth (World creates ctx internally)
// ✅ Boots lobby hard (prevents starting in Scorpion)
// ✅ Calls AndroidControls.update(dt) every frame (fixes "too high" on mobile)
// ✅ RoomBridge listens to UI "scarlett-room" events and teleports correctly
// ✅ Keeps your Quest-safe XR requestSession tier fallback + single-flight lock
// ✅ main.js owns renderer.setAnimationLoop

import { VRButton } from "./VRButton.js";
import * as THREE_NS from "./three.js";
import { World } from "./world.js";

import { AndroidControls } from "./android_controls.js";
import { RoomBridge } from "./room_bridge.js";

const BOOT_V = Date.now();

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn(...a);
const err = (...a) => console.error(...a);

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function makeRenderer(THREE) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(clamp(window.devicePixelRatio || 1, 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  try { renderer.xr.setReferenceSpaceType?.("local-floor"); } catch {}
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function makeScene(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  return scene;
}

function makeCamera(THREE) {
  const cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  cam.position.set(0, 1.6, 3);
  return cam;
}

function makePlayerRig(THREE) {
  const rig = new THREE.Group();
  rig.name = "PLAYER_RIG";
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  return rig;
}

let __XR_SESSION_ACTIVE = false;
let __XR_SESSION_STARTING = false;

function isPresenting(renderer) {
  try { return !!renderer?.xr?.isPresenting; } catch { return false; }
}

function resize(renderer, camera) {
  if (isPresenting(renderer)) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// ---- XR session init: SAFE + fallback tiers ----

function sanitizeSessionInit(init) {
  const out = { ...(init || {}) };

  if (Array.isArray(out.optionalFeatures)) {
    out.optionalFeatures = out.optionalFeatures
      .filter((v) => typeof v === "string")
      // reference spaces are NOT features
      .filter((v) => v !== "local" && v !== "viewer");
  } else {
    out.optionalFeatures = [];
  }

  // Strip fragile blocks that cause NotSupportedError on Quest/Android
  delete out.domOverlay;
  delete out.depthSensing;
  delete out.requiredFeatures;

  return out;
}

function makeSessionInitTiers(baseInit) {
  const base = sanitizeSessionInit(baseInit);

  const tierA = {
    ...base,
    optionalFeatures: Array.from(new Set([
      ...(base.optionalFeatures || []),
      "local-floor",
      "bounded-floor",
      "hand-tracking",
      "layers",
      "hit-test",
    ])),
  };

  const tierB = { optionalFeatures: ["local-floor", "bounded-floor"] };
  const tierC = { optionalFeatures: ["local-floor"] };
  const tierD = {};

  return [tierA, tierB, tierC, tierD];
}

async function requestImmersiveVRWithFallback({ renderer, tiers }) {
  if (!navigator.xr) throw new Error("WebXR not available (navigator.xr missing)");

  let lastErr = null;

  for (const init of tiers) {
    try {
      log("[XR] trying requestSession init =", init);
      const session = await navigator.xr.requestSession("immersive-vr", init);
      log("[XR] session started ✅");
      await renderer.xr.setSession(session);
      return session;
    } catch (e) {
      lastErr = e;
      warn(`[XR] requestSession failed (${e?.name || "Error"}): ${e?.message || e}`);

      // Only fall back on NotSupportedError
      if (e?.name && e.name !== "NotSupportedError") throw e;
    }
  }

  throw lastErr || new Error("requestSession failed (unknown)");
}

async function boot() {
  log(`BOOT v=${BOOT_V}`);
  log(`href=${location.href}`);
  log(`ua=${navigator.userAgent}`);
  log(`navigator.xr=${!!navigator.xr}`);

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";

  const THREE = THREE_NS;
  const scene = makeScene(THREE);
  const camera = makeCamera(THREE);
  const renderer = makeRenderer(THREE);
  const player = makePlayerRig(THREE);

  scene.add(player);
  player.add(camera);

  window.addEventListener("resize", () => resize(renderer, camera));

  // Canonical session init if present (sanitized)
  const rawSessionInit =
    window.__XR_SESSION_INIT ||
    window.__SESSION_INIT__ || { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] };

  const sessionInit = sanitizeSessionInit(rawSessionInit);
  const sessionTiers = makeSessionInitTiers(sessionInit);

  // VRButton
  let vrDomButton = null;
  try {
    // Create VRButton without passing init (we handle requestSession ourselves)
    vrDomButton = VRButton.createButton(renderer);
    vrDomButton?.setAttribute?.("data-scarlett-vrbutton", "1");

    if (vrDomButton && !vrDomButton.isConnected) document.body.appendChild(vrDomButton);
    log("[main] VRButton ready ✅");
  } catch (e) {
    warn("[main] VRButton failed (non-fatal)", e);
  }

  async function startXRFromUI() {
    if (!navigator.xr) return warn("[XR] navigator.xr missing");
    if (__XR_SESSION_ACTIVE) return warn("[XR] already active; ignoring start request");
    if (__XR_SESSION_STARTING) return warn("[XR] start already in progress; ignoring");

    __XR_SESSION_STARTING = true;

    try {
      const session = await requestImmersiveVRWithFallback({ renderer, tiers: sessionTiers });

      __XR_SESSION_ACTIVE = true;
      __XR_SESSION_STARTING = false;

      session.addEventListener("end", () => {
        __XR_SESSION_ACTIVE = false;
        __XR_SESSION_STARTING = false;
        log("[XR] session ended");
      });

      log("[main] VR session started via fallback ✅");
    } catch (e) {
      __XR_SESSION_ACTIVE = false;
      __XR_SESSION_STARTING = false;
      err("[main] ❌ VR session failed (all tiers)", e);
    }
  }

  // Override VRButton click so internal VRButton handler can't double-start
  if (vrDomButton) {
    vrDomButton.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      startXRFromUI();
    }, { capture: true });
  }

  // HUD enter event -> call starter directly
  window.addEventListener("scarlett-enter-vr", () => {
    startXRFromUI();
    log("[main] scarlett-enter-vr -> startXRFromUI ✅");
  });

  // ---- IMPORTANT: World.init RETURNS ctx. Use that returned ctx everywhere. ----
  const baseCtx = {
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers: { left: null, right: null, hands: [] },
    log,
    warn,
    err,
    BUILD: "gh-pages",
    sessionInit,
  };

  let ctx = null;
  try {
    ctx = await World.init(baseCtx);
    log("[main] world init ✅ (using returned ctx)");
  } catch (e) {
    err("[main] ❌ world init failed", e);
    ctx = baseCtx;
    ctx.world = ctx;
  }

  // ✅ AndroidControls (mobile movement + look + fixes height perception)
  try {
    AndroidControls.init({
      renderer: ctx.renderer,
      rig: ctx.player,
      camera: ctx.camera,
      onTeleport: (dest) => {
        ctx.player.position.x = dest.x;
        ctx.player.position.z = dest.z;
      },
      getBounds: () => ctx.bounds || ctx.world?.bounds || null,
      getFloorY: () => 0,
    });

    // add a direct teleport helper for convenience
    AndroidControls.teleportTo = (p) => {
      ctx.player.position.x = p.x ?? ctx.player.position.x;
      ctx.player.position.z = p.z ?? ctx.player.position.z;
    };

    ctx.AndroidControls = AndroidControls;
    log("[main] AndroidControls wired ✅");
  } catch (e) {
    warn("[main] AndroidControls init failed (non-fatal)", e);
  }

  // ✅ Room bridge (event-driven room switching)
  try {
    RoomBridge.init(ctx, { AndroidControls });
    log("[main] RoomBridge wired ✅");
  } catch (e) {
    warn("[main] RoomBridge init failed (non-fatal)", e);
  }

  // ✅ HARD GUARANTEE: START LOBBY + HIDE SCORPION
  try {
    setTimeout(() => ctx.setRoom?.("lobby"), 0);
    setTimeout(() => ctx.setRoom?.("lobby"), 400);
    setTimeout(() => ctx.setRoom?.("lobby"), 900);
  } catch {}

  // Render loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    dt = clamp(dt, 0, 0.05);

    try {
      // If your VR controls exist, they run here
      ctx.Controls?.update?.(dt);
      ctx.controls?.update?.(dt);

      // ✅ Mobile controls must update EVERY frame
      ctx.AndroidControls?.update?.(dt);

      // World update
      ctx.world?.update?.(dt);
      ctx.update?.(dt);

      renderer.render(scene, camera);
    } catch (e) {
      err("[main] render loop error", e);
    }
  });

  log(`[main] ready ✅ v=${BOOT_V}`);
}

boot().catch((e) => err("BOOT FATAL", e));

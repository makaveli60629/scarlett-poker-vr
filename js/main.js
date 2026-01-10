// /js/main.js — Scarlett VR Poker MAIN v3.8 (FULL)
// ✅ XR tiered requestSession logic + VRButton override
// ✅ Publishes ctx on window.__SCARLETT_CTX for debugging
// ✅ RoomBridge: "scarlett-room" works reliably
// ✅ Uses World anchors (no more “wrong facing / stuck”)
// ✅ Re-align after XR starts (Quest refspace drift fix)

import { VRButton } from "./VRButton.js";
import * as THREE_NS from "./three.js";
import { World } from "./world.js";

const BOOT_V = Date.now();
const log = (...a) => console.log(...a);
const warn = (...a) => console.warn(...a);
const err = (...a) => console.error(...a);

async function safeImport(path) {
  try { return await import(path); }
  catch (e) { err(`❌ import failed: ${path}`, e); return null; }
}

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

function sanitizeSessionInit(init) {
  const out = { ...(init || {}) };
  if (Array.isArray(out.optionalFeatures)) {
    out.optionalFeatures = out.optionalFeatures
      .filter((v) => typeof v === "string")
      .filter((v) => v !== "local" && v !== "viewer");
  } else out.optionalFeatures = [];
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

  const rawSessionInit =
    window.__XR_SESSION_INIT ||
    window.__SESSION_INIT__ || {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    };

  const sessionInit = sanitizeSessionInit(rawSessionInit);
  const sessionTiers = makeSessionInitTiers(sessionInit);

  // VRButton
  let vrDomButton = null;
  try {
    vrDomButton = VRButton.createButton(renderer);
    if (vrDomButton && !vrDomButton.isConnected) document.body.appendChild(vrDomButton);
    log("[main] VRButton ready ✅");
  } catch (e) {
    warn("[main] VRButton failed (non-fatal)", e);
  }

  const controllers = { left: null, right: null, hands: [] };

  const ctx = {
    THREE,
    scene,
    renderer,
    camera,
    player,
    controllers,
    log,
    BUILD: "gh-pages",
    sessionInit,
    rooms: null,
    room: "lobby",
  };

  window.__SCARLETT_CTX = ctx;

  // Controls (optional)
  const cMod = await safeImport("./controls.js");
  const Controls = cMod?.Controls || null;
  if (Controls) log("[main] ✅ Controls imported");
  else warn("[main] ⚠️ Controls missing (non-fatal)");

  // World
  let world = null;
  try {
    world = await World.init(ctx);
    world ||= {};
    ctx.world = world;

    // normalize rooms
    ctx.rooms = ctx.rooms || world?.ctx?.rooms || world?.rooms || ctx.rooms;

    log("[main] world init ✅");
  } catch (e) {
    err("[main] ❌ world init failed", e);
    world = {};
    ctx.world = world;
  }

  // Controls init (optional)
  try {
    if (Controls?.init) {
      Controls.init({ ...ctx, world });
      ctx.Controls = Controls;
      log("[main] controls init ✅");
    }
  } catch (e) {
    warn("[main] ⚠️ Controls.init failed (non-fatal)", e);
  }

  // ✅ RoomBridge: UI can force room change any time
  window.addEventListener("scarlett-room", (e) => {
    const name = e?.detail?.name;
    if (!name) return;

    const mapped =
      name === "scorpion_room" ? "scorpion" :
      name === "poker_room" ? "lobby" :
      name;

    if (ctx.rooms?.setRoom) ctx.rooms.setRoom(ctx, mapped);
    else console.warn("[RoomBridge] rooms not ready:", mapped);
  });

  // Start in lobby spawn using World anchors
  try {
    world?.movePlayerTo?.("lobby_spawn", ctx);
    world?.setSeated?.(false, ctx);
    ctx.room = "lobby";
  } catch (e) {
    warn("[main] initial spawn align failed (non-fatal)", e);
  }

  async function startXRFromUI() {
    if (!navigator.xr) return warn("[XR] navigator.xr missing");
    if (__XR_SESSION_ACTIVE) return warn("[XR] already active; ignoring");
    if (__XR_SESSION_STARTING) return warn("[XR] start already in progress; ignoring");

    __XR_SESSION_STARTING = true;
    try {
      const session = await requestImmersiveVRWithFallback({ renderer, tiers: sessionTiers });

      __XR_SESSION_ACTIVE = true;
      __XR_SESSION_STARTING = false;

      // re-align after XR start (prevents drift/wrong-facing)
      setTimeout(() => {
        try {
          if (ctx.room === "scorpion") world?.seatPlayer?.(0, ctx);
          else world?.movePlayerTo?.("lobby_spawn", ctx);
        } catch {}
      }, 50);

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

  if (vrDomButton) {
    vrDomButton.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      startXRFromUI();
    }, { capture: true });
  }

  window.addEventListener("scarlett-enter-vr", () => {
    startXRFromUI();
    log("[main] scarlett-enter-vr -> startXRFromUI ✅");
  });

  // Loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    dt = clamp(dt, 0, 0.05);

    try {
      Controls?.update?.(dt);
      world?.update?.(dt);
      renderer.render(scene, camera);
    } catch (e) {
      err("[main] render loop error", e);
    }
  });

  log(`[main] ready ✅ v=${BOOT_V}`);
}

boot().catch((e) => err("BOOT FATAL", e));

// /js/main.js — Scarlett VR Poker MAIN v3.5 (FULL)
// FIX: Quest NotSupportedError via tiered XR session init fallback
// - Removes invalid/fragile init fields (domOverlay/depthSensing/etc) from default path
// - Overrides VRButton click to requestSession with safe fallbacks
// - Keeps your scarlett-enter-vr event working

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

function resize(renderer, camera) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// ---- XR session init: SAFE by default + fallback tiers ----

function sanitizeSessionInit(init) {
  // Clone shallow and scrub common foot-guns for Quest Browser
  const out = { ...(init || {}) };

  // Only keep optionalFeatures if it is an array of strings.
  if (Array.isArray(out.optionalFeatures)) {
    out.optionalFeatures = out.optionalFeatures
      .filter((v) => typeof v === "string")
      // IMPORTANT: "local" / "viewer" are NOT features; they're reference space types.
      .filter((v) => v !== "local" && v !== "viewer");
  } else {
    out.optionalFeatures = [];
  }

  // Strip fragile option blocks that can cause NotSupportedError on Quest
  delete out.domOverlay;
  delete out.depthSensing;

  // Strip other unsupported/nonstandard fields if someone injected them
  delete out.requiredFeatures;

  return out;
}

function makeSessionInitTiers(baseInit) {
  const base = sanitizeSessionInit(baseInit);

  // Tier A: Quest-safe "good" set
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

  // Tier B: Common minimal
  const tierB = { optionalFeatures: ["local-floor", "bounded-floor"] };

  // Tier C: Bare minimum
  const tierC = { optionalFeatures: ["local-floor"] };

  // Tier D: Absolute bare (some browsers accept empty init)
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

      // Keep falling back for NotSupportedError; otherwise bubble up.
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

  // Use index.html canonical session init if present, but sanitize it (Quest-safe)
  const rawSessionInit =
    window.__XR_SESSION_INIT ||
    window.__SESSION_INIT__ || {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
      // NOTE: domOverlay removed by default; it was causing NotSupportedError on Quest.
      // domOverlay: { root: document.body },
    };

  const sessionInit = sanitizeSessionInit(rawSessionInit);
  const sessionTiers = makeSessionInitTiers(sessionInit);

  // VRButton
  let vrDomButton = null;
  try {
    // Create VRButton without passing init (we will handle requestSession ourselves)
    vrDomButton = (VRButton.createButton.length >= 2)
      ? VRButton.createButton(renderer) // intentionally omit sessionInit
      : VRButton.createButton(renderer);

    vrDomButton?.setAttribute?.("data-scarlett-vrbutton", "1");

    // Mount
    if (vrDomButton && !vrDomButton.isConnected) document.body.appendChild(vrDomButton);

    log("[main] VRButton ready ✅");
  } catch (e) {
    warn("[main] VRButton failed (non-fatal)", e);
  }

  // Override VRButton click so it uses our fallback tiers (prevents NotSupportedError hard-fail)
  if (vrDomButton) {
    vrDomButton.addEventListener("click", async (ev) => {
      // Capture + stop so the internal VRButton handler (if any) doesn't run first
      ev.preventDefault();
      ev.stopPropagation();

      try {
        await requestImmersiveVRWithFallback({ renderer, tiers: sessionTiers });
        log("[main] VR session started via fallback ✅");
      } catch (e) {
        err("[main] ❌ VR session failed (all tiers)", e);
      }
    }, { capture: true });
  }

  // HUD enter event -> click real VR button
  window.addEventListener("scarlett-enter-vr", () => {
    try {
      vrDomButton?.click?.();
      log("[main] scarlett-enter-vr -> VRButton click ✅");
    } catch (e) {
      warn("[main] scarlett-enter-vr failed", e);
    }
  });

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
    sessionInit, // sanitized
  };

  // Controls
  const cMod = await safeImport("./controls.js");
  const Controls = cMod?.Controls || null;
  if (Controls) log("[main] ✅ Controls imported");
  else warn("[main] ⚠️ Controls missing (non-fatal)");

  // World
  let world = null;
  try {
    world = await World.init(ctx);
    world ||= {};
    world.spawns ||= {};
    ctx.world = world;
    log("[main] world init ✅");
  } catch (e) {
    err("[main] ❌ world init failed", e);
    world = { spawns: {} };
    ctx.world = world;
  }

  // init Controls
  try {
    if (Controls?.init) {
      Controls.init({ ...ctx, world });
      log("[main] controls init ✅");
    }
  } catch (e) {
    warn("[main] ⚠️ Controls.init failed (non-fatal)", e);
  }

  // Auto teleport
  let didAutoTP = false;
  const tryAutoTeleport = () => {
    if (didAutoTP) return;
    if (!Controls?.teleportToSpawn) return;

    const sp = world?.spawns || {};
    if (sp.default) { Controls.teleportToSpawn("default"); didAutoTP = true; return; }
    if (sp.lobby_spawn) { Controls.teleportToSpawn("lobby_spawn"); didAutoTP = true; return; }
  };

  tryAutoTeleport();
  let retryFrames = 60;

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
      if (!didAutoTP && retryFrames-- > 0) tryAutoTeleport();
      renderer.render(scene, camera);
    } catch (e) {
      err("[main] render loop error", e);
    }
  });

  log(`[main] ready ✅ v=${BOOT_V}`);
}

boot().catch((e) => err("BOOT FATAL", e));

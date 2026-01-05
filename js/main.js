import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

/**
 * Skylark Poker VR — MAIN ORCHESTRATOR (GITHUB PAGES SAFE)
 * Fixes:
 * - GitHub Pages "three" import specifier error ✅ (uses unpkg URLs)
 * - Modules not initializing because bootModule used module object ✅ (export picker fixed)
 * - scene.add is not a function ✅ (guarded + always passes real scene)
 * - controllers not following rig ✅ (controllers parented to rig)
 * - build results not fed into ctx.colliders/floorPlanes ✅ (merged)
 */

const BUILD_TAG = "MAIN-FIX-v2.2-GHPAGES";

/* ----------------------------- HUD LOG ----------------------------- */
function ensureHud() {
  let hud = document.getElementById("hudLog");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hudLog";
    hud.style.position = "fixed";
    hud.style.left = "12px";
    hud.style.top = "12px";
    hud.style.zIndex = "99999";
    hud.style.maxWidth = "92vw";
    hud.style.maxHeight = "45vh";
    hud.style.overflow = "auto";
    hud.style.padding = "10px 12px";
    hud.style.borderRadius = "12px";
    hud.style.background = "rgba(0,0,0,0.68)";
    hud.style.border = "1px solid rgba(0,255,255,0.25)";
    hud.style.color = "#fff";
    hud.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
    hud.style.fontSize = "12px";
    hud.style.lineHeight = "1.35";
    hud.innerHTML = `<div style="font-weight:900">Skylark Boot</div>`;
    document.body.appendChild(hud);
  }
  return hud;
}
const hud = ensureHud();
function log(msg) {
  console.log(msg);
  hud.innerHTML += `<div>${msg}</div>`;
  hud.scrollTop = hud.scrollHeight;
}

/* ------------------------- SAFE MODULE LOADER ------------------------ */
async function safeImport(path) {
  try {
    const mod = await import(path);
    log(`✅ ${path} loaded`);
    log(`↳ keys: ${Object.keys(mod).join(", ") || "(none)"}`);
    return mod;
  } catch (e) {
    log(`❌ ${path} failed: ${String(e?.message || e)}`);
    return null;
  }
}

function isClass(fn) {
  if (typeof fn !== "function") return false;
  const s = Function.prototype.toString.call(fn);
  return s.startsWith("class ");
}

// Pick an actual export from the module object.
// Priority: hinted names -> default -> first export -> null
function pickExport(mod, hints = []) {
  if (!mod) return null;

  for (const h of hints) {
    if (mod[h]) return mod[h];
  }
  if (mod.default) return mod.default;

  const keys = Object.keys(mod);
  if (keys.length) return mod[keys[0]];

  return null;
}

function tryCall(label, fn, argsList) {
  if (!fn) return null;

  // class: instantiate
  if (isClass(fn)) {
    for (const args of argsList) {
      try {
        const inst = new fn(...args);
        log(`✅ ${label} new(${args.length}) OK`);
        return inst;
      } catch (e) {}
    }
    log(`❌ ${label} could not be constructed with any signature`);
    return null;
  }

  // function: call
  for (const args of argsList) {
    try {
      const out = fn(...args);
      log(`✅ ${label} call(${args.length}) OK`);
      return out;
    } catch (e) {}
  }

  log(`❌ ${label} could not be called with any signature`);
  return null;
}

function tryObjectMethod(label, obj, methodNames, argsList) {
  if (!obj) return null;
  for (const m of methodNames) {
    if (typeof obj[m] === "function") {
      // if method does not throw, consider it success even if returns undefined
      try {
        const out = obj[m](...argsList[0]);
        log(`✅ ${label}.${m} call(${argsList[0].length}) OK`);
        return out ?? obj;
      } catch (e) {}
      // try other signatures
      for (let i = 1; i < argsList.length; i++) {
        try {
          const out = obj[m](...argsList[i]);
          log(`✅ ${label}.${m} call(${argsList[i].length}) OK`);
          return out ?? obj;
        } catch (e) {}
      }
      log(`❌ ${label}.${m} failed all signatures`);
    }
  }
  return null;
}

/* -------------------------- SPAWNS + ROOMS -------------------------- */
const SPAWNS = {
  lobby: { x: 0, y: 0, z: 10 },
  poker: { x: 0, y: 0, z: 12 },
  store: { x: -12, y: 0, z: 9 },
};

function applySpawn(rig, roomName) {
  const s = SPAWNS[roomName] || SPAWNS.lobby;
  rig.position.set(s.x, s.y, s.z);
  rig.rotation.set(0, 0, 0);
}

/* ------------------------------ BOOT ------------------------------ */
export async function boot(statusEl) {
  const setStatus = (t) => {
    if (statusEl) statusEl.innerHTML = String(t);
  };

  log(`🧾 BUILD: ${BUILD_TAG}`);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR Button
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.right = "12px";
  vrBtn.style.top = "12px";
  vrBtn.style.zIndex = "9999";
  document.body.appendChild(vrBtn);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  // Rig + Camera
  const rig = new THREE.Group();
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    250
  );
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // Failsafe lights + floor (always visible even if modules fail)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(12, 16, 10);
  scene.add(sun);

  const fallbackFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.95 })
  );
  fallbackFloor.rotation.x = -Math.PI / 2;
  fallbackFloor.receiveShadow = true;
  fallbackFloor.name = "fallbackFloor";
  scene.add(fallbackFloor);

  // Safe spawn
  applySpawn(rig, "lobby");

  // Controllers LOCKED to rig
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  // Shared ctx
  const ctx = {
    scene,
    rig,
    camera,
    renderer,
    room: "lobby",
    spawns: SPAWNS,
    colliders: [fallbackFloor], // will merge in real colliders after builds
    floorPlanes: [fallbackFloor],
    objects: [],
    api: {},
    setRoom: (name) => {
      ctx.room = name;
      applySpawn(rig, name);
    },
  };

  /* ---------------------- LOAD ALL MODULES ---------------------- */
  // IMPORTANT: These are relative to /js/main.js on GitHub Pages
  const worldMod = await safeImport("./world.js");
  const tableMod = await safeImport("./table.js");
  const pokerMod = await safeImport("./poker.js");
  const uiMod = await safeImport("./ui.js");

  const controlsMod = await safeImport("./controls.js");
  const locomotionMod = await safeImport("./xr_locomotion.js");
  const interactionsMod = await safeImport("./interactions.js");
  const handsMod = await safeImport("./hands.js");
  const cardsMod = await safeImport("./cards.js");
  const chipsMod = await safeImport("./event_chips.js");
  const botsMod = await safeImport("./bots.js");
  const storeMod = await safeImport("./store.js");
  const teleportMod = await safeImport("./teleport_machine.js");
  const watchUIMod = await safeImport("./watch_ui.js");
  const leaderboardMod = await safeImport("./leaderboard.js");
  const notifyMod = await safeImport("./notify.js");
  const audioMod = await safeImport("./audio.js");
  const stateMod = await safeImport("./state.js");

  /* ---------------------- SIGNATURE FIX PIPELINE ---------------------- */
  const argsCTX = [[ctx]];
  const argsSCN = [
    [scene, rig, ctx],
    [scene, rig],
    [scene],
    [ctx],
  ];

  function bootModule(label, mod, exportHints = []) {
    if (!mod) return null;

    // pick the REAL export, not the module object
    const primary = pickExport(mod, exportHints);

    // If export is an object with methods (World/Table/etc)
    if (primary && typeof primary === "object") {
      const out =
        tryObjectMethod(label, primary, ["init", "start", "setup"], argsCTX) ??
        tryObjectMethod(label, primary, ["build", "create"], argsSCN);

      return out ?? primary;
    }

    // If export is a function/class
    if (typeof primary === "function") {
      return (
        tryCall(label, primary, argsCTX) ??
        tryCall(label, primary, argsSCN) ??
        primary
      );
    }

    // If nothing usable, return null (do not store module object)
    log(`⚠️ ${label}: no usable export found`);
    return null;
  }

  // Boot in safe order (state + locomotion + controls first)
  ctx.api.state = bootModule("state", stateMod, ["State", "default"]);
  ctx.api.locomotion = bootModule("xr_locomotion", locomotionMod, [
    "XrLocomotion",
    "Locomotion",
    "default",
  ]);
  ctx.api.controls = bootModule("controls", controlsMod, ["Controls", "default"]);

  // World / table / environment
  ctx.api.world = bootModule("world", worldMod, ["World", "default"]);
  ctx.api.table = bootModule("table", tableMod, ["PokerTable", "Table", "default"]);
  ctx.api.store = bootModule("store", storeMod, ["Store", "default"]);
  ctx.api.teleport = bootModule("teleport_machine", teleportMod, [
    "TeleportMachine",
    "default",
  ]);

  // Interaction systems
  ctx.api.interactions = bootModule("interactions", interactionsMod, [
    "Interactions",
    "default",
  ]);
  ctx.api.hands = bootModule("hands", handsMod, ["Hands", "default"]);
  ctx.api.cards = bootModule("cards", cardsMod, ["Cards", "default"]);
  ctx.api.eventChips = bootModule("event_chips", chipsMod, ["EventChips", "default"]);
  ctx.api.bots = bootModule("bots", botsMod, ["Bots", "default"]);

  // Gameplay + UI
  ctx.api.poker = bootModule("poker", pokerMod, ["PokerEngine", "Poker", "default"]);
  ctx.api.notify = bootModule("notify", notifyMod, ["Notify", "default"]);
  ctx.api.leaderboard = bootModule("leaderboard", leaderboardMod, [
    "Leaderboard",
    "default",
  ]);
  ctx.api.audio = bootModule("audio", audioMod, ["AudioSys", "default"]);
  ctx.api.watchUI = bootModule("watch_ui", watchUIMod, ["WatchUI", "default"]);
  ctx.api.ui = bootModule("ui", uiMod, ["UI", "default"]);

  /* ---------------------- MERGE WORLD/TABLE COLLIDERS ---------------------- */
  // Many of your builders return { colliders, floorPlanes } — we merge them here.
  function mergeBuildResult(x) {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x.colliders)) ctx.colliders.push(...x.colliders);
    if (Array.isArray(x.floorPlanes)) ctx.floorPlanes.push(...x.floorPlanes);
  }

  // World/Table/Store/Teleport may have returned build outputs
  mergeBuildResult(ctx.api.world);
  mergeBuildResult(ctx.api.table);
  mergeBuildResult(ctx.api.store);
  mergeBuildResult(ctx.api.teleport);

  // If your World.build returned an object, that object might be the build result
  // If your World export is an object and build returned result, it may already be merged above.
  // Either way, we now have more than just fallbackFloor in ctx.colliders.

  /* ---------------------- MENU BINDINGS ---------------------- */
  function toggleMenu() {
    const fns = [
      ctx.api.ui?.toggleMenu,
      ctx.api.ui?.toggle,
      ctx.api.watchUI?.toggleMenu,
      ctx.api.watchUI?.toggle,
    ].filter((f) => typeof f === "function");

    if (fns[0]) {
      try {
        fns[0](ctx);
      } catch (e) {
        log(`❌ toggleMenu crashed: ${e}`);
      }
    } else {
      log("⚠️ Menu pressed but ui/watch_ui has no toggleMenu/toggle");
    }
  }

  // Let controls/locomotion call menu + teleport rooms
  if (ctx.api.controls && typeof ctx.api.controls === "object") {
    ctx.api.controls.onMenuToggle = toggleMenu;
    ctx.api.controls.onTeleportRoom = (name) => ctx.setRoom(name);
  }
  if (ctx.api.locomotion && typeof ctx.api.locomotion === "object") {
    ctx.api.locomotion.onMenuToggle = toggleMenu;
    ctx.api.locomotion.onTeleportRoom = (name) => ctx.setRoom(name);
  }

  // Desktop fallback
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "m") toggleMenu();
  });

  setStatus(
    `Status: running ✅<br>
     BUILD: ${BUILD_TAG}<br>
     Tip: If old cache persists, use Quest/Android incognito or clear site data`
  );

  /* ---------------------- UPDATE LOOP ---------------------- */
  const updaters = [];
  function registerUpdater(x) {
    if (!x) return;
    if (typeof x === "function") updaters.push(x);
    if (x && typeof x.update === "function") updaters.push(x.update.bind(x));
  }
  Object.values(ctx.api).forEach(registerUpdater);

  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    for (const fn of updaters) {
      try {
        fn(dt, ctx);
      } catch {}
    }

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  log("✅ Boot complete — if you still see black, clear cache/incognito");
          }

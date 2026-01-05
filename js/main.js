import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

/**
 * Skylark Poker VR — MAIN ORCHESTRATOR (FIXED SIGNATURES)
 * Fixes:
 * - scene.add is not a function  ✅ (we pass real scene, not ctx)
 * - Class constructor X cannot be invoked without new ✅ (we instantiate classes)
 * - hands getController undefined ✅ (ctx.renderer exists + controller attached)
 * - black screen caused by everything failing ✅ (failsafe world always draws)
 */

const BUILD_TAG = "MAIN-FIX-v2.1";

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

function getExport(mod, names = []) {
  if (!mod) return null;
  for (const n of names) if (mod[n]) return mod[n];
  // fallback: first export
  const k = Object.keys(mod)[0];
  return k ? mod[k] : null;
}

function tryCall(label, fn, argsList) {
  if (!fn) return null;

  // If it is a class, try instantiation first
  if (isClass(fn)) {
    for (const args of argsList) {
      try {
        const inst = new fn(...args);
        log(`✅ ${label} new(${args.length}) OK`);
        return inst;
      } catch (e) {
        // continue
      }
    }
    return null;
  }

  // Otherwise, normal function call attempts
  for (const args of argsList) {
    try {
      const out = fn(...args);
      log(`✅ ${label} call(${args.length}) OK`);
      return out;
    } catch (e) {
      // continue
    }
  }
  return null;
}

function tryObjectMethod(label, obj, methodNames, argsList) {
  if (!obj) return null;
  for (const m of methodNames) {
    if (typeof obj[m] === "function") {
      const out = tryCall(`${label}.${m}`, obj[m].bind(obj), argsList);
      if (out !== null) return out;
      // If method succeeded but returned undefined, still count as success:
      // If it didn't throw, it would have logged OK; but tryCall returns null on total failure.
    }
  }
  return null;
}

/* -------------------------- SPAWNS + ROOMS -------------------------- */
const SPAWNS = {
  lobby: { x: 0, z: 10 },
  poker: { x: 0, z: 12 },
  store: { x: -12, z: 9 },
};

function applySpawn(rig, roomName) {
  const s = SPAWNS[roomName] || SPAWNS.lobby;
  rig.position.set(s.x, 0, s.z);
  rig.rotation.set(0, 0, 0);
}

/* ------------------------------ BOOT ------------------------------ */
export async function boot(statusEl) {
  const setStatus = (t) => { if (statusEl) statusEl.innerHTML = String(t); };
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

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // Failsafe lights + floor (so even if world crashes you SEE something)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(12, 16, 10);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "floor";
  scene.add(floor);

  // Safe spawn
  applySpawn(rig, "lobby");

  // Controllers LOCKED to rig (fix “laser not with me”)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  // Shared ctx
  const ctx = {
    scene, rig, camera, renderer,
    room: "lobby",
    spawns: SPAWNS,
    colliders: [floor],
    objects: [],
    api: {},
    setRoom: (name) => {
      ctx.room = name;
      applySpawn(rig, name);
    },
  };

  /* ---------------------- LOAD ALL MODULES ---------------------- */
  const worldMod   = await safeImport("./world.js");
  const tableMod   = await safeImport("./table.js");
  const pokerMod   = await safeImport("./poker.js");
  const uiMod      = await safeImport("./ui.js");

  const controlsMod     = await safeImport("./controls.js");
  const locomotionMod   = await safeImport("./xr_locomotion.js");
  const interactionsMod = await safeImport("./interactions.js");
  const handsMod        = await safeImport("./hands.js");
  const cardsMod        = await safeImport("./cards.js");
  const chipsMod        = await safeImport("./event_chips.js");
  const botsMod         = await safeImport("./bots.js");
  const storeMod        = await safeImport("./store.js");
  const teleportMod     = await safeImport("./teleport_machine.js");
  const watchUIMod      = await safeImport("./watch_ui.js");
  const leaderboardMod  = await safeImport("./leaderboard.js");
  const notifyMod       = await safeImport("./notify.js");
  const audioMod        = await safeImport("./audio.js");
  const stateMod        = await safeImport("./state.js");

  /* ---------------------- SIGNATURE FIX PIPELINE ---------------------- */
  // IMPORTANT: we try signatures in this order:
  // 1) init(ctx)
  // 2) build(scene, rig, ctx)
  // 3) build(scene, rig)
  // 4) create/setup(start) variants
  // And we handle classes with "new" properly.

  const argsCTX = [[ctx]];
  const argsSCN = [[scene, rig, ctx], [scene, rig], [scene], [ctx]];

  function bootModule(label, mod, exportHints = []) {
    if (!mod) return null;

    // prefer specific export names if provided
    const exp = exportHints.length ? getExport(mod, exportHints) : null;
    const primary = exp || mod;

    // If module exports an object with methods
    if (primary && typeof primary === "object") {
      const out =
        tryObjectMethod(label, primary, ["init", "start", "setup"], argsCTX) ??
        tryObjectMethod(label, primary, ["build", "create"], argsSCN);

      // save object itself as API if it didn’t return anything
      return out ?? primary;
    }

    // If module exports a function/class directly (or first export)
    const fn = (typeof primary === "function") ? primary : getExport(mod, exportHints) || getExport(mod, []) ;
    const out =
      tryCall(label, fn, argsCTX) ??
      tryCall(label, fn, argsSCN);

    return out ?? fn ?? mod;
  }

  // Boot in safe order
  ctx.api.state       = bootModule("state", stateMod, ["State", "default"]);
  ctx.api.locomotion  = bootModule("xr_locomotion", locomotionMod, ["XrLocomotion", "Locomotion", "default"]);
  ctx.api.controls    = bootModule("controls", controlsMod, ["Controls", "default"]);

  ctx.api.world       = bootModule("world", worldMod, ["World", "default"]);
  ctx.api.table       = bootModule("table", tableMod, ["PokerTable", "Table", "default"]);
  ctx.api.store       = bootModule("store", storeMod, ["Store", "default"]);
  ctx.api.teleport    = bootModule("teleport_machine", teleportMod, ["TeleportMachine", "default"]);

  ctx.api.interactions= bootModule("interactions", interactionsMod, ["Interactions", "default"]);
  ctx.api.hands       = bootModule("hands", handsMod, ["Hands", "default"]);
  ctx.api.cards       = bootModule("cards", cardsMod, ["Cards", "default"]);
  ctx.api.eventChips  = bootModule("event_chips", chipsMod, ["EventChips", "default"]);
  ctx.api.bots        = bootModule("bots", botsMod, ["Bots", "default"]);

  ctx.api.poker       = bootModule("poker", pokerMod, ["PokerEngine", "Poker", "default"]);
  ctx.api.notify      = bootModule("notify", notifyMod, ["Notify", "default"]);
  ctx.api.leaderboard = bootModule("leaderboard", leaderboardMod, ["Leaderboard", "default"]);
  ctx.api.audio       = bootModule("audio", audioMod, ["AudioSys", "default"]);
  ctx.api.watchUI     = bootModule("watch_ui", watchUIMod, ["WatchUI", "default"]);
  ctx.api.ui          = bootModule("ui", uiMod, ["UI", "default"]);

  /* ---------------------- MENU BINDINGS ---------------------- */
  function toggleMenu() {
    const candidates = [
      ctx.api.ui?.toggleMenu, ctx.api.ui?.toggle,
      ctx.api.watchUI?.toggleMenu, ctx.api.watchUI?.toggle
    ].filter(f => typeof f === "function");

    if (candidates[0]) {
      try { candidates[0](ctx); } catch (e) { log(`❌ toggleMenu crashed: ${e}`); }
    } else {
      log("⚠️ Menu pressed but ui/watch_ui has no toggleMenu/toggle");
    }
  }

  // Hook controls/locomotion if they accept it
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
      try { fn(dt, ctx); } catch {}
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

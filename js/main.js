import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

/**
 * Skylark Poker VR — MAIN ORCHESTRATOR (ALL-IN)
 * - Loads ALL modules safely
 * - Calls init/start/build/setup/create no matter export name
 * - Registers update loops
 * - Fixes boss.js problem by NOT importing it
 * - Fixes "PokerTable export missing" by NOT using named import
 */

const BUILD_TAG = "ALL-IN-ORCH-v2.0";

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

function findCallable(mod, preferredNames = []) {
  if (!mod) return null;

  // 1) Try preferred names first
  for (const n of preferredNames) {
    const v = mod[n];
    if (typeof v === "function") return v;
    if (v && typeof v === "object") {
      const m = v.init || v.start || v.build || v.setup || v.create;
      if (typeof m === "function") return m.bind(v);
    }
  }

  // 2) Then scan all exports for a callable function or callable object method
  for (const k of Object.keys(mod)) {
    const v = mod[k];
    if (typeof v === "function") return v;
    if (v && typeof v === "object") {
      const m = v.init || v.start || v.build || v.setup || v.create;
      if (typeof m === "function") return m.bind(v);
    }
  }

  return null;
}

function callSafe(label, fn, ...args) {
  try {
    if (typeof fn !== "function") return null;
    return fn(...args);
  } catch (e) {
    log(`❌ ${label} crashed: ${String(e?.message || e)}`);
    console.error(e);
    return null;
  }
}

/* -------------------------- SPAWNS + ROOMS -------------------------- */
const SPAWNS = {
  lobby: { x: 0, z: 10 },
  poker: { x: 0, z: 12 },   // always away from table center
  store: { x: -12, z: 9 },  // inside store area (adjust later in store.js)
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

  // Safety lights & floor (world.js will override/build richer space)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(12, 16, 10);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = "floor";
  scene.add(floor);

  // Spawn safe
  applySpawn(rig, "lobby");

  // Controllers attach to rig (fix “laser not with me”)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  /* ---------------------- LOAD ALL MODULES ---------------------- */
  // Core build
  const worldMod   = await safeImport("./world.js");
  const tableMod   = await safeImport("./table.js");
  const pokerMod   = await safeImport("./poker.js");
  const uiMod      = await safeImport("./ui.js");

  // Systems
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

  /* ---------------------- INIT / BUILD PIPELINE ---------------------- */

  // Shared context everyone can use
  const ctx = {
    scene,
    rig,
    camera,
    renderer,
    spawns: SPAWNS,
    room: "lobby",
    colliders: [floor],
    objects: [],
    api: {}, // filled as modules return APIs
    setRoom: (name) => {
      ctx.room = name;
      applySpawn(rig, name);
    }
  };

  // STATE first (optional)
  const stateStart = findCallable(stateMod, ["init", "start", "setup", "create", "default"]);
  ctx.api.state = callSafe("state", stateStart, ctx) || stateMod || null;

  // CONTROLS / LOCOMOTION
  // Prefer xr_locomotion if it exists; otherwise controls.js init
  const locomotionStart = findCallable(locomotionMod, ["init", "start", "setup", "default"]);
  ctx.api.locomotion = callSafe("xr_locomotion", locomotionStart, ctx) || locomotionMod || null;

  const controlsStart = findCallable(controlsMod, ["init", "start", "setup", "default", "Controls"]);
  ctx.api.controls = callSafe("controls", controlsStart, ctx) || controlsMod || null;

  // WORLD build
  const worldBuild = findCallable(worldMod, ["World", "build", "init", "start", "create", "default"]);
  ctx.api.world = callSafe("world", worldBuild, ctx) || worldMod || null;

  // TABLE build (no named import assumptions!)
  const tableBuild = findCallable(tableMod, ["PokerTable", "Table", "build", "init", "start", "create", "default"]);
  ctx.api.table = callSafe("table", tableBuild, ctx) || tableMod || null;

  // STORE build (optional)
  const storeBuild = findCallable(storeMod, ["build", "init", "start", "create", "default"]);
  ctx.api.store = callSafe("store", storeBuild, ctx) || storeMod || null;

  // TELEPORT MACHINE build (optional)
  const teleBuild = findCallable(teleportMod, ["build", "init", "start", "create", "default"]);
  ctx.api.teleport = callSafe("teleport_machine", teleBuild, ctx) || teleportMod || null;

  // INTERACTIONS (action button “only on valid objects”)
  const interStart = findCallable(interactionsMod, ["init", "start", "setup", "default"]);
  ctx.api.interactions = callSafe("interactions", interStart, ctx) || interactionsMod || null;

  // HANDS / CARDS / CHIPS / BOTS
  const handsStart = findCallable(handsMod, ["init", "start", "setup", "default"]);
  ctx.api.hands = callSafe("hands", handsStart, ctx) || handsMod || null;

  const cardsStart = findCallable(cardsMod, ["init", "start", "setup", "default"]);
  ctx.api.cards = callSafe("cards", cardsStart, ctx) || cardsMod || null;

  const chipsStart = findCallable(chipsMod, ["init", "start", "setup", "default"]);
  ctx.api.eventChips = callSafe("event_chips", chipsStart, ctx) || chipsMod || null;

  const botsStart = findCallable(botsMod, ["init", "start", "setup", "default"]);
  ctx.api.bots = callSafe("bots", botsStart, ctx) || botsMod || null;

  // POKER
  const pokerStart = findCallable(pokerMod, ["init", "start", "setup", "build", "create", "default"]);
  ctx.api.poker = callSafe("poker", pokerStart, ctx) || pokerMod || null;

  // UI / WATCH UI / NOTIFY / LEADERBOARD / AUDIO
  const notifyStart = findCallable(notifyMod, ["init", "start", "setup", "default"]);
  ctx.api.notify = callSafe("notify", notifyStart, ctx) || notifyMod || null;

  const leaderboardStart = findCallable(leaderboardMod, ["init", "start", "setup", "default"]);
  ctx.api.leaderboard = callSafe("leaderboard", leaderboardStart, ctx) || leaderboardMod || null;

  const audioStart = findCallable(audioMod, ["init", "start", "setup", "default"]);
  ctx.api.audio = callSafe("audio", audioStart, ctx) || audioMod || null;

  const watchUIStart = findCallable(watchUIMod, ["init", "start", "setup", "default"]);
  ctx.api.watchUI = callSafe("watch_ui", watchUIStart, ctx) || watchUIMod || null;

  const uiStart = findCallable(uiMod, ["init", "start", "setup", "build", "create", "default"]);
  ctx.api.ui = callSafe("ui", uiStart, ctx) || uiMod || null;

  /* ---------------------- MENU BINDINGS ---------------------- */
  // We bind menu toggle to whatever exists (ui or watch_ui).
  function toggleMenu() {
    const candidates = [
      ctx.api.ui?.toggleMenu, ctx.api.ui?.toggle,
      ctx.api.watchUI?.toggleMenu, ctx.api.watchUI?.toggle,
      uiMod?.toggleMenu, uiMod?.toggle,
      watchUIMod?.toggleMenu, watchUIMod?.toggle
    ].filter(Boolean);

    const fn = candidates.find(f => typeof f === "function");
    if (fn) callSafe("toggleMenu", fn.bind(ctx.api.ui || ctx.api.watchUI || null), ctx);
    else log("⚠️ Menu pressed but no toggleMenu/toggle found in ui.js or watch_ui.js");
  }

  // If controls/locomotion exposes hooks, set them
  if (ctx.api.controls) {
    ctx.api.controls.onMenuToggle = toggleMenu;
    ctx.api.controls.onTeleportRoom = (roomName) => ctx.setRoom(roomName);
  }
  if (ctx.api.locomotion) {
    ctx.api.locomotion.onMenuToggle = toggleMenu;
    ctx.api.locomotion.onTeleportRoom = (roomName) => ctx.setRoom(roomName);
  }

  // Fallback: keyboard M toggles menu (for desktop testing)
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "m") toggleMenu();
  });

  setStatus(
    `Status: running ✅<br>
     BUILD: ${BUILD_TAG}<br>
     Tip: If old cache persists, use Quest/Android incognito or clear site data`
  );

  /* ---------------------- UPDATE LOOP ---------------------- */
  const updaters = [];

  function pushUpdater(x) {
    if (!x) return;
    if (typeof x === "function") updaters.push(x);
    if (x && typeof x.update === "function") updaters.push(x.update.bind(x));
  }

  // register known APIs
  pushUpdater(ctx.api.world);
  pushUpdater(ctx.api.table);
  pushUpdater(ctx.api.store);
  pushUpdater(ctx.api.teleport);
  pushUpdater(ctx.api.interactions);
  pushUpdater(ctx.api.hands);
  pushUpdater(ctx.api.cards);
  pushUpdater(ctx.api.eventChips);
  pushUpdater(ctx.api.bots);
  pushUpdater(ctx.api.poker);
  pushUpdater(ctx.api.leaderboard);
  pushUpdater(ctx.api.notify);
  pushUpdater(ctx.api.audio);
  pushUpdater(ctx.api.watchUI);
  pushUpdater(ctx.api.ui);
  pushUpdater(ctx.api.controls);
  pushUpdater(ctx.api.locomotion);

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

  log("✅ Boot complete");
}

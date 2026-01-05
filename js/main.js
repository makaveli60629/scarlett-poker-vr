import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { Controls } from "./controls.js";

/**
 * Skylark Poker VR - MAIN ORCHESTRATOR (Restore wiring, keep modules)
 * Fixes: poker.js / ui.js "no init found" by supporting start/build/setup/etc.
 * Fixes: boss.js fetch error by not importing it.
 */

const BUILD_TAG = "RESTORE-ORCH-v1.1";

function ensureHud() {
  let hud = document.getElementById("hudLog");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hudLog";
    hud.style.position = "fixed";
    hud.style.left = "12px";
    hud.style.bottom = "12px";
    hud.style.zIndex = "99999";
    hud.style.maxWidth = "92vw";
    hud.style.maxHeight = "42vh";
    hud.style.overflow = "auto";
    hud.style.padding = "10px 12px";
    hud.style.borderRadius = "12px";
    hud.style.background = "rgba(0,0,0,0.65)";
    hud.style.border = "1px solid rgba(0,255,255,0.25)";
    hud.style.color = "#fff";
    hud.style.fontFamily = "system-ui,Segoe UI,Roboto,Arial";
    hud.style.fontSize = "12px";
    hud.style.lineHeight = "1.35";
    hud.innerHTML = `<div style="font-weight:800">Skylark Boot Log</div>`;
    document.body.appendChild(hud);
  }
  return hud;
}
const hud = ensureHud();
function log(msg) {
  hud.innerHTML += `<div>${msg}</div>`;
  hud.scrollTop = hud.scrollHeight;
  console.log(msg);
}

async function safeImport(path) {
  try {
    const mod = await import(path);
    log(`✅ loaded ${path}`);
    return mod;
  } catch (e) {
    log(`❌ failed ${path}: ${String(e?.message || e)}`);
    return null;
  }
}

function pick(mod, names = []) {
  if (!mod) return null;
  for (const n of names) if (mod[n] != null) return mod[n];
  return null;
}

function findCallable(mod, candidateNames = []) {
  if (!mod) return null;

  // 1) direct named lookup
  for (const n of candidateNames) {
    const v = mod[n];
    if (typeof v === "function") return v;
    if (v && typeof v === "object") {
      // If it's an object, try common method names
      const m = v.init || v.start || v.build || v.setup || v.create;
      if (typeof m === "function") return m.bind(v);
    }
  }

  // 2) scan exports for first plausible function/object method
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

function safeCall(label, fn, ...args) {
  try {
    if (typeof fn !== "function") return null;
    return fn(...args);
  } catch (e) {
    log(`❌ ${label} crashed: ${String(e?.message || e)}`);
    console.error(e);
    return null;
  }
}

function safeSpawn(rig, spawn) {
  rig.position.set(spawn.x, 0, spawn.z);
  rig.rotation.set(0, 0, 0);
}

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

  // VR Button (top-right, not overlapping)
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

  // Safety lights/floor (world.js adds your real look)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(12, 16, 10);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Spawns (never inside table)
  const SPAWNS = {
    lobby: { x: 0, z: 10 },
    poker: { x: 0, z: 12 },
    store: { x: -12, z: 9 },
  };
  safeSpawn(rig, SPAWNS.lobby);

  // Controllers attach to rig (prevents “laser somewhere else”)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  // Controls
  try {
    Controls.init({ rig, camera, renderer, spawns: SPAWNS, colliders: [] });
    if (Controls.attachHaloToScene) Controls.attachHaloToScene(scene);
    log("✅ Controls init OK");
  } catch (e) {
    log(`❌ Controls init failed: ${String(e?.message || e)}`);
  }

  // Imports (boss.js removed on purpose)
  const worldMod = await safeImport("./world.js");
  const tableMod = await safeImport("./table.js");  // if your file is tables.js, change to "./tables.js"
  const pokerMod = await safeImport("./poker.js");
  const uiMod    = await safeImport("./ui.js");

  log(`world.js keys: ${worldMod ? Object.keys(worldMod).join(", ") : "(none)"}`);
  log(`table.js keys: ${tableMod ? Object.keys(tableMod).join(", ") : "(none)"}`);
  log(`poker.js keys: ${pokerMod ? Object.keys(pokerMod).join(", ") : "(none)"}`);
  log(`ui.js keys: ${uiMod ? Object.keys(uiMod).join(", ") : "(none)"}`);

  // WORLD
  const worldBuild =
    findCallable(worldMod, ["World", "buildWorld", "build", "initWorld", "createWorld", "default"]);

  let worldContext = null;
  if (worldBuild) {
    worldContext = safeCall("World.build", worldBuild, scene, rig, { renderer, camera, spawns: SPAWNS }) || null;
    log("✅ World build ran");
  } else {
    log("⚠️ World loaded but no build/init/create found");
  }

  // TABLE
  // Support: exported class PokerTable/Table, or object with build/init
  let tableInstance = null;
  const TableCtor = pick(tableMod, ["PokerTable", "Table"]) || (typeof tableMod?.default === "function" ? tableMod.default : null);

  if (typeof TableCtor === "function") {
    // try constructor signatures
    try { tableInstance = new TableCtor(scene, worldContext, { renderer, camera }); }
    catch { try { tableInstance = new TableCtor(scene, worldContext); }
    catch { tableInstance = new TableCtor(scene); } }
    log("✅ Table constructed");
  } else {
    const tableBuild = findCallable(tableMod, ["buildTable", "createTable", "build", "init", "default", "Table"]);
    if (tableBuild) {
      tableInstance = safeCall("Table.build", tableBuild, scene, worldContext, { renderer, camera }) || null;
      log("✅ Table build/init ran");
    } else {
      log("⚠️ Table loaded but no constructor/build/init found");
    }
  }

  // POKER (this is your missing piece)
  const pokerStart = findCallable(pokerMod, [
    "init", "initPoker", "start", "startPoker", "build", "buildPoker", "setup", "setupPoker",
    "Poker", "PokerGame", "Game", "default"
  ]);

  const pokerApi = pokerStart
    ? safeCall("Poker.start", pokerStart, {
        scene, rig, camera, renderer,
        world: worldContext,
        table: tableInstance,
        spawns: SPAWNS
      })
    : null;

  if (pokerStart) log("✅ Poker start/init/build ran");
  else log("⚠️ Poker module loaded, but no init/start/build/setup found");

  // UI (your other missing piece: menus)
  const uiStart = findCallable(uiMod, [
    "init", "initUI", "start", "startUI", "build", "buildUI", "setup", "setupUI",
    "UI", "Hud", "HUD", "default"
  ]);

  const uiApi = uiStart
    ? safeCall("UI.start", uiStart, {
        scene, rig, camera, renderer,
        world: worldContext,
        table: tableInstance,
        poker: pokerApi || pokerMod || null,
        spawns: SPAWNS
      })
    : null;

  if (uiStart) log("✅ UI start/init/build ran");
  else log("⚠️ UI module loaded, but no init/start/build/setup found");

  // Wire menu toggle to Controls (Y button should toggle if your Controls sends it)
  Controls.onMenuToggle = () => {
    // Try common UI toggles without forcing a rename
    const tryToggle =
      uiApi?.toggleMenu ||
      uiApi?.toggle ||
      uiMod?.toggleMenu ||
      uiMod?.toggle ||
      uiMod?.UI?.toggleMenu ||
      uiMod?.UI?.toggle ||
      uiMod?.default?.toggleMenu ||
      uiMod?.default?.toggle;

    if (typeof tryToggle === "function") safeCall("UI.toggleMenu", tryToggle.bind(uiApi || uiMod || null));
    else log("⚠️ Menu pressed, but no UI toggle function found");
  };

  setStatus(
    `Status: running ✅<br>
     BUILD: ${BUILD_TAG}<br>
     Tip: Quest/Android incognito if old cache persists`
  );

  // Render loop: call update if exposed
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    try { Controls?.update?.(dt); } catch {}

    // World/Poker/UI updates (if they exist)
    try { worldContext?.update?.(dt); } catch {}
    try { pokerApi?.update?.(dt); } catch {}
    try { uiApi?.update?.(dt); } catch {}
    try { pokerMod?.update?.(dt); } catch {}
    try { uiMod?.update?.(dt); } catch {}

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

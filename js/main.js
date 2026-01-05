import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { Controls } from "./controls.js";

/**
 * Skylark Poker VR - MAIN ORCHESTRATOR (Restores existing modules)
 * This file DOES NOT rebuild your game logic.
 * It only loads and wires your existing modules back together safely.
 *
 * Works even if exports are named slightly differently across files.
 */

const BUILD_TAG = "RESTORE-ORCH-v1.0";

// --- tiny HUD logger (so you can see what failed) ---
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
    hud.style.maxHeight = "40vh";
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

// --- SAFE dynamic import helper ---
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

// Find first matching export
function pick(mod, names = []) {
  if (!mod) return null;
  for (const n of names) {
    if (mod[n]) return mod[n];
  }
  // fallback: first function/class export
  for (const k of Object.keys(mod)) {
    if (typeof mod[k] === "function") return mod[k];
    if (typeof mod[k] === "object") return mod[k];
  }
  return null;
}

// Resolve common “World/Table/Poker/UI” patterns without forcing a rename
function resolveWorld(mod) {
  // object-style: export const World = { build(scene, rig, opts)... }
  const worldObj = mod?.World || mod?.world || mod?.default;
  if (worldObj && typeof worldObj === "object") return worldObj;

  // function-style: export function buildWorld(scene, rig)
  const fn = pick(mod, ["build", "buildWorld", "initWorld", "createWorld"]);
  if (typeof fn === "function") {
    return { build: fn };
  }
  return null;
}

function resolveTable(mod) {
  // class-style: export class PokerTable {}
  const cls = pick(mod, ["PokerTable", "Table", "Pokerतालbe", "Poker_Table", "default"]);
  if (typeof cls === "function") return cls;

  // object-style: export const Table = { build/init }
  const obj = pick(mod, ["Table", "table"]);
  if (obj && typeof obj === "object") return obj;

  return null;
}

function resolvePoker(mod) {
  // typical: export const Poker = { init/update/... }
  const obj = pick(mod, ["Poker", "poker", "PokerGame", "Game", "default"]);
  return obj || null;
}

function resolveUI(mod) {
  // typical: export const UI = { init/update/... }
  const obj = pick(mod, ["UI", "ui", "Hud", "HUD", "default"]);
  return obj || null;
}

function safeSpawn(rig, x, z) {
  rig.position.set(x, 0, z);
  rig.rotation.set(0, 0, 0);
}

// main boot
export async function boot(statusEl) {
  const setStatus = (t) => { if (statusEl) statusEl.innerHTML = String(t); };

  log(`🧾 BUILD: ${BUILD_TAG}`);

  // --- Renderer ---
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

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  // Rig + Camera
  const rig = new THREE.Group();
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // Basic lights (so even if world fails you still see something)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202040, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(12, 16, 10);
  scene.add(sun);

  // Safety floor (so you’re never “under the void”)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ensure you DO NOT spawn inside table
  const SPAWNS = {
    lobby: { x: 0, z: 10 },
    poker: { x: 0, z: 12 },
    store: { x: -12, z: 9 },
  };
  safeSpawn(rig, SPAWNS.lobby.x, SPAWNS.lobby.z);

  // Attach controllers to rig (keeps lasers with YOU)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  // Init Controls (your existing controls.js)
  try {
    Controls.init({ rig, camera, renderer, spawns: SPAWNS, colliders: [] });
    if (Controls.attachHaloToScene) Controls.attachHaloToScene(scene);
    log("✅ Controls init OK");
  } catch (e) {
    log(`❌ Controls init failed: ${String(e?.message || e)}`);
  }

  // --- Load your existing modules (DO NOT rename them) ---
  // If your files are named slightly differently, just rename the path below (lowercase matters on GitHub Pages).
  const worldMod = await safeImport("./world.js");
  const tableMod = await safeImport("./table.js");   // or "./tables.js" if that is your file
  const pokerMod = await safeImport("./poker.js");
  const uiMod    = await safeImport("./ui.js");
  const botsMod  = await safeImport("./bots.js");    // optional if you have it
  const bossMod  = await safeImport("./boss.js");    // optional if you have it

  const World = resolveWorld(worldMod);
  const Table = resolveTable(tableMod);
  const Poker = resolvePoker(pokerMod);
  const UI    = resolveUI(uiMod);

  // --- Bring back the build in order ---
  // 1) World
  let worldContext = null;
  if (World?.build) {
    try {
      // Support: build(scene, rig) OR build(scene, rig, opts)
      worldContext = World.build(scene, rig, { renderer, camera, spawns: SPAWNS }) || null;
      log("✅ World.build() ran");
    } catch (e) {
      log(`❌ World.build failed: ${String(e?.message || e)}`);
    }
  } else {
    log("⚠️ World module loaded, but no build() found. (exports mismatch)");
  }

  // 2) Table
  let tableInstance = null;
  try {
    if (typeof Table === "function") {
      // class or function
      // common patterns:
      // new PokerTable(scene, world) or new PokerTable(scene)
      try {
        tableInstance = new Table(scene, worldContext, { renderer, camera });
      } catch {
        tableInstance = new Table(scene, worldContext);
      }
      log("✅ Table constructed");
    } else if (Table?.build) {
      tableInstance = Table.build(scene, worldContext, { renderer, camera }) || null;
      log("✅ Table.build() ran");
    } else if (Table?.init) {
      tableInstance = Table.init(scene, worldContext, { renderer, camera }) || null;
      log("✅ Table.init() ran");
    } else {
      log("⚠️ Table module loaded, but no constructor/build/init found.");
    }
  } catch (e) {
    log(`❌ Table init failed: ${String(e?.message || e)}`);
  }

  // 3) Poker (game loop logic)
  try {
    if (Poker?.init) {
      Poker.init({
        scene,
        rig,
        camera,
        renderer,
        world: worldContext,
        table: tableInstance,
        bots: botsMod || null,
        boss: bossMod || null,
        spawns: SPAWNS
      });
      log("✅ Poker.init() ran");
    } else {
      log("⚠️ Poker module loaded, but no init() found.");
    }
  } catch (e) {
    log(`❌ Poker.init failed: ${String(e?.message || e)}`);
  }

  // 4) UI
  try {
    if (UI?.init) {
      UI.init({
        scene,
        rig,
        camera,
        renderer,
        world: worldContext,
        table: tableInstance,
        poker: Poker || null
      });
      log("✅ UI.init() ran");
    } else {
      log("⚠️ UI module loaded, but no init() found.");
    }
  } catch (e) {
    log(`❌ UI.init failed: ${String(e?.message || e)}`);
  }

  // Wire menu toggle to your UI if it supports it
  if (Controls) {
    Controls.onMenuToggle = () => {
      try {
        if (UI?.toggleMenu) UI.toggleMenu();
        else if (UI?.menu?.toggle) UI.menu.toggle();
        else log("⚠️ Menu toggle pressed, but UI has no toggleMenu().");
      } catch (e) {
        log(`❌ UI menu toggle error: ${String(e?.message || e)}`);
      }
    };
  }

  // Status
  setStatus(
    `Status: running ✅<br>
     BUILD: ${BUILD_TAG}<br>
     Tip: if you still see old behavior, use Quest/Android Incognito or clear site data`
  );

  // --- Render loop (calls into your poker/world update if they expose update) ---
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    try { Controls?.update?.(dt); } catch {}

    // If your modules expose update loops, call them
    try { World?.update?.(dt); } catch {}
    try { Poker?.update?.(dt); } catch {}
    try { UI?.update?.(dt); } catch {}

    renderer.render(scene, camera);
  });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// js/world.js — Scarlett MASTER Adapter v4 (FULL)
// Fixes RoomManager.init() "this" binding + supports exported objects like WorldBuilders.build()
// Keeps safe fallback world if anything fails so you can still move.

import * as THREE from "three";

async function safeImport(rel, log) {
  try { return await import(rel); }
  catch (e) { log?.(`[world] safeImport fail ${rel}: ${e.message}`); return null; }
}

function isFn(v){ return typeof v === "function"; }
function isObj(v){ return v && typeof v === "object"; }

// IMPORTANT: if a callable is inside an exported object (RoomManager.init),
// we store thisArg so we can call with .call(thisArg, ctx)
function listCallable(mod) {
  const out = [];
  if (!mod) return out;

  for (const [k, v] of Object.entries(mod)) {
    if (isFn(v)) out.push({ path: k, fn: v, thisArg: null });

    if (isObj(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        if (isFn(v2)) out.push({ path: `${k}.${k2}`, fn: v2, thisArg: v });
      }
    }
  }
  return out;
}

function score(path) {
  const n = path.toLowerCase();
  let s = 0;
  if (n.includes("world")) s += 4;
  if (n.includes("builders")) s += 2;
  if (n.endsWith(".build") || n.includes("build")) s += 4;
  if (n.includes("lights")) s += 1;
  if (n.includes("init")) s += 2;
  if (n.includes("room")) s += 2;
  if (n.includes("spawn")) s += 2;
  if (n.includes("safe")) s += 1;
  return s;
}

function getPath(mod, path) {
  const parts = path.split(".");
  let cur = mod;
  for (const part of parts) cur = cur?.[part];
  return cur;
}

function pickBest(mod, preferredPaths = []) {
  if (!mod) return null;

  // preferred exact paths first
  for (const p of preferredPaths) {
    const cur = getPath(mod, p);
    if (isFn(cur)) {
      // if it's in an object path, bind thisArg to that object
      const parts = p.split(".");
      if (parts.length >= 2) {
        const objPath = parts.slice(0, -1).join(".");
        const obj = getPath(mod, objPath);
        return { path: p, fn: cur, thisArg: isObj(obj) ? obj : null };
      }
      return { path: p, fn: cur, thisArg: null };
    }
  }

  const cands = listCallable(mod);
  if (cands.length === 0) return null;
  if (cands.length === 1) return cands[0];

  cands.sort((a,b) => score(b.path) - score(a.path));
  return cands[0];
}

function ensureFallbackWorld({ scene, rig, log }) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x1d2430 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.userData.isFloor = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(30, 30, 0x2a3646, 0x16202b);
  grid.position.y = 0.002;
  scene.add(grid);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: 0x0e7c3a })
  );
  table.position.set(0, 0.95, -4.2);
  scene.add(table);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 2.2;
    const x = Math.cos(a) * r;
    const z = -4.2 + Math.sin(a) * r;
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.06, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x6f6f6f })
    );
    s.position.set(x, 0.55, z);
    s.rotation.y = -a;
    scene.add(s);
  }

  rig.position.set(0, 0, 0);
  log?.("[world] fallback world ready ✓");
}

export async function build(ctx) {
  const { scene, rig, log } = ctx;
  log("[world] adapter v4 build starting…");

  // Your builders sometimes expect ctx.root + ctx.manifest
  if (!ctx.root) ctx.root = scene;
  if (!ctx.manifest) {
    const map = new Map();
    ctx.manifest = { get: (k) => map.get(k), set: (k,v) => map.set(k,v) };
  }

  // Import your real modules (if they exist)
  const wb   = await safeImport("./world_builders.js", log);
  const rm   = await safeImport("./room_manager.js", log);
  const sp   = await safeImport("./spawn_points.js", log);
  const sw   = await safeImport("./solid_walls.js", log);
  const lt   = await safeImport("./lighting.js", log);
  const lp   = await safeImport("./lights_pack.js", log);
  const tx   = await safeImport("./textures.js", log);
  const deco = await safeImport("./lobby_decor.js", log);
  const wf   = await safeImport("./water_fountain.js", log);

  const steps = [];

  // Known WorldBuilders object from your file
  const lightsFn = pickBest(wb, ["WorldBuilders.lights", "lights"]);
  const buildFn  = pickBest(wb, ["WorldBuilders.build", "buildWorld", "build", "initWorld", "createWorld", "makeWorld"]);
  if (lightsFn) steps.push({ label: `world_builders.${lightsFn.path}()`, ...lightsFn });
  if (buildFn)  steps.push({ label: `world_builders.${buildFn.path}()`, ...buildFn });

  const swFn = pickBest(sw, ["SolidWalls.init", "SolidWalls.build", "buildSolidWalls", "build", "init", "apply"]);
  if (swFn) steps.push({ label: `solid_walls.${swFn.path}()`, ...swFn });

  const ltFn = pickBest(lt, ["applyLighting", "Lighting.apply", "setupLighting", "buildLighting", "initLighting", "build", "init"]);
  if (ltFn) steps.push({ label: `lighting.${ltFn.path}()`, ...ltFn });

  const lpFn = pickBest(lp, ["LightsPack.build", "setupLightsPack", "buildLightsPack", "init", "build"]);
  if (lpFn) steps.push({ label: `lights_pack.${lpFn.path}()`, ...lpFn });

  const txFn = pickBest(tx, ["createTextureKit", "Textures.init", "initTextures", "setupTextures", "buildTextures", "init", "build"]);
  if (txFn) steps.push({ label: `textures.${txFn.path}()`, ...txFn });

  const decoFn = pickBest(deco, ["LobbyDecor.init", "buildLobbyDecor", "init", "build", "setup"]);
  if (decoFn) steps.push({ label: `lobby_decor.${decoFn.path}()`, ...decoFn });

  const wfFn = pickBest(wf, ["WaterFountain.build", "buildWaterFountain", "init", "build", "setup"]);
  if (wfFn) steps.push({ label: `water_fountain.${wfFn.path}()`, ...wfFn });

  // This one was failing because of `this` — v4 binds it correctly
  const rmFn = pickBest(rm, ["RoomManager.init", "RoomManager.initRooms", "initRooms", "init", "build", "setup", "start"]);
  if (rmFn) steps.push({ label: `room_manager.${rmFn.path}()`, ...rmFn });

  const spFn = pickBest(sp, ["SpawnPoints.build", "initSpawnPoints", "build", "init", "setup", "apply"]);
  if (spFn) steps.push({ label: `spawn_points.${spFn.path}()`, ...spFn });

  if (steps.length === 0) {
    log("[world] ⚠️ No callable functions found in your world modules. Using fallback world.");
    ensureFallbackWorld({ scene, rig, log });
    return;
  }

  for (const s of steps) {
    try {
      log(`[world] ▶ ${s.label}`);

      // KEY FIX: preserve `this` for object methods
      const out = s.thisArg ? await s.fn.call(s.thisArg, ctx) : await s.fn(ctx);

      if (out && typeof out === "object") ctx.world_out = out;
      log(`[world] ✅ ${s.label}`);
    } catch (e) {
      log(`[world] ❌ ${s.label} FAILED: ${e.message}`);
      log("[world] Falling back to safe world (so you can keep moving).");
      ensureFallbackWorld({ scene, rig, log });
      return;
    }
  }

  const ground = ctx.world_out?.ground || scene.getObjectByName?.("GROUND");
  if (ground) ground.userData.isFloor = true;

  log("[world] Scarlett world ready ✅");
                                                                   }

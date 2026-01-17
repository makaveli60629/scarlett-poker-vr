import * as THREE from "three";

async function safeImport(rel, log) {
  try { return await import(rel); }
  catch (e) { log?.(`[world] safeImport fail ${rel}: ${e.message}`); return null; }
}

function isFn(v){ return typeof v === "function"; }
function isObj(v){ return v && typeof v === "object"; }

function listCallable(mod) {
  const out = [];
  if (!mod) return out;
  // direct function exports
  for (const [k,v] of Object.entries(mod)) {
    if (isFn(v)) out.push({ path: k, fn: v });
    // exported objects that contain functions (like WorldBuilders.build)
    if (isObj(v)) {
      for (const [k2,v2] of Object.entries(v)) {
        if (isFn(v2)) out.push({ path: `${k}.${k2}`, fn: v2 });
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

function pickBest(mod, preferredPaths=[]) {
  if (!mod) return null;
  // exact preferred paths first
  for (const p of preferredPaths) {
    const parts = p.split(".");
    let cur = mod;
    for (const part of parts) cur = cur?.[part];
    if (isFn(cur)) return { path: p, fn: cur };
  }
  const cands = listCallable(mod);
  if (cands.length === 0) return null;
  // if only one callable, use it
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
  log("[world] adapter v3 build starting…");

  // Many of your modules export OBJECTS (IIFEs), not functions.
  // This v3 adapter discovers callable functions inside exported objects too.
  const wb = await safeImport("./world_builders.js", log);
  const rm = await safeImport("./room_manager.js", log);
  const sp = await safeImport("./spawn_points.js", log);
  const sw = await safeImport("./solid_walls.js", log);
  const lt = await safeImport("./lighting.js", log);
  const lp = await safeImport("./lights_pack.js", log);
  const tx = await safeImport("./textures.js", log);
  const deco = await safeImport("./lobby_decor.js", log);
  const wf = await safeImport("./water_fountain.js", log);

  // Context compat: your builders expect ctx.root + ctx.manifest sometimes
  // so we map root -> scene by default, and provide a tiny manifest shim.
  if (!ctx.root) ctx.root = scene;
  if (!ctx.manifest) {
    const map = new Map();
    ctx.manifest = {
      get: (k) => map.get(k),
      set: (k,v) => map.set(k,v)
    };
  }

  const steps = [];

  // Prefer the exact known shape from your snippet: WorldBuilders.lights + WorldBuilders.build
  const lightsFn = pickBest(wb, ["WorldBuilders.lights","lights"]);
  const buildFn  = pickBest(wb,  ["WorldBuilders.build","buildWorld","build","initWorld","createWorld","makeWorld"]);

  if (lightsFn) steps.push({ label: `world_builders.${lightsFn.path}()`, fn: lightsFn.fn });
  if (buildFn)  steps.push({ label: `world_builders.${buildFn.path}()`, fn: buildFn.fn });

  const swFn = pickBest(sw, ["SolidWalls.build","SolidWalls.init","buildSolidWalls","build","init","apply"]);
  if (swFn) steps.push({ label: `solid_walls.${swFn.path}()`, fn: swFn.fn });

  const ltFn = pickBest(lt, ["Lighting.setup","Lighting.init","setupLighting","buildLighting","initLighting","build","init"]);
  if (ltFn) steps.push({ label: `lighting.${ltFn.path}()`, fn: ltFn.fn });

  const lpFn = pickBest(lp, ["LightsPack.setup","setupLightsPack","buildLightsPack","init","build"]);
  if (lpFn) steps.push({ label: `lights_pack.${lpFn.path}()`, fn: lpFn.fn });

  const txFn = pickBest(tx, ["Textures.init","initTextures","setupTextures","buildTextures","init","build"]);
  if (txFn) steps.push({ label: `textures.${txFn.path}()`, fn: txFn.fn });

  const decoFn = pickBest(deco, ["LobbyDecor.build","buildLobbyDecor","init","build","setup"]);
  if (decoFn) steps.push({ label: `lobby_decor.${decoFn.path}()`, fn: decoFn.fn });

  const wfFn = pickBest(wf, ["WaterFountain.build","buildWaterFountain","init","build","setup"]);
  if (wfFn) steps.push({ label: `water_fountain.${wfFn.path}()`, fn: wfFn.fn });

  const rmFn = pickBest(rm, ["RoomManager.initRooms","initRooms","init","build","setup","start"]);
  if (rmFn) steps.push({ label: `room_manager.${rmFn.path}()`, fn: rmFn.fn });

  const spFn = pickBest(sp, ["SpawnPoints.build","initSpawnPoints","build","init","setup","apply"]);
  if (spFn) steps.push({ label: `spawn_points.${spFn.path}()`, fn: spFn.fn });

  if (steps.length === 0) {
    log("[world] ⚠️ No callable functions found in your world modules. Using fallback world.");
    ensureFallbackWorld({ scene, rig, log });
    return;
  }

  for (const s of steps) {
    try {
      log(`[world] ▶ ${s.label}`);
      const out = await s.fn(ctx);
      // If your builder returns useful anchors, keep them
      if (out && typeof out === "object") ctx.world_out = out;
      log(`[world] ✅ ${s.label}`);
    } catch (e) {
      log(`[world] ❌ ${s.label} FAILED: ${e.message}`);
      log("[world] Falling back to safe world (so you can keep moving).");
      ensureFallbackWorld({ scene, rig, log });
      return;
    }
  }

  // Mark floors if your builder created a ground plane called "GROUND"
  const ground = ctx.world_out?.ground || scene.getObjectByName?.("GROUND");
  if (ground) ground.userData.isFloor = true;

  log("[world] Scarlett world ready ✅");
}

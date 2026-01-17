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
  for (const [k, v] of Object.entries(mod)) {
    if (isFn(v)) out.push({ path: k, fn: v, thisArg: null });
    if (isObj(v)) {
      for (const [k2, v2] of Object.entries(v)) if (isFn(v2)) out.push({ path:`${k}.${k2}`, fn:v2, thisArg:v });
    }
  }
  return out;
}
function getPath(mod, path){ return path.split(".").reduce((a,k)=>a?.[k], mod); }
function pickBest(mod, preferredPaths=[]) {
  if (!mod) return null;
  for (const p of preferredPaths) {
    const cur = getPath(mod, p);
    if (isFn(cur)) {
      const parts = p.split(".");
      if (parts.length >= 2) {
        const obj = getPath(mod, parts.slice(0,-1).join("."));
        return { path:p, fn:cur, thisArg:isObj(obj)?obj:null };
      }
      return { path:p, fn:cur, thisArg:null };
    }
  }
  const c = listCallable(mod);
  return c.length ? c[0] : null;
}

function ensureFallbackWorld({ scene, rig, log }) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,30), new THREE.MeshStandardMaterial({color:0x1d2430}));
  floor.rotation.x = -Math.PI/2;
  floor.userData.isFloor = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(30, 30, 0x2a3646, 0x16202b);
  grid.position.y = 0.002;
  scene.add(grid);

  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,0.08,48), new THREE.MeshStandardMaterial({color:0x0e7c3a}));
  table.position.set(0,0.95,-4.2);
  scene.add(table);

  rig.position.set(0,0,0);
  log?.("[world] fallback world ready ✓");
}

export async function build(ctx) {
  const { scene, rig, log } = ctx;
  log("[world] adapter v7 build starting…");

  if (!ctx.root) ctx.root = scene;
  if (!ctx.manifest) {
    const map = new Map();
    ctx.manifest = { get:(k)=>map.get(k), set:(k,v)=>map.set(k,v) };
  }

  // Your modular world pieces (these ship in this ZIP)
  const wb   = await safeImport("./world_builders.js", log);
  const rm   = await safeImport("./room_manager.js", log);
  const sp   = await safeImport("./spawn_points.js", log);

  const steps = [];

  const lightsFn = pickBest(wb, ["WorldBuilders.lights"]);
  const buildFn  = pickBest(wb, ["WorldBuilders.build"]);
  if (lightsFn) steps.push({ label:`world_builders.${lightsFn.path}()`, ...lightsFn });
  if (buildFn)  steps.push({ label:`world_builders.${buildFn.path}()`, ...buildFn });

  const rmFn = pickBest(rm, ["RoomManager.init"]);
  if (rmFn) steps.push({ label:`room_manager.${rmFn.path}()`, ...rmFn });

  const spFn = pickBest(sp, ["SpawnPoints.apply"]);
  if (spFn) steps.push({ label:`spawn_points.${spFn.path}()`, ...spFn, _callWithCamera:true });

  if (!steps.length) {
    log("[world] ⚠️ No callable functions found. Using fallback world.");
    ensureFallbackWorld({ scene, rig, log });
    return;
  }

  for (const s of steps) {
    try {
      log(`[world] ▶ ${s.label}`);
      let out;
      if (s._callWithCamera) {
        const cam = ctx.camera;
        out = s.thisArg ? await s.fn.call(s.thisArg, cam) : await s.fn(cam);
      } else {
        out = s.thisArg ? await s.fn.call(s.thisArg, ctx) : await s.fn(ctx);
      }
      if (out && typeof out === "object") ctx.world_out = out;
      log(`[world] ✅ ${s.label}`);
    } catch (e) {
      log(`[world] ❌ ${s.label} FAILED: ${e.message}`);
      log("[world] Falling back to safe world (so you can keep moving).");
      ensureFallbackWorld({ scene, rig, log });
      return;
    }
  }

  log("[world] Scarlett world ready ✅");
}

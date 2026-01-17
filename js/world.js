import * as THREE from "three";

async function safeImport(rel, log) {
  try { return await import(rel); }
  catch (e) { log?.(`[world] safeImport fail ${rel}: ${e.message}`); return null; }
}

function pickFn(mod, names) {
  for (const n of names) {
    const fn = mod?.[n];
    if (typeof fn === "function") return { name: n, fn };
  }
  return null;
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
  log("[world] adapter build starting…");

  // Try to activate your real world stack (based on your repo file list)
  // We DO NOT assume exact export names; we probe common ones and log precisely.
  const wb = await safeImport("./world_builders.js", log);
  const rm = await safeImport("./room_manager.js", log);
  const sp = await safeImport("./spawn_points.js", log);
  const sw = await safeImport("./solid_walls.js", log);
  const lt = await safeImport("./lighting.js", log);
  const lp = await safeImport("./lights_pack.js", log);
  const tx = await safeImport("./textures.js", log);
  const deco = await safeImport("./lobby_decor.js", log);
  const wf = await safeImport("./water_fountain.js", log);

  const steps = [];

  const wbFn = pickFn(wb, ["buildWorld","build","initWorld","createWorld","makeWorld"]);
  if (wbFn) steps.push({ label: `world_builders.${wbFn.name}()`, fn: wbFn.fn });

  const swFn = pickFn(sw, ["buildSolidWalls","build","init","apply","createWalls"]);
  if (swFn) steps.push({ label: `solid_walls.${swFn.name}()`, fn: swFn.fn });

  const ltFn = pickFn(lt, ["setupLighting","buildLighting","initLighting","build","init"]);
  if (ltFn) steps.push({ label: `lighting.${ltFn.name}()`, fn: ltFn.fn });

  const lpFn = pickFn(lp, ["setupLightsPack","buildLightsPack","init","build"]);
  if (lpFn) steps.push({ label: `lights_pack.${lpFn.name}()`, fn: lpFn.fn });

  const txFn = pickFn(tx, ["initTextures","setupTextures","buildTextures","init","build"]);
  if (txFn) steps.push({ label: `textures.${txFn.name}()`, fn: txFn.fn });

  const decoFn = pickFn(deco, ["buildLobbyDecor","init","build","setup"]);
  if (decoFn) steps.push({ label: `lobby_decor.${decoFn.name}()`, fn: decoFn.fn });

  const wfFn = pickFn(wf, ["buildWaterFountain","init","build","setup"]);
  if (wfFn) steps.push({ label: `water_fountain.${wfFn.name}()`, fn: wfFn.fn });

  const rmFn = pickFn(rm, ["initRooms","init","build","setup","start"]);
  if (rmFn) steps.push({ label: `room_manager.${rmFn.name}()`, fn: rmFn.fn });

  const spFn = pickFn(sp, ["build","initSpawnPoints","init","setup","apply"]);
  if (spFn) steps.push({ label: `spawn_points.${spFn.name}()`, fn: spFn.fn });

  if (steps.length === 0) {
    log("[world] ⚠️ No Scarlett world builders found (exports mismatch). Using fallback world.");
    ensureFallbackWorld({ scene, rig, log });
    return;
  }

  // Run the discovered steps in order with full diagnostics
  for (const s of steps) {
    try {
      log(`[world] ▶ ${s.label}`);
      await s.fn(ctx);
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

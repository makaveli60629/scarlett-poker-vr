// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_5_PATH_SAFE_ORCH
// - No top-level imports
// - Uses RELATIVE module paths for GitHub Pages project sites
// - Exposes __scarlettRunModuleTest (REAL)
// - Reports loaded + failed modules

const BUILD = "SCARLETT1_WORLD_FULL_v4_5_PATH_SAFE_ORCH";

function dlog(msg) {
  try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {}
  console.log("[world]", msg);
}

async function safeImport(path) {
  const url = `${path}${path.includes("?") ? "&" : "?"}v=${Date.now()}`;
  return import(url);
}

export async function bootWorld({ THREE, scene, rig, camera, renderer, HUD, DIAG, engine }) {
  const log = (s) => dlog(String(s));
  const warn = (...a) => console.warn("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  log(`bootWorld… ${BUILD}`);

  scene.background = new THREE.Color(0x050509);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x202040, 1.0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(2, 6, 2);
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "SCARLETT_FLOOR";
  scene.add(floor);

  const anchors = {
    root: new THREE.Group(),
    room: new THREE.Group(),
    stage: new THREE.Group(),
    table: new THREE.Group(),
    ui: new THREE.Group(),
    debug: new THREE.Group(),
  };
  anchors.root.name = "ANCHORS_ROOT";
  Object.entries(anchors).forEach(([k, g]) => (g.name = `ANCHOR_${k.toUpperCase()}`));
  scene.add(anchors.root);
  anchors.root.add(anchors.room, anchors.stage, anchors.ui, anchors.debug);
  anchors.stage.add(anchors.table);

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 28, 10, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.95, side: THREE.DoubleSide })
  );
  wall.position.y = 5;
  anchors.room.add(wall);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.10, 72),
    new THREE.MeshStandardMaterial({ color: 0x16382a, roughness: 0.92 })
  );
  tableTop.position.set(0, 0.78, -1.3);
  tableTop.name = "POKER_TABLE_TOP";
  anchors.table.add(tableTop);

  const TABLE_Y = tableTop.position.y;

  // ✅ RELATIVE import (IMPORTANT for GitHub Pages project sites)
  try {
    const m = await safeImport("../modules/gestureControl.js");
    const GestureControl = m?.GestureControl || m?.default || null;
    if (GestureControl) {
      GestureControl.tableHeight = TABLE_Y;
      log(`GestureControl ✅ tableHeight=${TABLE_Y.toFixed(3)}`);
      window.SCARLETT = window.SCARLETT || {};
      window.SCARLETT.GestureControl = GestureControl;
    } else {
      warn("GestureControl loaded but no export found");
    }
  } catch (e) {
    warn("GestureControl import failed (non-fatal):", e?.message || String(e));
  }

  // ✅ RELATIVE module manifest (NO leading "/")
  const MODULE_MANIFEST = [
    "../modules/pokerAudio.module.js"
  ];

  const modules = [];
  const status = {};

  const getId = (p) => p.replace(/^.*\//, "").replace(/\?.*$/, "");
  const setStatus = (id, patch) =>
    (status[id] = Object.assign(status[id] || { ok: false, stage: "new", error: "" }, patch));

  async function loadModule(path) {
    const id = getId(path);
    setStatus(id, { stage: "importing", ok: false, error: "" });

    try {
      const m = await safeImport(path);
      const api = m?.default || m;
      const rec = { id: api?.id || id, path, api };
      modules.push(rec);

      setStatus(rec.id, { stage: "ready", ok: true });

      if (typeof api?.init === "function") {
        await api.init({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG, engine });
      }
      return rec;
    } catch (e) {
      setStatus(id, { stage: "failed", ok: false, error: e?.message || String(e) });
      err("module failed:", path, e);
      return null;
    }
  }

  async function runAllModuleTests() {
    const report = {
      ok: true,
      build: BUILD,
      time: new Date().toISOString(),
      manifest: MODULE_MANIFEST.slice(),
      modules: [],
    };

    const seen = new Set();

    for (const rec of modules) {
      seen.add(rec.id);

      const st = status[rec.id] || {};
      let test = { ok: true, note: "no test()" };

      try {
        if (typeof rec.api?.test === "function") {
          test = await rec.api.test({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG, engine });
        }
      } catch (e) {
        test = { ok: false, error: e?.message || String(e) };
      }

      const ok = !!st.ok && (test.ok !== false);
      if (!ok) report.ok = false;

      report.modules.push({ id: rec.id, path: rec.path, ...st, test });
    }

    for (const [id, st] of Object.entries(status)) {
      if (seen.has(id)) continue;
      report.ok = false;
      report.modules.push({ id, path: "(import failed)", ...st, test: { ok: false, note: "module did not load" } });
    }

    return report;
  }

  window.__scarlettWorld = { anchors, modules, status, manifest: MODULE_MANIFEST };
  window.__scarlettRunModuleTest = runAllModuleTests;

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.world = { anchors, tableHeight: TABLE_Y };

  log(`world: loading modules (${MODULE_MANIFEST.length})`);
  for (const p of MODULE_MANIFEST) await loadModule(p);
  log("world: ready ✅");

  return { tableHeight: TABLE_Y, anchors, update(dt){} };
}

export async function createWorld(ctx) { return bootWorld(ctx); }
export default createWorld;

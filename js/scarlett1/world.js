// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_0_ORCH_PERMA
// - Always creates world + anchors
// - Exposes window.__scarlettRunModuleTest (REAL)
// - Safe module manifest (you will fill this list after stability)

export async function bootWorld({ THREE, scene, rig, camera, renderer, HUD, DIAG }) {
  const log = (s) => window.__scarlettDiagWrite?.(String(s));

  // Spine world
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

  // Big room + simple centerpiece
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

  // Module orchestrator
  const MODULE_MANIFEST = [
    // Fill later with your real modules
    // "./modules/world.module.js",
  ];

  const modules = [];
  const status = {}; // id -> {ok, stage, error}

  const getId = (p) => p.replace(/^.*\//, "").replace(/\?.*$/, "");
  const setStatus = (id, patch) => (status[id] = Object.assign(status[id] || { ok: false, stage: "new", error: "" }, patch));

  async function safeImport(path) {
    return import(`${path}${path.includes("?") ? "&" : "?"}v=${Date.now()}`);
  }

  async function loadModule(path) {
    const id = getId(path);
    setStatus(id, { stage: "importing", ok: false, error: "" });
    try {
      const m = await safeImport(path);
      const api = m?.default || m;
      const rec = { id: api.id || id, path, api };
      modules.push(rec);
      setStatus(rec.id, { stage: "ready", ok: true });
      if (typeof api.init === "function") await api.init({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG });
      return rec;
    } catch (e) {
      setStatus(id, { stage: "failed", ok: false, error: e?.message || String(e) });
      return null;
    }
  }

  async function runAllModuleTests() {
    const report = {
      ok: true,
      build: "SCARLETT_WORLD_ORCH_v4_0",
      time: new Date().toISOString(),
      manifest: MODULE_MANIFEST.slice(),
      modules: [],
    };

    for (const rec of modules) {
      const st = status[rec.id] || {};
      let test = { ok: true, note: "no test()" };
      try {
        if (typeof rec.api.test === "function") test = await rec.api.test({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG });
      } catch (e) {
        test = { ok: false, error: e?.message || String(e) };
      }
      const ok = !!st.ok && (test.ok !== false);
      if (!ok) report.ok = false;
      report.modules.push({ id: rec.id, path: rec.path, ...st, test });
    }

    return report;
  }

  // Expose globals (this is what your button needs)
  window.__scarlettWorld = { anchors, modules, status, manifest: MODULE_MANIFEST };
  window.__scarlettRunModuleTest = runAllModuleTests;

  // Load manifest (safe)
  log(`world: loading modules (${MODULE_MANIFEST.length})`);
  for (const p of MODULE_MANIFEST) await loadModule(p);
  log("world: ready ✅");

  return {
    update(dt) {
      // (optional module updates later)
    },
  };
}

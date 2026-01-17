// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v3_0_ORCH_MODULE_MANIFEST_PERMA
// Permanent orchestrator: safe module imports, enable/disable, reload, module test always available.

export async function bootWorld({ THREE, scene, rig, camera, renderer, HUD, DIAG }) {
  const log = (s) => (typeof HUD === "function" ? HUD(String(s)) : console.log("[world]", s));
  const warn = (...a) => console.warn("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  log("world: start");

  // ---------- SPINE WORLD (never black) ----------
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "SCARLETT_FLOOR";
  scene.add(floor);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.95);
  hemi.name = "LIGHT_HEMI";
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(8, 14, 6);
  key.name = "LIGHT_KEY";
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-6, 8, -10);
  fill.name = "LIGHT_FILL";
  scene.add(fill);

  // Anchors
  const anchors = {
    root: new THREE.Group(),
    room: new THREE.Group(),
    stage: new THREE.Group(),
    centerpiece: new THREE.Group(),
    table: new THREE.Group(),
    ui: new THREE.Group(),
    store: new THREE.Group(),
    mannequins: new THREE.Group(),
    debug: new THREE.Group(),
  };
  anchors.root.name = "ANCHORS_ROOT";
  Object.entries(anchors).forEach(([k, g]) => (g.name = `ANCHOR_${k.toUpperCase()}`));
  scene.add(anchors.root);
  anchors.root.add(anchors.room, anchors.stage, anchors.ui, anchors.store, anchors.debug);
  anchors.stage.add(anchors.centerpiece);
  anchors.centerpiece.add(anchors.table);
  anchors.store.add(anchors.mannequins);

  // Big room
  const ROOM_R = 28;
  const WALL_H = 10;

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(ROOM_R, ROOM_R, WALL_H, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide })
  );
  wall.position.y = WALL_H / 2;
  wall.name = "ROOM_WALL";
  anchors.room.add(wall);

  const ceilingRing = new THREE.Mesh(
    new THREE.TorusGeometry(ROOM_R - 1.6, 0.12, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x1a202a, roughness: 0.85 })
  );
  ceilingRing.rotation.x = Math.PI / 2;
  ceilingRing.position.y = WALL_H - 0.45;
  ceilingRing.name = "ROOM_CEILING_RING";
  anchors.room.add(ceilingRing);

  // Center stage divot placeholder
  const divot = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 9.5, 0.9, 64),
    new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 1 })
  );
  divot.position.set(0, -0.45, 0);
  divot.name = "STAGE_DIVOT";
  anchors.stage.add(divot);

  // Centerpiece base + table
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.4, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x202734, roughness: 0.9 })
  );
  base.position.set(0, 0.175, -1.3);
  base.name = "CENTER_BASE";
  anchors.centerpiece.add(base);

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.10, 72),
    new THREE.MeshStandardMaterial({ color: 0x16382a, roughness: 0.92 })
  );
  tableTop.position.set(0, 0.78, -1.3);
  tableTop.name = "POKER_TABLE_TOP";
  anchors.table.add(tableTop);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1.19, 0.075, 16, 90),
    new THREE.MeshStandardMaterial({ color: 0x2c1b12, roughness: 0.85 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0, 0.84, -1.3);
  rail.name = "POKER_RAIL";
  anchors.table.add(rail);

  const passLine = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.68, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  passLine.rotation.x = -Math.PI / 2;
  passLine.position.set(0, 0.835, -1.3);
  passLine.name = "PASS_LINE_RING";
  anchors.table.add(passLine);

  // Store pad placeholder
  const storePad = new THREE.Mesh(
    new THREE.CircleGeometry(4.0, 64),
    new THREE.MeshStandardMaterial({ color: 0x151a22, roughness: 1 })
  );
  storePad.rotation.x = -Math.PI / 2;
  storePad.position.set(10, 0.01, -4);
  storePad.name = "STORE_PAD";
  anchors.store.add(storePad);

  // Debug axes
  const axes = new THREE.AxesHelper(1.2);
  axes.position.set(0, 0.02, 0);
  axes.name = "DEBUG_AXES";
  anchors.debug.add(axes);

  // ---------- MODULE ORCHESTRATOR ----------
  // Your “audit” problem is always the same: missing module import crashes or silently fails.
  // So: safe import, status map, and module test always exists.

  // IMPORTANT: Put your real module filenames here.
  // These paths are relative to /js/scarlett1/world.js
  const MODULE_MANIFEST = [
    // If you already have a module folder, add the real entries:
    // "./modules/world.module.js",
    // "./modules/store.module.js",
    // "./modules/mannequins.module.js",
    // "./modules/chips.module.js",
    // "./modules/dealerButton.module.js",
    // "./modules/cards.module.js",
    // "./modules/hands.module.js",
  ];

  // internal module records
  const modules = []; // {id, path, api}
  const status = {};  // id -> { ok, stage, error, info, enabled }

  function setStatus(id, patch) {
    status[id] = status[id] || { ok: false, stage: "new", error: "", info: "", enabled: true };
    Object.assign(status[id], patch);
  }

  function getIdFromPath(p) {
    return p.replace(/^.*\//, "").replace(/\?.*$/, "");
  }

  async function safeImport(path) {
    // Cache-bust import so updates always load
    const url = `${path}${path.includes("?") ? "&" : "?"}v=${Date.now()}`;
    return import(url);
  }

  async function loadModule(path) {
    const id = getIdFromPath(path);
    setStatus(id, { stage: "importing", error: "", info: "", ok: false });

    try {
      const mod = await safeImport(path);
      const api = mod?.default || mod?.module || mod; // flexible
      if (!api) throw new Error("module export missing (default or named)");

      // Normalize module API
      const rec = { id: api.id || id, path, api };
      modules.push(rec);
      setStatus(rec.id, { stage: "imported", enabled: true });

      // init
      await initModule(rec);
      return rec;
    } catch (e) {
      setStatus(id, { stage: "failed", ok: false, error: e?.message || String(e), enabled: false });
      err("module import failed", path, e);
      return null;
    }
  }

  async function initModule(rec) {
    const id = rec.id;
    if (status[id]?.enabled === false) {
      setStatus(id, { stage: "disabled", ok: false });
      return;
    }

    setStatus(id, { stage: "init", ok: false, error: "" });
    try {
      if (typeof rec.api.init === "function") {
        const info = await rec.api.init({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG });
        setStatus(id, { stage: "ready", ok: true, info: info || "" });
      } else {
        setStatus(id, { stage: "ready", ok: true, info: "no init()" });
      }
    } catch (e) {
      setStatus(id, { stage: "failed", ok: false, error: e?.message || String(e) });
      err(`module init failed: ${id}`, e);
    }
  }

  async function testModule(rec) {
    const id = rec.id;
    try {
      if (typeof rec.api.test === "function") return await rec.api.test({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG });
      return { ok: true, note: "no test()" };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  async function runAllModuleTests() {
    const report = {
      ok: true,
      build: "SCARLETT_WORLD_ORCH_v3_0",
      time: new Date().toISOString(),
      modules: [],
    };

    // Include manifest failures too
    const knownIds = new Set(modules.map((m) => m.id));
    for (const p of MODULE_MANIFEST) {
      const id = getIdFromPath(p);
      if (!knownIds.has(id) && status[id]) {
        report.ok = false;
        report.modules.push({ id, path: p, ...status[id], test: { ok: false, error: status[id].error || "import failed" } });
      }
    }

    for (const rec of modules) {
      const st = status[rec.id] || {};
      const t = await testModule(rec);
      const row = { id: rec.id, path: rec.path, ...st, test: t };
      if (!st.ok || t?.ok === false) report.ok = false;
      report.modules.push(row);
    }

    // Print a compact summary to HUD
    log("MODULE TEST REPORT:");
    report.modules.forEach((m) => {
      const ok = (m.ok && (m.test?.ok !== false));
      log(`${ok ? "✅" : "❌"} ${m.id} stage=${m.stage}${m.error ? " err=" + m.error : ""}`);
    });

    return report;
  }

  async function reloadModule(id) {
    // Soft reload: mark old disabled; re-import same path from manifest if possible
    const rec = modules.find((m) => m.id === id);
    const path = rec?.path || MODULE_MANIFEST.find((p) => getIdFromPath(p) === id);
    if (!path) throw new Error(`No path found for module ${id}`);

    // disable old
    setStatus(id, { enabled: true, stage: "reloading", error: "", ok: false });

    // Remove old module record entry (keep it simple)
    for (let i = modules.length - 1; i >= 0; i--) {
      if (modules[i].id === id) modules.splice(i, 1);
    }

    // Re-import and init
    const r = await loadModule(path);
    return r;
  }

  function setEnabled(id, enabled) {
    enabled = !!enabled;
    setStatus(id, { enabled });
    // If disabling, just mark; module should respect enabled in update if it has one.
    if (!enabled) setStatus(id, { stage: "disabled", ok: false });
    // If enabling, re-init if present
    const rec = modules.find((m) => m.id === id);
    if (enabled && rec) initModule(rec);
  }

  // Update loop for modules
  const updaters = [];
  function rebuildUpdaters() {
    updaters.length = 0;
    for (const rec of modules) {
      if (typeof rec.api.update === "function") updaters.push(rec);
    }
  }

  // Expose EVERYTHING permanently
  window.__scarlettWorld = {
    anchors,
    modules,
    status,
    manifest: MODULE_MANIFEST,
    runAllModuleTests,
    reloadModule,
    setEnabled,
  };

  // Always set module test runner (this is what you’re missing right now)
  window.__scarlettRunModuleTest = runAllModuleTests;

  // Load manifest modules (safe)
  log(`world: loading manifest (${MODULE_MANIFEST.length})`);
  for (const p of MODULE_MANIFEST) {
    const id = getIdFromPath(p);
    setStatus(id, { enabled: true, stage: "queued", ok: false, error: "", info: "" });
    await loadModule(p);
  }
  rebuildUpdaters();

  log("world: ready ✅");
  if (typeof window.__scarlettRefreshModuleList === "function") window.__scarlettRefreshModuleList();

  return {
    anchors,
    update(dt) {
      // run module updaters only if enabled
      for (const rec of updaters) {
        const st = status[rec.id];
        if (st && st.enabled === false) continue;
        try { rec.api.update({ THREE, scene, rig, camera, renderer, anchors, HUD, DIAG }, dt); }
        catch (e) { warn(`module update err: ${rec.id}`, e); }
      }
    },
  };
    }

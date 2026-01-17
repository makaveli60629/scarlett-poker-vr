// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_21_VISUAL_PROOF_ROOM_PIT_STAIRS
// If you don't see the BIG PILLAR + GRID + ROOM WALL, you're not running this file.

import GestureControl from "../modules/gestureControl.js";

export async function bootWorld({ THREE, scene, renderer, camera }) {
  const dwrite = (msg) => { try { window.__scarlettDiagWrite?.(String(msg)); } catch (_) {} };
  const log = (...a) => { console.log("[world]", ...a); dwrite(`[world] ${a.join(" ")}`); };

  log("bootWorld… SCARLETT1_WORLD_FULL_v4_21_VISUAL_PROOF_ROOM_PIT_STAIRS");

  // ===== Scene look (bright enough to be obvious)
  scene.background = new THREE.Color(0x050814);
  scene.fog = new THREE.Fog(0x050814, 6, 60);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x223366, 1.4);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(8, 12, 6);
  scene.add(sun);

  // ===== Rig
  const rig = new THREE.Group();
  rig.name = "PLAYER_RIG";
  scene.add(rig);
  rig.add(camera);

  // Spawn so you face the pit + table area
  rig.position.set(0, 0, 2.0);
  rig.rotation.y = 0;

  // ===== Anchors
  const anchors = {
    root: new THREE.Group(),
    room: new THREE.Group(),
    stage: new THREE.Group(),
    table: new THREE.Group(),
    avatars: new THREE.Group(),
    ui: new THREE.Group(),
    debug: new THREE.Group(),
  };
  anchors.root.name = "ANCHORS_ROOT";
  anchors.room.name = "ANCHOR_ROOM";
  anchors.stage.name = "ANCHOR_STAGE";
  anchors.table.name = "ANCHOR_TABLE";
  anchors.avatars.name = "ANCHOR_AVATARS";
  anchors.ui.name = "ANCHOR_UI";
  anchors.debug.name = "ANCHOR_DEBUG";

  scene.add(anchors.root);
  anchors.root.add(anchors.room, anchors.stage, anchors.ui, anchors.debug);
  anchors.stage.add(anchors.table, anchors.avatars);

  // ===== BIG VISUAL PROOF: grid + pillar you cannot miss
  const grid = new THREE.GridHelper(40, 40, 0xff3355, 0x3355ff);
  grid.position.y = 0.001;
  anchors.room.add(grid);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 6.5, 24),
    new THREE.MeshStandardMaterial({ color: 0xff3355, roughness: 0.3, metalness: 0.1, emissive: 0x33000a, emissiveIntensity: 1.0 })
  );
  pillar.position.set(0, 3.25, -2.0);
  pillar.name = "WORLD_PROOF_PILLAR";
  anchors.room.add(pillar);

  const pillarLight = new THREE.PointLight(0xff3355, 1.5, 18, 2.0);
  pillarLight.position.set(0, 3.25, -2.0);
  anchors.room.add(pillarLight);

  // ===== Main floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  anchors.room.add(floor);

  // ===== Room wall (very visible)
  const roomWall = new THREE.Mesh(
    new THREE.CylinderGeometry(24, 24, 10, 128, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.95, side: THREE.DoubleSide })
  );
  roomWall.position.y = 5;
  anchors.room.add(roomWall);

  // ===== PIT (lowered area)
  const pitDepth = 0.55;
  const pit = new THREE.Group();
  pit.name = "PIT";
  pit.position.y = -pitDepth;
  anchors.stage.add(pit);

  const pitFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ color: 0x0f1320, roughness: 1 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = 0.02;
  pit.add(pitFloor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.95 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    pit.add(m);
    return m;
  };

  const wallH = 0.65;
  mkWall(18, wallH, 0.25, 0, wallH / 2, -9.0);
  mkWall(18, wallH, 0.25, 0, wallH / 2,  9.0);
  mkWall(0.25, wallH, 18, -9.0, wallH / 2, 0);
  mkWall(0.25, wallH, 18,  9.0, wallH / 2, 0);

  // ===== STAIRS (big + obvious)
  const stairs = new THREE.Group();
  stairs.name = "PIT_STAIRS";
  stairs.position.set(0, 0.02, 9.0);
  pit.add(stairs);

  const stairMat = new THREE.MeshStandardMaterial({ color: 0x27314a, roughness: 0.95 });
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, pitDepth / steps + 0.02, 0.85),
      stairMat
    );
    s.position.set(0, -(i + 0.5) * (pitDepth / steps), 0.6 + i * 0.85);
    stairs.add(s);
  }

  // ===== Table data & gesture sync
  const tableData = {
    center: new THREE.Vector3(0, 0.78 - pitDepth, -2.0),
    radius: 1.15,
    railRadius: 1.42,
    seats: 6
  };

  function syncGestureToTable() {
    GestureControl.tableHeight = tableData.center.y;
    GestureControl.tableCenter = { x: tableData.center.x, z: tableData.center.z };
    GestureControl.tableRadius = tableData.railRadius + 0.35;
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.GestureControl = GestureControl;
  }
  syncGestureToTable();

  // ===== Controllers attached to rig (fix “laser left behind”)
  const rightRay  = renderer.xr.getController(1);
  const leftRay   = renderer.xr.getController(0);
  const rightGrip = renderer.xr.getControllerGrip(1);
  const leftGrip  = renderer.xr.getControllerGrip(0);
  rig.add(rightRay, leftRay, rightGrip, leftGrip);

  // ===== Orchestrator (loads your existing modules)
  const MODULE_MANIFEST = [
    "../modules/pokerTable.module.js",
    "../modules/tableArt.module.js",
    "../modules/avatars.module.js",
    "../modules/avatarUI.module.js",
    "../modules/pokerGameplay.module.js",
    "../modules/lobbyStations.module.js",
    "../modules/menuUI.module.js",
    "../modules/interactionHands.module.js",
    "../modules/localPlayer.module.js",
    "../modules/slotsNet.module.js",
  ];

  const modules = [];
  const status = {};
  const setStatus = (id, patch) => (status[id] = Object.assign(status[id] || { ok: false, stage: "new", error: "" }, patch));
  const safeImport = (path) => import(`${path}${path.includes("?") ? "&" : "?"}v=${Date.now()}`);

  async function loadModule(path) {
    const id = path.split("/").pop();
    setStatus(id, { stage: "importing", ok: false, error: "" });
    try {
      const m = await safeImport(path);
      const api = m?.default || m;
      const rec = { id: api.id || id, path, api };
      modules.push(rec);
      setStatus(rec.id, { stage: "ready", ok: true });
      await api.init?.({ THREE, scene, renderer, camera, rig, anchors, floor, pitFloor, tableData, syncGestureToTable, log });
      return rec;
    } catch (e) {
      setStatus(id, { stage: "failed", ok: false, error: e?.message || String(e) });
      return null;
    }
  }

  async function runAllModuleTests() {
    const report = { ok: true, build: "SCARLETT1_WORLD_FULL_v4_21_VISUAL_PROOF_ROOM_PIT_STAIRS", time: new Date().toISOString(), manifest: MODULE_MANIFEST.slice(), modules: [] };
    for (const rec of modules) {
      const st = status[rec.id] || {};
      let test = { ok: true, note: "no test()" };
      try { if (typeof rec.api.test === "function") test = await rec.api.test({ THREE, scene, rig, anchors, tableData }); }
      catch (e) { test = { ok: false, error: e?.message || String(e) }; }
      const ok = !!st.ok && (test.ok !== false);
      if (!ok) report.ok = false;
      report.modules.push({ id: rec.id, path: rec.path, ...st, test });
    }
    return report;
  }

  window.__scarlettWorld = { anchors, rig, modules, status, manifest: MODULE_MANIFEST, tableData };
  window.__scarlettRunModuleTest = runAllModuleTests;

  log(`world: loading modules (${MODULE_MANIFEST.length})`);
  for (const p of MODULE_MANIFEST) await loadModule(p);
  log("world: modules loaded ✅");

  // ===== Update loop
  return {
    rig,
    tableHeight: tableData.center.y,
    update(dt) {
      for (const rec of modules) {
        try { rec.api.update?.(dt, { THREE, scene, renderer, camera, rig, anchors, tableData }); } catch (_) {}
      }
      // spin pillar slowly so you KNOW dt is alive
      pillar.rotation.y += dt * 0.35;
    }
  };
}

export async function createWorld(ctx) { return bootWorld(ctx); }
export default createWorld;

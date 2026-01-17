// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_20_ACTIVATED_ALLINONE_ROOM_PIT_LIGHTS_ORCH
// Always builds: room + pit + lights + rig anchors
// Always loads modules in manifest
// Exposes: window.__scarlettRunModuleTest + window.__scarlettWorld

import GestureControl from "../modules/gestureControl.js";

export async function bootWorld({ THREE, scene, renderer, camera }) {
  const dwrite = (s) => { try { window.__scarlettDiagWrite?.(String(s)); } catch (_) {} };
  const log = (...a) => { console.log("[world]", ...a); dwrite(`[world] ${a.join(" ")}`); };

  log("bootWorld… SCARLETT1_WORLD_FULL_v4_20_ACTIVATED_ALLINONE_ROOM_PIT_LIGHTS_ORCH");

  // -------------------------
  // SCENE / LIGHTS (always)
  // -------------------------
  scene.background = new THREE.Color(0x070a10);

  // base ambience
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a2440, 1.2);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(6, 10, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfd7ff, 0.35);
  fill.position.set(-6, 6, -4);
  scene.add(fill);

  // subtle fog makes the room feel bigger
  scene.fog = new THREE.Fog(0x070a10, 8, 45);

  // -------------------------
  // RIG (move this)
  // -------------------------
  const rig = new THREE.Group();
  rig.name = "PLAYER_RIG";
  scene.add(rig);
  rig.add(camera);

  // -------------------------
  // ANCHORS
  // -------------------------
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

  // -------------------------
  // FLOOR + PIT + STAIRS (always)
  // -------------------------
  // main floor (outside pit)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR_MAIN";
  anchors.room.add(floor);

  // PIT: a lowered stage area where the table sits
  const pit = new THREE.Group();
  pit.name = "PIT";
  anchors.stage.add(pit);

  const pitDepth = 0.55;
  pit.position.y = -pitDepth;

  // pit floor
  const pitFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ color: 0x0f1320, roughness: 1 })
  );
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = 0.02;
  pitFloor.name = "PIT_FLOOR";
  pit.add(pitFloor);

  // pit border walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.95 });
  const mkWall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    pit.add(m);
    return m;
  };

  const wallH = 0.65;
  mkWall(18, wallH, 0.25, 0, wallH/2, -9.0);
  mkWall(18, wallH, 0.25, 0, wallH/2,  9.0);
  mkWall(0.25, wallH, 18, -9.0, wallH/2, 0);
  mkWall(0.25, wallH, 18,  9.0, wallH/2, 0);

  // stairs down into pit (front)
  const stairMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.95 });
  const stairs = new THREE.Group();
  stairs.name = "PIT_STAIRS";
  stairs.position.set(0, 0.02, 9.0); // front edge
  pit.add(stairs);

  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, pitDepth/steps + 0.01, 0.6),
      stairMat
    );
    s.position.set(0, -(i+0.5)*(pitDepth/steps), 0.35 + i*0.62);
    stairs.add(s);
  }

  // room walls (big cylinder)
  const roomWall = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 26, 10, 128, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 0.95, side: THREE.DoubleSide })
  );
  roomWall.position.y = 5;
  roomWall.name = "ROOM_WALL";
  anchors.room.add(roomWall);

  // simple ceiling glow ring
  const glow = new THREE.PointLight(0x88aaff, 0.25, 40, 2.0);
  glow.position.set(0, 7.5, 0);
  anchors.room.add(glow);

  // -------------------------
  // TABLE DATA (modules will refine)
  // -------------------------
  const tableData = {
    center: new THREE.Vector3(0, 0.78 - pitDepth, -2.0), // inside pit space
    radius: 1.15,
    railRadius: 1.42,
    seats: 6
  };

  // Gesture control gate defaults (updated after table module)
  function syncGestureToTable() {
    GestureControl.tableHeight = tableData.center.y;
    GestureControl.tableCenter = { x: tableData.center.x, z: tableData.center.z };
    GestureControl.tableRadius = tableData.railRadius + 0.35;
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.GestureControl = GestureControl;
  }
  syncGestureToTable();

  // -------------------------
  // CONTROLLERS (parented under rig)
  // -------------------------
  const rightRay  = renderer.xr.getController(1);
  const leftRay   = renderer.xr.getController(0);
  const rightGrip = renderer.xr.getControllerGrip(1);
  const leftGrip  = renderer.xr.getControllerGrip(0);

  rig.add(rightRay, leftRay, rightGrip, leftGrip);

  // right hand proxy (visible)
  const handBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  );
  handBox.position.set(0, -0.02, -0.05);
  rightGrip.add(handBox);

  // Laser + reticle
  const raycaster = new THREE.Raycaster();
  const tmpO = new THREE.Vector3();
  const tmpD = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpHit = new THREE.Vector3();

  const laserGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -6)
  ]);
  const laser = new THREE.Line(laserGeom, new THREE.LineBasicMaterial({ color: 0xff3355 }));
  rightRay.add(laser);

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.085, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3355, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  anchors.debug.add(reticle);

  function setLaserLength(d) {
    const a = laser.geometry.attributes.position.array;
    a[5] = -d;
    laser.geometry.attributes.position.needsUpdate = true;
  }

  function updateLaser() {
    if (!renderer.xr.isPresenting) {
      reticle.visible = false;
      laser.visible = false;
      return null;
    }

    laser.visible = true;

    rightRay.getWorldPosition(tmpO);
    rightRay.getWorldQuaternion(tmpQ);
    tmpD.set(0, 0, -1).applyQuaternion(tmpQ).normalize();

    raycaster.set(tmpO, tmpD);
    raycaster.far = 60;

    // hit pit floor first (so reticle isn't stuck under table)
    const hits = raycaster.intersectObject(pitFloor, false);
    if (hits.length) {
      tmpHit.copy(hits[0].point);
      reticle.position.set(tmpHit.x, tmpHit.y + 0.02, tmpHit.z);
      reticle.visible = true;
      setLaserLength(tmpO.distanceTo(tmpHit));
      return tmpHit.clone();
    }

    // fallback: main floor
    const hits2 = raycaster.intersectObject(floor, false);
    if (hits2.length) {
      tmpHit.copy(hits2[0].point);
      reticle.position.set(tmpHit.x, tmpHit.y + 0.02, tmpHit.z);
      reticle.visible = true;
      setLaserLength(tmpO.distanceTo(tmpHit));
      return tmpHit.clone();
    }

    reticle.visible = false;
    setLaserLength(6);
    return null;
  }

  // -------------------------
  // MODULE ORCHESTRATOR (ALL IN ONE)
  // -------------------------
  const MODULE_MANIFEST = [
    "../modules/pokerTable.module.js",
    "../modules/tableArt.module.js",
    "../modules/environmentLighting.module.js",
    "../modules/avatars.module.js",
    "../modules/avatarUI.module.js",
    "../modules/avatarAnimation.module.js",
    "../modules/avatarCustomization.module.js",
    "../modules/localPlayer.module.js",
    "../modules/interactionHands.module.js",
    "../modules/menuUI.module.js",
    "../modules/hud.module.js",
    "../modules/settings.module.js",
    "../modules/pokerGameplay.module.js",
    "../modules/cards.module.js",
    "../modules/chips.module.js",
    "../modules/rulesTexasHoldem.module.js",
    "../modules/lobbyStations.module.js",
    "../modules/slotsNet.module.js",
    "../modules/netSync.module.js",
    "../modules/lobbyMatchmaking.module.js",
    "../modules/pokerAudio.module.js",
  ];

  const modules = [];
  const status = {};

  const setStatus = (id, patch) => {
    status[id] = Object.assign(status[id] || { ok: false, stage: "new", error: "" }, patch);
  };

  async function safeImport(path) {
    const url = `${path}${path.includes("?") ? "&" : "?"}v=${Date.now()}`;
    return import(url);
  }

  async function loadModule(path) {
    const id = path.split("/").pop();
    setStatus(id, { stage: "importing", ok: false, error: "" });
    try {
      const m = await safeImport(path);
      const api = m?.default || m;
      const rec = { id: api.id || id, path, api };
      modules.push(rec);
      setStatus(rec.id, { stage: "ready", ok: true });

      if (typeof api.init === "function") {
        await api.init({
          THREE, scene, renderer, camera,
          rig, anchors,
          floor, pitFloor,
          tableData,
          syncGestureToTable,
          log
        });
      }
      return rec;
    } catch (e) {
      setStatus(id, { stage: "failed", ok: false, error: e?.message || String(e) });
      return null;
    }
  }

  async function runAllModuleTests() {
    const report = {
      ok: true,
      build: "SCARLETT1_WORLD_FULL_v4_20_ACTIVATED_ALLINONE_ROOM_PIT_LIGHTS_ORCH",
      time: new Date().toISOString(),
      manifest: MODULE_MANIFEST.slice(),
      modules: []
    };

    for (const rec of modules) {
      const st = status[rec.id] || {};
      let test = { ok: true, note: "no test()" };
      try {
        if (typeof rec.api.test === "function") test = await rec.api.test({ THREE, scene, rig, anchors, tableData });
      } catch (e) {
        test = { ok: false, error: e?.message || String(e) };
      }
      const ok = !!st.ok && (test.ok !== false);
      if (!ok) report.ok = false;
      report.modules.push({ id: rec.id, path: rec.path, ...st, test });
    }

    return report;
  }

  window.__scarlettWorld = { anchors, modules, status, manifest: MODULE_MANIFEST, tableData, rig };
  window.__scarlettRunModuleTest = runAllModuleTests;

  log(`world: loading modules (${MODULE_MANIFEST.length})`);
  for (const p of MODULE_MANIFEST) await loadModule(p);
  log("world: modules loaded ✅");

  // -------------------------
  // INPUT + LOCOMOTION (kept simple + stable)
  // -------------------------
  const snap = { lock: false };
  const tele = { lock: false };

  function getRightGamepad(session) {
    for (const src of session.inputSources) {
      if (src?.handedness === "right" && src?.gamepad) return src.gamepad;
    }
    return null;
  }

  function snapTurn(x) {
    if (snap.lock) return;
    snap.lock = true;
    rig.rotation.y += (x > 0 ? -1 : 1) * THREE.MathUtils.degToRad(45);
    setTimeout(() => (snap.lock = false), 250);
  }

  function teleportTo(p) {
    if (!p) return;
    const head = new THREE.Vector3();
    camera.getWorldPosition(head);
    rig.position.x += p.x - head.x;
    rig.position.z += p.z - head.z;
    // preserve head height
  }

  // Knock velocity from rightGrip
  const lastGrip = new THREE.Vector3();
  let lastGripInit = false;

  return {
    rig,
    tableHeight: tableData.center.y,
    update(dt) {
      const session = renderer.xr.getSession?.();
      if (!session) return;

      const hit = updateLaser();

      const gp = getRightGamepad(session);
      if (gp) {
        const axX = gp.axes?.[2] ?? 0;
        const axY = gp.axes?.[3] ?? 0;

        const trigger = gp.buttons?.[0]?.value ?? 0;
        const gripBtn = gp.buttons?.[1]?.value ?? 0;

        // snap
        if (Math.abs(axX) > 0.6 && !snap.lock) snapTurn(axX);

        // move (forward/back only, stable)
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        fwd.y = 0; fwd.normalize();
        rig.position.addScaledVector(fwd, -axY * 2.2 * dt);

        const wantsTeleport = (trigger > 0.75) || (gripBtn > 0.75);
        if (!wantsTeleport) tele.lock = false;

        if (wantsTeleport && !tele.lock && hit) {
          tele.lock = true;
          teleportTo(hit);
          setTimeout(() => (tele.lock = false), 180);
        }
      }

      // knock detection (table gated inside GestureControl)
      const p = new THREE.Vector3();
      rightGrip.getWorldPosition(p);
      if (!lastGripInit) {
        lastGrip.copy(p); lastGripInit = true;
      } else {
        const vy = (p.y - lastGrip.y) / Math.max(dt, 0.016);
        lastGrip.copy(p);
        GestureControl.update({
          handedness: "right",
          position: { x: p.x, y: p.y, z: p.z },
          velocity: { x: 0, y: vy, z: 0 }
        });
      }

      // module updates
      for (const rec of modules) {
        try { rec.api.update?.(dt, { THREE, scene, renderer, camera, rig, anchors, tableData }); } catch (_) {}
      }
    }
  };
}

export async function createWorld(ctx) { return bootWorld(ctx); }
export default createWorld;

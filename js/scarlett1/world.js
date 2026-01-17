// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_11_LOCKED_CORE_ORCH_POKER_AVATARS
// - Keeps the proven rig/laser/teleport/snap working core
// - Parents controllers under rig (no detach)
// - Laser aims with rightRay; hand box on rightGrip
// - Knock table-gated via GestureControl
// - Adds a safe module orchestrator for poker table + avatars
// - Exposes __scarlettRunModuleTest and window.__scarlettWorld

import GestureControl from "../modules/gestureControl.js";

export async function bootWorld({ THREE, scene, renderer, camera }) {
  const dwrite = (s) => { try { window.__scarlettDiagWrite?.(String(s)); } catch (_) {} };
  const log = (...a) => { console.log("[world]", ...a); dwrite(`[world] ${a.join(" ")}`); };

  log("bootWorld… SCARLETT1_WORLD_FULL_v4_11_LOCKED_CORE_ORCH_POKER_AVATARS");

  // -------------------------
  // LIGHTING
  // -------------------------
  scene.background = new THREE.Color(0x0b0e14);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303050, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  // -------------------------
  // RIG (MOVE THIS)
  // -------------------------
  const rig = new THREE.Group();
  rig.name = "PLAYER_RIG";
  scene.add(rig);
  rig.add(camera);

  // -------------------------
  // ANCHORS (modules attach here)
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
  // FLOOR + GRID
  // -------------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "FLOOR";
  anchors.room.add(floor);

  const grid = new THREE.GridHelper(300, 300, 0x3a3f55, 0x23283a);
  grid.position.y = 0.01;
  anchors.room.add(grid);

  // -------------------------
  // LOBBY SHELL (starter)
  // -------------------------
  const lobbyWall = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 8, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.9, side: THREE.DoubleSide })
  );
  lobbyWall.position.y = 4;
  anchors.room.add(lobbyWall);

  // -------------------------
  // XR CONTROLLERS (parent under rig so they move with you)
  // -------------------------
  const rightRay  = renderer.xr.getController(1);
  const leftRay   = renderer.xr.getController(0);
  const rightGrip = renderer.xr.getControllerGrip(1);
  const leftGrip  = renderer.xr.getControllerGrip(0);

  rightRay.name = "RIGHT_RAY";
  leftRay.name = "LEFT_RAY";
  rightGrip.name = "RIGHT_GRIP";
  leftGrip.name = "LEFT_GRIP";

  rig.add(rightRay, leftRay, rightGrip, leftGrip);

  // -------------------------
  // Right hand visual (box)
  // -------------------------
  const handBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 0.10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  );
  handBox.position.set(0, -0.02, -0.05);
  handBox.name = "RIGHT_HAND_BOX";
  rightGrip.add(handBox);

  // -------------------------
  // LASER + RETICLE (laser on rightRay so aim is correct)
  // -------------------------
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
  laser.name = "RIGHT_LASER";
  rightRay.add(laser);

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.085, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3355, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  reticle.name = "TELEPORT_RETICLE";
  anchors.debug.add(reticle);

  const hitDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  hitDot.visible = false;
  hitDot.name = "LASER_HIT_DOT";
  anchors.debug.add(hitDot);

  function setLaserLength(d) {
    const a = laser.geometry.attributes.position.array;
    a[5] = -d;
    laser.geometry.attributes.position.needsUpdate = true;
  }

  function updateLaser() {
    if (!renderer.xr.isPresenting) {
      reticle.visible = false;
      hitDot.visible = false;
      laser.visible = false;
      return null;
    }

    laser.visible = true;

    rightRay.getWorldPosition(tmpO);
    rightRay.getWorldQuaternion(tmpQ);
    tmpD.set(0, 0, -1).applyQuaternion(tmpQ).normalize();

    raycaster.set(tmpO, tmpD);
    raycaster.far = 60;

    const hits = raycaster.intersectObject(floor, false);
    if (hits.length) {
      tmpHit.copy(hits[0].point);

      reticle.position.set(tmpHit.x, 0.02, tmpHit.z);
      reticle.visible = true;

      hitDot.position.set(tmpHit.x, 0.03, tmpHit.z);
      hitDot.visible = true;

      setLaserLength(tmpO.distanceTo(tmpHit));
      return tmpHit.clone();
    }

    reticle.visible = false;
    hitDot.visible = false;
    setLaserLength(6);
    return null;
  }

  // -------------------------
  // NAV (right stick) + teleport
  // -------------------------
  const move = { speed: 2.2, strafe: 2.0 };
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
  }

  // -------------------------
  // BASE TABLE DATA (modules can override)
  // -------------------------
  const tableData = {
    center: new THREE.Vector3(0, 0.78, -2),
    radius: 1.2,
    railRadius: 1.45,
    seats: 9
  };

  // GestureControl table gating (updated after pokerTable module may move it)
  function syncGestureToTable() {
    GestureControl.tableHeight = tableData.center.y;
    GestureControl.tableCenter = { x: tableData.center.x, z: tableData.center.z };
    GestureControl.tableRadius = tableData.railRadius;
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.GestureControl = GestureControl;
  }
  syncGestureToTable();

  // -------------------------
  // MODULE ORCHESTRATOR (safe)
  // -------------------------
  const MODULE_MANIFEST = [
    "../modules/pokerTable.module.js",
    "../modules/avatars.module.js",
  ];

  const modules = [];
  const status = {}; // id -> {ok, stage, error}

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
          floor,
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
      build: "SCARLETT1_WORLD_FULL_v4_11_LOCKED_CORE_ORCH_POKER_AVATARS",
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

  // Expose orchestrator globals for your Android/Oculus panel
  window.__scarlettWorld = { anchors, modules, status, manifest: MODULE_MANIFEST, tableData };
  window.__scarlettRunModuleTest = runAllModuleTests;

  log(`world: loading modules (${MODULE_MANIFEST.length})`);
  for (const p of MODULE_MANIFEST) await loadModule(p);
  log("world: modules loaded ✅");

  // -------------------------
  // Knock velocity tracking (rightGrip world Y delta)
  // -------------------------
  const lastGripPos = new THREE.Vector3();
  let lastGripInit = false;

  return {
    rig,
    tableHeight: tableData.center.y,
    update(dt) {
      const session = renderer.xr.getSession?.();
      if (!session) return;

      const hitPoint = updateLaser();

      const gp = getRightGamepad(session);
      if (gp) {
        const axX = gp.axes?.[2] ?? 0;
        const axY = gp.axes?.[3] ?? 0;
        const trigger = gp.buttons?.[0]?.value ?? 0;
        const gripBtn = gp.buttons?.[1]?.value ?? 0;

        if (Math.abs(axX) > 0.6 && !snap.lock) snapTurn(axX);

        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();

        rig.position.addScaledVector(fwd, -axY * move.speed * dt);
        rig.position.addScaledVector(right, axX * move.strafe * dt);

        const wantsTeleport = (trigger > 0.75) || (gripBtn > 0.75);
        if (!wantsTeleport) tele.lock = false;

        if (wantsTeleport && !tele.lock && hitPoint) {
          tele.lock = true;
          teleportTo(hitPoint);
          setTimeout(() => (tele.lock = false), 180);
        }
      }

      // Knock gesture (table gated inside GestureControl)
      const gripWorld = new THREE.Vector3();
      rightGrip.getWorldPosition(gripWorld);

      if (!lastGripInit) {
        lastGripPos.copy(gripWorld);
        lastGripInit = true;
      } else {
        const vy = (gripWorld.y - lastGripPos.y) / Math.max(dt, 0.016);
        lastGripPos.copy(gripWorld);

        GestureControl.update({
          handedness: "right",
          position: { x: gripWorld.x, y: gripWorld.y, z: gripWorld.z },
          velocity: { x: 0, y: vy, z: 0 }
        });
      }

      // Module updates
      for (const rec of modules) {
        try { rec.api.update?.(dt, { THREE, scene, renderer, camera, rig, anchors, tableData }); } catch (_) {}
      }
    }
  };
}

export async function createWorld(ctx) { return bootWorld(ctx); }
export default createWorld;

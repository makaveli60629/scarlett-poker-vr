// /js/world.js — Scarlett HybridWorld MASTER (single-scene, stable API)
// ✅ Builds into ctx.scene (NO private Scene)
// ✅ Restores lobby + table + seats
// ✅ Teleport works with controllers.left/right OR controller1/controller2
// ✅ Does NOT call renderer.render (index does that)
// ✅ Safe in VR + safe on Android diagnostics

import * as THREE from "three";

export const World = (() => {
  const S = {
    THREE,
    scene: null,
    renderer: null,
    camera: null,
    player: null,
    controllers: null,
    log: console.log,

    root: null,
    floor: null,

    // teleport
    ray: null,
    tmpQ: null,
    tmpV: null,
    marker: null,
    triggerHeld: false,

    // timing
    clock: null
  };

  const safeLog = (...a) => { try { S.log?.(...a); } catch {} };

  function ensureRoot() {
    if (S.root && S.root.parent === S.scene) return S.root;
    const g = new THREE.Group();
    g.name = "WorldRoot";
    S.scene.add(g);
    S.root = g;
    return g;
  }

  function ensureLights() {
    // Don’t spam lights if rebuild happens
    const have = S.scene.getObjectByName("WorldLights");
    if (have) return;

    const g = new THREE.Group();
    g.name = "WorldLights";

    g.add(new THREE.HemisphereLight(0x9fb3ff, 0x0b0d14, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(4, 10, 3);
    dir.name = "KeyLight";
    g.add(dir);

    S.scene.add(g);
  }

  function ensureFloor() {
    if (S.floor && S.floor.parent) return S.floor;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.96, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.name = "Floor";
    floor.receiveShadow = false;

    S.scene.add(floor);
    S.floor = floor;
    return floor;
  }

  function buildLobbyAndTable() {
    const root = ensureRoot();

    // Clean previous build if re-run
    const old = root.getObjectByName("BlueprintWorld");
    if (old) root.remove(old);

    const wrap = new THREE.Group();
    wrap.name = "BlueprintWorld";
    root.add(wrap);

    // lobby carpet
    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(9.0, 64),
      new THREE.MeshStandardMaterial({ color: 0x071025, roughness: 0.95 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    carpet.name = "LobbyCarpet";
    wrap.add(carpet);

    // lobby landmark ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.35,
        metalness: 0.25,
        emissive: 0x071025,
        emissiveIntensity: 0.35
      })
    );
    ring.position.set(0, 1.4, 0);
    ring.name = "LobbyRing";
    wrap.add(ring);

    // boundary ring
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e1220, roughness: 0.95 });
    const boundary = new THREE.Mesh(
      new THREE.TorusGeometry(9.2, 0.35, 16, 64),
      wallMat
    );
    boundary.rotation.x = Math.PI / 2;
    boundary.position.set(0, 1.1, 0);
    boundary.name = "LobbyBoundary";
    wrap.add(boundary);

    // hallways + room shells (visual only)
    const hallGeo = new THREE.BoxGeometry(4.0, 2.6, 10.0);

    const hall1 = new THREE.Mesh(hallGeo, wallMat);
    hall1.position.set(-8.5, 1.3, 0);
    hall1.name = "HallwayStore";
    wrap.add(hall1);

    const hall2 = new THREE.Mesh(hallGeo, wallMat);
    hall2.position.set(8.5, 1.3, 0);
    hall2.name = "HallwayScorpion";
    wrap.add(hall2);

    const roomGeo = new THREE.BoxGeometry(10, 3.2, 10);

    const storeRoom = new THREE.Mesh(roomGeo, wallMat);
    storeRoom.position.set(-14.5, 1.6, 0);
    storeRoom.name = "StoreRoomShell";
    wrap.add(storeRoom);

    const scorpionRoom = new THREE.Mesh(roomGeo, wallMat);
    scorpionRoom.position.set(14.5, 1.6, 0);
    scorpionRoom.name = "ScorpionRoomShell";
    wrap.add(scorpionRoom);

    // jumbotron
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5.6),
      new THREE.MeshStandardMaterial({ color: 0x101325, emissive: 0x0b1130, emissiveIntensity: 0.45 })
    );
    screen.position.set(0, 3.1, -10.5);
    screen.name = "Jumbotron";
    wrap.add(screen);

    // TABLE (restored)
    const feltRadius = 2.2;
    const rimRadius = feltRadius + 0.25;
    const tableY = 0.82;

    const pit = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius + 0.9, rimRadius + 0.9, 0.25, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.95 })
    );
    pit.position.set(0, 0.35, 0);
    pit.name = "TablePit";
    wrap.add(pit);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius + 0.35, rimRadius + 0.35, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: 0x141720, roughness: 0.9, metalness: 0.05 })
    );
    body.position.set(0, tableY, 0);
    body.name = "TableBody";
    wrap.add(body);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(feltRadius, feltRadius, 0.10, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.95, metalness: 0.02 })
    );
    felt.position.set(0, tableY + 0.16, 0);
    felt.name = "TableFelt";
    wrap.add(felt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(rimRadius, 0.09, 14, 80),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.1 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, tableY + 0.21, 0);
    rim.name = "TableRim";
    wrap.add(rim);

    // seats (8)
    const seatRadius = rimRadius + 1.05;
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.sin(a) * seatRadius;
      const z = Math.cos(a) * seatRadius;

      const stool = new THREE.Group();
      stool.name = `Seat_${i}`;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 18), stoolMat);
      base.position.y = 0.35;
      stool.add(base);

      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 22), stoolMat);
      top.position.y = 0.62;
      stool.add(top);

      stool.position.set(x, 0, z);
      stool.lookAt(0, 0, 0);

      wrap.add(stool);
    }

    safeLog("[world] blueprint built ✅ (single-scene)");
  }

  function getControllers() {
    // Normalize: support BOTH styles
    const c = S.controllers || {};
    const left = c.left || c.controller1 || c.c1 || null;
    const right = c.right || c.controller2 || c.c2 || null;
    return { left, right };
  }

  function installTeleport() {
    S.ray = new THREE.Raycaster();
    S.tmpQ = new THREE.Quaternion();
    S.tmpV = new THREE.Vector3();

    // remove old marker if exists
    const old = S.scene.getObjectByName("TeleportMarker");
    if (old) S.scene.remove(old);

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    marker.name = "TeleportMarker";
    S.scene.add(marker);
    S.marker = marker;

    const { left, right } = getControllers();

    const onSelectStart = () => { S.triggerHeld = true; };
    const onSelectEnd = () => { S.triggerHeld = false; };

    try { left?.addEventListener("selectstart", onSelectStart); left?.addEventListener("selectend", onSelectEnd); } catch {}
    try { right?.addEventListener("selectstart", onSelectStart); right?.addEventListener("selectend", onSelectEnd); } catch {}

    safeLog("[teleport] installed ✅ (normalized controllers)");
  }

  function updateTeleport() {
    if (!S.renderer?.xr?.isPresenting) {
      if (S.marker) S.marker.visible = false;
      return;
    }

    const { right, left } = getControllers();
    const ctrl = right || left;
    if (!ctrl || !S.ray || !S.floor) {
      if (S.marker) S.marker.visible = false;
      return;
    }

    ctrl.getWorldQuaternion(S.tmpQ);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(S.tmpQ).normalize();
    ctrl.getWorldPosition(S.tmpV);

    S.ray.set(S.tmpV, dir);
    const hits = S.ray.intersectObject(S.floor, false);

    if (!hits.length) {
      if (S.marker) S.marker.visible = false;
      return;
    }

    const p = hits[0].point;
    S.marker.visible = true;
    S.marker.position.copy(p);

    if (S.triggerHeld) {
      // Keep head height stable; move rig on floor
      S.player.position.set(p.x, 0.02, p.z);
      S.triggerHeld = false;
    }
  }

  return {
    // Stable API expected by your index
    async build(ctx) {
      S.THREE = ctx.THREE || THREE;
      S.scene = ctx.scene;
      S.renderer = ctx.renderer;
      S.camera = ctx.camera;
      S.player = ctx.player;
      S.controllers = ctx.controllers || {};
      S.log = ctx.log || console.log;
      S.clock = new THREE.Clock();

      if (!S.scene) throw new Error("World.build(ctx) missing ctx.scene");

      ensureLights();
      ensureFloor();
      ensureRoot();

      // Safe spawn: near table, not 26m away
      S.player.position.set(0, 0.02, 3.5);
      // camera stays inside rig in index; don’t yank it around hard

      buildLobbyAndTable();
      installTeleport();

      safeLog("[world] build complete ✅ (single-scene)");
    },

    // Optional frame hook (index can call this)
    frame(ctx, dt, t) {
      // dt can be provided by index; if not, use clock
      const _dt = (typeof dt === "number") ? dt : (S.clock ? S.clock.getDelta() : 0.016);
      void _dt; void t;

      try { updateTeleport(); } catch {}
    }
  };
})();

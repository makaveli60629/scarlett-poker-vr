// /js/world.js — Scarlett MASTER WORLD (Option B)
// Single-scene architecture: builds into ctx.scene, NEVER creates its own THREE.Scene.
// Center circular lobby + 4 hallways + 4 rooms + sunken table divot + guardrails + jumbotrons + signage.
// Teleport works with controllers.left/right OR controller1/controller2.
// Does NOT call renderer.render() (index owns rendering).

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

    // floor/teleport
    floorMain: null,
    floorPit: null,
    ray: null,
    tmpQ: null,
    tmpV: null,
    marker: null,
    triggerHeld: false,

    // timing
    clock: null,

    // refs
    refs: {
      lobby: null,
      rooms: {},
      hallways: {},
      table: null,
      jumbotrons: []
    }
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
    const existing = S.scene.getObjectByName("WorldLights");
    if (existing) return existing;

    const g = new THREE.Group();
    g.name = "WorldLights";

    // Nice lobby vibe: cool hemi + key + subtle rim
    g.add(new THREE.HemisphereLight(0x9fb3ff, 0x070812, 1.05));

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(6, 12, 6);
    key.name = "KeyLight";
    g.add(key);

    const rim = new THREE.DirectionalLight(0x7fe7ff, 0.35);
    rim.position.set(-8, 10, -6);
    rim.name = "RimLight";
    g.add(rim);

    // Soft ambient fill (cheap + helps Quest)
    const amb = new THREE.AmbientLight(0x0b1130, 0.7);
    amb.name = "AmbientFill";
    g.add(amb);

    S.scene.add(g);
    return g;
  }

  function makeSignTexture(lines = ["SCARLETT"], opts = {}) {
    const w = opts.w || 1024;
    const h = opts.h || 512;
    const bg = opts.bg ?? "rgba(5,6,10,0.0)";
    const fg = opts.fg ?? "#7fe7ff";
    const sub = opts.sub ?? "#ff2d7a";

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");

    // background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // border glow
    ctx.strokeStyle = "rgba(127,231,255,0.35)";
    ctx.lineWidth = 18;
    ctx.strokeRect(22, 22, w - 44, h - 44);

    // title
    ctx.font = "bold 120px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(127,231,255,0.35)";
    ctx.shadowBlur = 26;

    ctx.fillText(lines[0] || "SCARLETT", w / 2, h * 0.42);

    // subtitle
    if (lines[1]) {
      ctx.shadowBlur = 18;
      ctx.font = "600 64px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = sub;
      ctx.fillText(lines[1], w / 2, h * 0.70);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function ensureLobbyAndRooms() {
    const root = ensureRoot();

    // Clear previous build if rebuild happens
    const old = root.getObjectByName("ScarlettLobbyWorld");
    if (old) root.remove(old);

    const W = new THREE.Group();
    W.name = "ScarlettLobbyWorld";
    root.add(W);

    // ---------- MAIN FLOOR (circular lobby plateau) ----------
    const lobbyRadius = 12.0;
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.96,
      metalness: 0.02
    });

    const lobbyFloor = new THREE.Mesh(
      new THREE.CircleGeometry(lobbyRadius, 96),
      floorMat
    );
    lobbyFloor.rotation.x = -Math.PI / 2;
    lobbyFloor.position.y = 0.0;
    lobbyFloor.name = "LobbyFloor";
    W.add(lobbyFloor);

    // Keep a large invisible plane for teleport intersections too
    const floorMain = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    floorMain.rotation.x = -Math.PI / 2;
    floorMain.position.y = 0.0;
    floorMain.name = "TeleportFloorMain";
    W.add(floorMain);
    S.floorMain = floorMain;

    // ---------- LOBBY RIM / WALL RING ----------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e1220, roughness: 0.95, metalness: 0.02 });

    const outerWall = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyRadius + 0.5, 0.55, 18, 120),
      wallMat
    );
    outerWall.rotation.x = Math.PI / 2;
    outerWall.position.set(0, 1.05, 0);
    outerWall.name = "LobbyOuterWall";
    W.add(outerWall);

    // ---------- LOBBY CARPET + CENTER RING ----------
    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(8.6, 96),
      new THREE.MeshStandardMaterial({ color: 0x071025, roughness: 0.95, metalness: 0.01 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    carpet.name = "LobbyCarpet";
    W.add(carpet);

    const landmarkRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.09, 14, 96),
      new THREE.MeshStandardMaterial({
        color: 0x7fe7ff,
        roughness: 0.25,
        metalness: 0.25,
        emissive: 0x071025,
        emissiveIntensity: 0.45
      })
    );
    landmarkRing.rotation.x = Math.PI / 2;
    landmarkRing.position.set(0, 1.35, 0);
    landmarkRing.name = "LobbyLandmarkRing";
    W.add(landmarkRing);

    // ---------- SUNKEN TABLE DIVOT (terrain bowl) ----------
    // Walkable rim at y=0, sunken pit floor at y=-pitDepth.
    const pitDepth = 0.55;
    const pitRadius = 5.1;       // outer edge of the divot opening
    const pitInnerRadius = 3.1;  // floor area around the table
    const pitWallHeight = pitDepth + 0.05;

    // Dark “hole” ring (visual)
    const pitLip = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius, 0.22, 18, 128),
      new THREE.MeshStandardMaterial({ color: 0x07070c, roughness: 0.95 })
    );
    pitLip.rotation.x = Math.PI / 2;
    pitLip.position.set(0, 0.18, 0);
    pitLip.name = "PitLip";
    W.add(pitLip);

    // Sloped wall: approximate with a short cylinder + bevel illusion
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitInnerRadius, pitWallHeight, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.98, metalness: 0.0, side: THREE.DoubleSide })
    );
    pitWall.position.set(0, -pitDepth / 2, 0);
    pitWall.name = "PitWall";
    W.add(pitWall);

    // Pit floor (teleportable surface inside bowl)
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitInnerRadius + 0.55, 96),
      new THREE.MeshStandardMaterial({ color: 0x080a11, roughness: 0.98 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    pitFloor.name = "PitFloor";
    W.add(pitFloor);
    S.floorPit = pitFloor;

    // Guardrail around the rim of the divot (so you can look down safely)
    const railGroup = new THREE.Group();
    railGroup.name = "GuardRail";
    W.add(railGroup);

    const railRadius = pitRadius + 0.35;
    const railTop = new THREE.Mesh(
      new THREE.TorusGeometry(railRadius, 0.06, 12, 128),
      new THREE.MeshStandardMaterial({
        color: 0x151827,
        roughness: 0.55,
        metalness: 0.15,
        emissive: 0x071025,
        emissiveIntensity: 0.18
      })
    );
    railTop.rotation.x = Math.PI / 2;
    railTop.position.set(0, 1.02, 0);
    railTop.name = "RailTop";
    railGroup.add(railTop);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x101325, roughness: 0.65, metalness: 0.12 });
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const x = Math.sin(a) * railRadius;
      const z = Math.cos(a) * railRadius;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.95, 10), postMat);
      post.position.set(x, 0.55, z);
      post.name = `RailPost_${i}`;
      railGroup.add(post);
    }

    // ---------- CENTER TABLE (in the divot) ----------
    const tableGroup = new THREE.Group();
    tableGroup.name = "PokerTableCenter";
    tableGroup.position.set(0, -pitDepth, 0);
    W.add(tableGroup);
    S.refs.table = tableGroup;

    const feltRadius = 2.25;
    const rimRadius = feltRadius + 0.26;
    const tableY = 0.78;

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius + 0.35, rimRadius + 0.35, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x141720, roughness: 0.9, metalness: 0.05 })
    );
    tableBase.position.set(0, tableY, 0);
    tableBase.name = "TableBody";
    tableGroup.add(tableBase);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(feltRadius, feltRadius, 0.10, 80),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.95, metalness: 0.02 })
    );
    felt.position.set(0, tableY + 0.16, 0);
    felt.name = "TableFelt";
    tableGroup.add(felt);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(rimRadius, 0.095, 14, 120),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.1 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, tableY + 0.21, 0);
    rim.name = "TableRim";
    tableGroup.add(rim);

    // Seat ring down in the pit (8 stools)
    const seatRadius = rimRadius + 1.10;
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
      tableGroup.add(stool);
    }

    // ---------- 4 HALLWAYS + 4 ROOMS ----------
    const hallLen = 12.0;
    const hallW = 4.4;
    const hallH = 3.0;

    const roomSize = 12.5;
    const roomH = 3.4;

    const hallGeo = new THREE.BoxGeometry(hallW, hallH, hallLen);
    const roomGeo = new THREE.BoxGeometry(roomSize, roomH, roomSize);

    const rooms = [
      { key: "store",    name: "STORE",    dir: new THREE.Vector3(-1, 0, 0) }, // west
      { key: "scorpion", name: "SCORPION", dir: new THREE.Vector3( 1, 0, 0) }, // east
      { key: "spectate", name: "SPECTATE", dir: new THREE.Vector3( 0, 0,-1) }, // north
      { key: "vip",      name: "VIP",      dir: new THREE.Vector3( 0, 0, 1) }, // south
    ];

    const hallStart = lobbyRadius - 1.2;
    const hallEnd = hallStart + hallLen;
    const roomCenter = hallEnd + roomSize * 0.55;

    for (const r of rooms) {
      const dir = r.dir.clone().normalize();

      // Hallway aligned along dir
      const hall = new THREE.Mesh(hallGeo, wallMat);
      hall.name = `Hall_${r.key}`;

      // Place hallway: center positioned halfway between start/end
      const hallMid = (hallStart + hallEnd) * 0.5;
      hall.position.set(dir.x * hallMid, hallH * 0.5, dir.z * hallMid);

      // rotate hallway so its Z axis points along dir
      const yaw = Math.atan2(dir.x, dir.z);
      hall.rotation.y = yaw;

      W.add(hall);
      S.refs.hallways[r.key] = hall;

      // Room shell
      const room = new THREE.Mesh(roomGeo, wallMat);
      room.name = `Room_${r.key}`;
      room.position.set(dir.x * roomCenter, roomH * 0.5, dir.z * roomCenter);
      room.rotation.y = yaw;
      W.add(room);
      S.refs.rooms[r.key] = room;

      // Door frame (visual)
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(hallW * 0.82, hallH * 0.72, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x0b1130, roughness: 0.8, metalness: 0.05, emissive: 0x071025, emissiveIntensity: 0.25 })
      );
      door.name = `Door_${r.key}`;
      door.position.set(dir.x * hallStart, 1.25, dir.z * hallStart);
      door.rotation.y = yaw;
      W.add(door);

      // Neon room sign
      const tex = makeSignTexture([r.name, "ROOM"]);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 1.6),
        new THREE.MeshStandardMaterial({ map: tex, emissive: 0x0b1130, emissiveIntensity: 0.85, roughness: 1.0, metalness: 0.0 })
      );
      sign.name = `Sign_${r.key}`;
      // Place sign above door, facing lobby
      sign.position.set(dir.x * (hallStart - 0.3), 2.45, dir.z * (hallStart - 0.3));
      sign.rotation.y = yaw + Math.PI; // face toward center
      W.add(sign);
    }

    // ---------- JUMBOTRONS (2 big screens) ----------
    const jTexA = makeSignTexture(["SCARLETT VR", "POKER"]);
    const jumboMatA = new THREE.MeshStandardMaterial({
      map: jTexA,
      emissive: 0x0b1130,
      emissiveIntensity: 1.0,
      roughness: 1.0,
      metalness: 0.0
    });

    const jumbo1 = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.2), jumboMatA);
    jumbo1.name = "Jumbotron_North";
    jumbo1.position.set(0, 3.4, -(lobbyRadius - 0.8));
    jumbo1.rotation.y = 0;
    W.add(jumbo1);

    const jumbo2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.2), jumboMatA);
    jumbo2.name = "Jumbotron_South";
    jumbo2.position.set(0, 3.4, (lobbyRadius - 0.8));
    jumbo2.rotation.y = Math.PI;
    W.add(jumbo2);

    S.refs.jumbotrons = [jumbo1, jumbo2];

    // ---------- “HUD / TAGS HOOKS” PLACEHOLDERS ----------
    // These are *world anchors* you can later attach UI/nameplates to.
    const anchors = new THREE.Group();
    anchors.name = "UIAnchors";
    W.add(anchors);

    const lobbyAnchor = new THREE.Object3D();
    lobbyAnchor.name = "Lobby_UI_Anchor";
    lobbyAnchor.position.set(0, 2.0, 0);
    anchors.add(lobbyAnchor);

    const tableAnchor = new THREE.Object3D();
    tableAnchor.name = "Table_UI_Anchor";
    tableAnchor.position.set(0, -pitDepth + 1.9, 0);
    anchors.add(tableAnchor);

    S.refs.lobby = W;

    safeLog("[world] lobby + 4 rooms + divot table built ✅");
  }

  function getControllers() {
    const c = S.controllers || {};
    const left = c.left || c.controller1 || c.c1 || null;
    const right = c.right || c.controller2 || c.c2 || null;
    return { left, right };
  }

  function installTeleport() {
    S.ray = new THREE.Raycaster();
    S.tmpQ = new THREE.Quaternion();
    S.tmpV = new THREE.Vector3();

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

    safeLog("[teleport] installed ✅");
  }

  function updateTeleport() {
    if (!S.renderer?.xr?.isPresenting) {
      if (S.marker) S.marker.visible = false;
      return;
    }

    const { right, left } = getControllers();
    const ctrl = right || left;
    if (!ctrl || !S.ray || !S.floorMain) {
      if (S.marker) S.marker.visible = false;
      return;
    }

    ctrl.getWorldQuaternion(S.tmpQ);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(S.tmpQ).normalize();
    ctrl.getWorldPosition(S.tmpV);

    S.ray.set(S.tmpV, dir);

    // Prefer pit floor if ray hits it; otherwise main floor plane.
    const hits = [];
    if (S.floorPit) hits.push(...S.ray.intersectObject(S.floorPit, false));
    hits.push(...S.ray.intersectObject(S.floorMain, false));

    if (!hits.length) {
      if (S.marker) S.marker.visible = false;
      return;
    }

    const p = hits[0].point;
    S.marker.visible = true;
    S.marker.position.copy(p);

    if (S.triggerHeld) {
      // Move rig; keep a tiny lift to avoid floor clipping
      S.player.position.set(p.x, 0.02, p.z);
      S.triggerHeld = false;
    }
  }

  return {
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

      ensureRoot();
      ensureLights();
      ensureLobbyAndRooms();
      installTeleport();

      // Spawn: on lobby rim facing center, so you immediately see divot/table
      S.player.position.set(0, 0.02, 8.2);
      // Don’t hard-change camera local pos (index owns it)
      safeLog("[world] build complete ✅ (Option B master)");
    },

    frame(ctx, dt, t) {
      void ctx; void t;
      const _dt = (typeof dt === "number") ? dt : (S.clock ? S.clock.getDelta() : 0.016);
      void _dt;

      try { updateTeleport(); } catch {}
      // Future hooks: animate jumbotrons, bots, particles, etc.
    }
  };
})();

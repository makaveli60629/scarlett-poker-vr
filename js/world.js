// /js/world.js — Scarlett MASTER WORLD (Update 4.8 FULL Option B + VIP Spawn + Door Openings)
// ✅ Single-scene. Uses WorldRoot -> ScarlettLobbyWorld only.
// ✅ 4 door gaps in the circular wall (wall is 4 arc segments, not a full cylinder)
// ✅ 4 hallways + 4 square rooms aligned with those doors
// ✅ VIP room is the spawn location
// ✅ Pink square removed; keep green neon floor ring target when ray hits
// ✅ Pit divot + rail look-down + table + chairs + placeholder cards
// ✅ Works with controller laser + fallback gamepad teleport, and can coexist with hands-only later

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
    clock: null,

    floorMain: null,
    floorPit: null,

    // teleport / aiming
    ray: null,
    aimRing: null,          // ✅ green neon ring (keep)
    aimPoint: new THREE.Vector3(),
    _teleLatch: false,

    // spawn
    spawnVIP: new THREE.Vector3(),

    refs: {
      lobby: null,
      rooms: {},
      hallways: {},
      table: null,
      rail: null,
      jumbotrons: [],
      stream: null,
      lights: null
    }
  };

  const safeLog = (...a) => { try { S.log?.(...a); } catch {} };

  // -----------------------------
  // Materials / Textures
  // -----------------------------
  function getCasinoWallMaterial() {
    const texLoader = new THREE.TextureLoader();
    const wallTex = texLoader.load("assets/textures/casino_wall_diffuse.jpg");
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.ClampToEdgeWrapping;
    wallTex.repeat.set(12, 1);
    wallTex.anisotropy = 16;

    return new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.18,
      metalness: 0.65,
      color: 0xffffff,
      side: THREE.BackSide
    });
  }

  function matFloor() {
    return new THREE.MeshStandardMaterial({
      color: 0x050508,
      roughness: 0.88,
      metalness: 0.06
    });
  }

  function matHall() {
    return new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      roughness: 0.82,
      metalness: 0.10
    });
  }

  function matRoom() {
    return new THREE.MeshStandardMaterial({
      color: 0x070711,
      roughness: 0.78,
      metalness: 0.14
    });
  }

  function matGold() {
    return new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.92
    });
  }

  // -----------------------------
  // Root container
  // -----------------------------
  function ensureRoot() {
    if (S.root && S.root.parent === S.scene) return S.root;
    const g = new THREE.Group();
    g.name = "WorldRoot";
    S.scene.add(g);
    S.root = g;
    return g;
  }

  // -----------------------------
  // Stream (kept simple; still shows on screens if playable)
  // -----------------------------
  function initLobbyStream() {
    const video = document.createElement("video");
    video.id = "lobbyStream";
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.loop = true;
    video.preload = "auto";
    video.muted = false;

    // Ambient station (same as before)
    const streamUrl = "https://hls.somafm.com/hls/groovesalad/128k/program.m3u8";

    const HlsGlobal = (typeof window !== "undefined") ? window.Hls : undefined;
    if (HlsGlobal && HlsGlobal.isSupported && HlsGlobal.isSupported()) {
      const hls = new HlsGlobal();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else {
      video.src = streamUrl;
    }

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    S.refs.stream = { video, texture: tex };
    return tex;
  }

  // -----------------------------
  // Build: FULL Option B
  // -----------------------------
  function buildWorld() {
    const root = ensureRoot();

    const prev = root.getObjectByName("ScarlettLobbyWorld");
    if (prev) root.remove(prev);

    const W = new THREE.Group();
    W.name = "ScarlettLobbyWorld";
    root.add(W);
    S.refs.lobby = W;

    // Dimensions (tuned)
    const lobbyRadius = 12.0;
    const wallHeight  = 8.0;

    const doorGapDeg = 26;                 // width of each doorway gap in degrees
    const doorGap = THREE.MathUtils.degToRad(doorGapDeg);

    const pitRadius = 4.2;
    const pitDepth  = 0.85;

    const hallLen = 10.0;
    const hallW   = 4.0;
    const hallH   = 4.6;

    const roomW   = 12.0;
    const roomD   = 12.0;
    const roomH   = 6.0;

    // Lights
    const lights = new THREE.Group();
    lights.name = "CasinoLights";
    lights.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(6, 10, 4);
    lights.add(key);

    const rim = new THREE.PointLight(0x7fe7ff, 0.45, 30);
    rim.position.set(0, 6, 0);
    lights.add(rim);

    W.add(lights);
    S.refs.lights = lights;

    // ---- 1) Wall as 4 arc segments with gaps (REAL doorways)
    // Door centers: north(0), east(90), south(180), west(270)
    // We'll build arcs BETWEEN door gaps.
    const wallMat = getCasinoWallMaterial();

    const segments = 4;
    const full = Math.PI * 2;
    const quarter = full / segments;

    // We leave a gap centered on each cardinal direction.
    // We'll build each quarter arc minus half-gaps on both ends.
    // For each quarter: thetaStart = i*quarter + doorGap/2; thetaLength = quarter - doorGap
    for (let i = 0; i < 4; i++) {
      const thetaStart = i * quarter + doorGap / 2;
      const thetaLen   = quarter - doorGap;

      const geo = new THREE.CylinderGeometry(
        lobbyRadius + 0.1,
        lobbyRadius + 0.1,
        wallHeight,
        96,
        1,
        true,
        thetaStart,
        thetaLen
      );

      const m = new THREE.Mesh(geo, wallMat);
      m.position.y = wallHeight / 2;
      m.receiveShadow = true;
      W.add(m);
    }

    // ---- 2) Floors: ring + pit divot
    const floorMat = matFloor();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(pitRadius, lobbyRadius, 160),
      floorMat
    );
    ring.name = "LobbyFloorMain";
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0;
    ring.receiveShadow = true;
    W.add(ring);
    S.floorMain = ring;

    const pit = new THREE.Mesh(
      new THREE.CircleGeometry(pitRadius, 96),
      floorMat
    );
    pit.name = "LobbyFloorPit";
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = -pitDepth;
    pit.receiveShadow = true;
    W.add(pit);
    S.floorPit = pit;

    const pitWallGeo = new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 96, 1, true);
    const pitWallMat = new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.92, metalness: 0.04, side: THREE.DoubleSide });
    const pitWall = new THREE.Mesh(pitWallGeo, pitWallMat);
    pitWall.position.y = -pitDepth / 2;
    W.add(pitWall);

    // ---- 3) Rail ring (look down)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(pitRadius + 0.25, 0.08, 16, 180),
      matGold()
    );
    rail.name = "PitGuardRail";
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.95;
    W.add(rail);
    S.refs.rail = rail;

    // ---- 4) Table + chairs + placeholder cards
    const table = new THREE.Group();
    table.name = "CenterPokerTable";
    table.position.set(0, -pitDepth + 0.02, 0);

    const tBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.55, 0.25, 48),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.7, metalness: 0.2 })
    );
    tBase.position.y = 0.15;
    table.add(tBase);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.85, metalness: 0.05 })
    );
    felt.position.y = 0.35;
    table.add(felt);

    // Chairs (8)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.8, metalness: 0.12 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 3.0;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.55), chairMat);
      c.position.set(Math.cos(a) * r, 0.38, Math.sin(a) * r);
      c.lookAt(0, 0.38, 0);
      table.add(c);
    }

    // Placeholder “cards” (simple planes)
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65, metalness: 0.0 });
    for (let i = 0; i < 5; i++) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.34), cardMat);
      card.rotation.x = -Math.PI / 2;
      card.position.set((i - 2) * 0.28, 0.445, 0);
      table.add(card);
    }

    W.add(table);
    S.refs.table = table;

    // ---- 5) Hallways + Rooms aligned to door gaps
    const hallMat = matHall();
    const roomMat = matRoom();

    const defs = [
      { key: "north", angle: 0,              label: "POKER"    },
      { key: "east",  angle: Math.PI / 2,    label: "STORE"    },
      { key: "south", angle: Math.PI,        label: "EVENT"    },
      { key: "west",  angle: -Math.PI / 2,   label: "VIP"      } // ✅ VIP spawn
    ];

    const doorZ = -(lobbyRadius - 0.15); // where the door gap sits relative to center

    for (const d of defs) {
      // hallway
      const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallLen), hallMat);
      hall.name = `Hallway_${d.key}`;
      hall.position.set(0, hallH / 2, doorZ - hallLen / 2);
      hall.rotation.y = d.angle;
      W.add(hall);
      S.refs.hallways[d.key] = hall;

      // room
      const room = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), roomMat);
      room.name = `Room_${d.label}`;
      room.position.set(0, roomH / 2, doorZ - hallLen - roomD / 2);
      room.rotation.y = d.angle;
      W.add(room);
      S.refs.rooms[d.key] = room;

      // doorway header frame (visual “entrance”)
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(hallW + 0.35, 3.1, 0.25),
        matGold()
      );
      frame.position.set(0, 2.05, doorZ + 0.1);
      frame.rotation.y = d.angle;
      W.add(frame);

      // simple sign plate (for now)
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(hallW + 0.2, 1.15),
        new THREE.MeshStandardMaterial({ color: 0x11111a, roughness: 0.7, metalness: 0.2 })
      );
      sign.position.set(0, 2.05, doorZ + 0.22);
      sign.rotation.y = d.angle;
      W.add(sign);
    }

    // ---- 6) Jumbotrons ABOVE each doorway (4 total)
    const streamTex = initLobbyStream();
    const jumboMat = new THREE.MeshStandardMaterial({
      map: streamTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.1
    });

    S.refs.jumbotrons.length = 0;
    const jumboGeo = new THREE.PlaneGeometry(7.8, 4.4);

    for (const d of defs) {
      const j = new THREE.Mesh(jumboGeo, jumboMat);
      j.name = `Jumbotron_${d.key}`;
      j.position.set(0, 5.6, doorZ + 0.35);   // ✅ above doorway
      j.rotation.y = d.angle;
      // face inward
      j.rotateY(Math.PI);
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    // ---- 7) VIP spawn point (inside VIP room)
    // VIP is "west" (angle -90°); we spawn near room center, facing toward lobby.
    // We'll compute a point using the west room transform:
    const vipRoom = S.refs.rooms.west;
    if (vipRoom) {
      const p = new THREE.Vector3(0, 0, -(lobbyRadius - 0.15) - hallLen - roomD / 2 + 2.2);
      // rotate by west angle
      p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
      S.spawnVIP.copy(p);
    } else {
      S.spawnVIP.set(-18, 0, 0);
    }

    safeLog("[world] Update 4.8 built ✅ (doors + halls + rooms + 4 jumbotrons + VIP spawn)");
  }

  // -----------------------------
  // Aim ring (green neon target) — keep this, remove pink square
  // -----------------------------
  function ensureAimRing() {
    if (S.aimRing && S.aimRing.parent) return;

    const ringGeo = new THREE.RingGeometry(0.22, 0.32, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff7f, // ✅ neon green
      transparent: true,
      opacity: 0.95
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = "TeleportAimRing_Green";
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;

    S.scene.add(ring);
    S.aimRing = ring;
  }

  // -----------------------------
  // Teleport using controller laser + gamepad press fallback
  // (Hands-only pinch can be added after; this gets you moving NOW.)
  // -----------------------------
  function getPrimaryRayPose() {
    // Prefer controller ray if available, else camera forward
    const c0 = S.controllers && S.controllers[0];
    if (c0 && c0.matrixWorld) {
      const pos = new THREE.Vector3().setFromMatrixPosition(c0.matrixWorld);
      const rot = new THREE.Matrix4().extractRotation(c0.matrixWorld);
      const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).normalize();
      return { pos, dir, controller: c0 };
    }

    const pos = new THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(S.camera.quaternion).normalize();
    return { pos, dir, controller: null };
  }

  function controllerTeleportPressed(controller) {
    // Generic WebXR gamepad button check
    try {
      const src = controller?.inputSource;
      const gp = src?.gamepad;
      if (!gp || !gp.buttons || !gp.buttons.length) return false;

      // Many devices use button[0] as "trigger/select"
      return !!gp.buttons[0]?.pressed;
    } catch {
      return false;
    }
  }

  function updateTeleport() {
    if (!S.ray) return;

    const { pos, dir, controller } = getPrimaryRayPose();
    S.ray.set(pos, dir);

    const targets = [S.floorMain, S.floorPit].filter(Boolean);
    const hits = S.ray.intersectObjects(targets, false);

    ensureAimRing();

    if (!hits.length) {
      if (S.aimRing) S.aimRing.visible = false;
      S._teleLatch = false;
      return;
    }

    const p = hits[0].point;
    S.aimPoint.copy(p);

    // ✅ show green ring target (keep)
    S.aimRing.visible = true;
    S.aimRing.position.set(p.x, hits[0].object.position.y + 0.01, p.z);

    const pressed = controllerTeleportPressed(controller);

    if (pressed && !S._teleLatch) {
      S._teleLatch = true;

      // teleport
      S.player.position.set(p.x, 0.02, p.z);

      // start stream audio after user action
      const v = S.refs.stream?.video;
      if (v && v.paused) v.play().catch(() => {});
    }

    if (!pressed) S._teleLatch = false;
  }

  function updateAudio() {
    const v = S.refs.stream?.video;
    if (!v || !S.player) return;

    const dist = S.player.position.length(); // from center
    v.volume = Math.max(0, Math.min(1, 1 - (dist / 22)));
  }

  // -----------------------------
  // Public API
  // -----------------------------
  return {
    async build(ctx) {
      Object.assign(S, ctx);
      S.clock = new THREE.Clock();

      ensureRoot();
      buildWorld();

      S.ray = new THREE.Raycaster();
      ensureAimRing();

      // ✅ Spawn in VIP room, facing toward center
      if (S.player) {
        S.player.position.set(S.spawnVIP.x, 0.02, S.spawnVIP.z);

        // Face toward center
        const yaw = Math.atan2(0 - S.spawnVIP.x, 0 - S.spawnVIP.z);
        S.player.rotation.y = yaw;
      }

      safeLog("[world] build complete ✅ (Spawn=VIP, doorways real, pink square removed)");
    },

    frame(ctx, dt) {
      updateTeleport();
      updateAudio();
    }
  };
})();

// /js/world.js — Scarlett MASTER WORLD (Update 4.8.3 FULL - Radial Placement Fix)
// ✅ Fixes "black void" by placing halls/rooms with radial vectors (no bad rotations)
// ✅ VIP spawn lands inside VIP room reliably
// ✅ Door gaps + pit + rail + table + chairs + cards + 4 jumbotrons
// ✅ Green neon aim ring only
// ✅ Crash-proof optional décor

import * as THREE from "three";
console.log("[world] LOADED world.js Update 4.8.3 ✅");

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
    floorMain: null,
    floorPit: null,

    ray: null,
    aimRing: null,
    _teleLatch: false,

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
  // Materials
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

  const matFloor = () => new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.88, metalness: 0.06 });

  // Interiors visible
  const matHall = () => new THREE.MeshStandardMaterial({
    color: 0x0a0a12,
    roughness: 0.82,
    metalness: 0.10,
    side: THREE.BackSide,
    emissive: 0x05060a,
    emissiveIntensity: 0.35
  });

  const matRoom = () => new THREE.MeshStandardMaterial({
    color: 0x070711,
    roughness: 0.78,
    metalness: 0.14,
    side: THREE.BackSide,
    emissive: 0x05060a,
    emissiveIntensity: 0.35
  });

  const matGold = () => new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.22, metalness: 0.92 });

  const matSign = () => new THREE.MeshStandardMaterial({
    color: 0x11111a,
    roughness: 0.75,
    metalness: 0.15,
    emissive: 0x080814,
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide
  });

  // -----------------------------
  // Stream
  // -----------------------------
  function initLobbyStream() {
    const video = document.createElement("video");
    video.id = "lobbyStream";
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.loop = true;
    video.preload = "auto";
    video.muted = false;

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
  // Root
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
  // Aim ring (green neon only)
  // -----------------------------
  function ensureAimRing() {
    if (S.aimRing && S.aimRing.parent) return;

    const ringGeo = new THREE.RingGeometry(0.22, 0.32, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff7f,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = "TeleportAimRing_Green";
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    S.scene.add(ring);
    S.aimRing = ring;
  }

  // Utility: direction vector for an angle (yaw) where 0 = north (toward -Z)
  function dirFromAngle(a) {
    // a=0 -> (0,0,-1), a=+90° -> (+1,0,0), a=180° -> (0,0,+1), a=-90° -> (-1,0,0)
    return new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
  }

  // -----------------------------
  // Build FULL world (radial placement)
  // -----------------------------
  function buildWorld() {
    const root = ensureRoot();
    const prev = root.getObjectByName("ScarlettLobbyWorld");
    if (prev) root.remove(prev);

    const W = new THREE.Group();
    W.name = "ScarlettLobbyWorld";
    root.add(W);
    S.refs.lobby = W;

    // Sizes
    const lobbyRadius = 12.0;
    const wallHeight  = 8.0;
    const doorGap = THREE.MathUtils.degToRad(28);

    const pitRadius = 4.2;
    const pitDepth  = 0.85;

    const hallLen = 10.0;
    const hallW   = 4.2;
    const hallH   = 4.8;

    const roomW   = 13.0;
    const roomD   = 13.0;
    const roomH   = 6.6;

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

    // Circular wall arcs (4 segments with door gaps)
    const wallMat = getCasinoWallMaterial();
    const quarter = (Math.PI * 2) / 4;
    for (let i = 0; i < 4; i++) {
      const thetaStart = i * quarter + doorGap / 2;
      const thetaLen   = quarter - doorGap;
      const geo = new THREE.CylinderGeometry(
        lobbyRadius + 0.1, lobbyRadius + 0.1, wallHeight,
        96, 1, true, thetaStart, thetaLen
      );
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.y = wallHeight / 2;
      W.add(wall);
    }

    // Floors: ring + pit
    const floorMat = matFloor();

    const ring = new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 160), floorMat);
    ring.name = "LobbyFloorMain";
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0;
    W.add(ring);
    S.floorMain = ring;

    const pit = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 96), floorMat);
    pit.name = "LobbyFloorPit";
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = -pitDepth;
    W.add(pit);
    S.floorPit = pit;

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.92, metalness: 0.04, side: THREE.DoubleSide })
    );
    pitWall.position.y = -pitDepth / 2;
    W.add(pitWall);

    // Rail
    const rail = new THREE.Mesh(new THREE.TorusGeometry(pitRadius + 0.25, 0.08, 16, 180), matGold());
    rail.name = "PitGuardRail";
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.95;
    W.add(rail);
    S.refs.rail = rail;

    // Table + chairs + cards placeholders (in pit)
    const table = new THREE.Group();
    table.name = "CenterPokerTable";
    table.position.set(0, -pitDepth + 0.02, 0);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.55, 0.25, 48),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.7, metalness: 0.2 })
    );
    base.position.y = 0.15;
    table.add(base);

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.85, metalness: 0.05 })
    );
    felt.position.y = 0.35;
    table.add(felt);

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.8, metalness: 0.12 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 3.0;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.55), chairMat);
      c.position.set(Math.cos(a) * r, 0.38, Math.sin(a) * r);
      c.lookAt(0, 0.38, 0);
      table.add(c);
    }

    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65, metalness: 0.0, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.34), cardMat);
      card.rotation.x = -Math.PI / 2;
      card.position.set((i - 2) * 0.28, 0.445, 0);
      table.add(card);
    }

    W.add(table);
    S.refs.table = table;

    // Hallways + rooms (RADIAL placement)
    // yaw: 0 north, +90 east, 180 south, -90 west
    const defs = [
      { key: "north", yaw: 0,                label: "POKER" },
      { key: "east",  yaw: Math.PI / 2,      label: "STORE" },
      { key: "south", yaw: Math.PI,          label: "EVENT" },
      { key: "west",  yaw: -Math.PI / 2,     label: "VIP" }
    ];

    for (const d of defs) {
      const dir = dirFromAngle(d.yaw);

      // Door location (just inside wall)
      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);

      // Hall center
      const hallCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen / 2);

      // Room center
      const roomCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD / 2);

      // Hall mesh
      const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallLen), matHall());
      hall.name = `Hallway_${d.key}`;
      hall.position.set(hallCenter.x, hallH / 2, hallCenter.z);
      hall.rotation.y = d.yaw;
      W.add(hall);
      S.refs.hallways[d.key] = hall;

      // Room mesh
      const room = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), matRoom());
      room.name = `Room_${d.label}`;
      room.position.set(roomCenter.x, roomH / 2, roomCenter.z);
      room.rotation.y = d.yaw;
      W.add(room);
      S.refs.rooms[d.key] = room;

      // Door frame at doorway
      const frame = new THREE.Mesh(new THREE.BoxGeometry(hallW + 0.55, 3.3, 0.25), matGold());
      frame.position.set(doorPos.x, 2.15, doorPos.z);
      frame.rotation.y = d.yaw;
      W.add(frame);

      // Sign plate
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(hallW + 0.25, 1.15), matSign());
      sign.position.set(doorPos.x, 2.15, doorPos.z + 0.02);
      sign.rotation.y = d.yaw;
      W.add(sign);

      // Optional doorway light (crash-proof)
      try {
        const light = new THREE.PointLight(0xff2d7a, 0.35, 8);
        light.position.set(doorPos.x, 3.1, doorPos.z);
        W.add(light);
      } catch (e) {
        safeLog("[world] doorway light skipped:", e);
      }
    }

    // Jumbotrons above each doorway (RADIAL placement)
    const streamTex = initLobbyStream();
    const jumboMat = new THREE.MeshStandardMaterial({
      map: streamTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    S.refs.jumbotrons.length = 0;
    const jumboGeo = new THREE.PlaneGeometry(7.8, 4.4);

    for (const d of defs) {
      const dir = dirFromAngle(d.yaw);
      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);

      const j = new THREE.Mesh(jumboGeo, jumboMat);
      j.name = `Jumbotron_${d.key}`;

      // place above doorway, pulled slightly inward
      const jPos = doorPos.clone().multiplyScalar(0.98);
      j.position.set(jPos.x, 5.75, jPos.z);
      j.rotation.y = d.yaw + Math.PI; // face inward
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    // VIP spawn: inside VIP room (west) a bit toward the back wall
    {
      const vip = defs.find(x => x.key === "west");
      const dir = dirFromAngle(vip.yaw);
      const roomCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD / 2);

      // push deeper into VIP room by 2m
      S.spawnVIP.copy(roomCenter).add(dir.clone().multiplyScalar(2.0));
    }

    safeLog("[world] Update 4.8.3 built ✅ (RADIAL placement, VIP spawn fixed)");
  }

  // -----------------------------
  // Teleport (green ring + press)
  // -----------------------------
  function controllerPressed(controller) {
    try {
      const gp = controller?.inputSource?.gamepad;
      if (!gp?.buttons?.length) return false;
      return !!gp.buttons[0]?.pressed;
    } catch { return false; }
  }

  function updateTeleport() {
    if (!S.ray) return;
    ensureAimRing();

    const c0 = S.controllers && S.controllers[0];
    const pos = c0
      ? new THREE.Vector3().setFromMatrixPosition(c0.matrixWorld)
      : new THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);

    const dir = (() => {
      if (c0) {
        const rot = new THREE.Matrix4().extractRotation(c0.matrixWorld);
        return new THREE.Vector3(0, 0, -1).applyMatrix4(rot).normalize();
      }
      return new THREE.Vector3(0, 0, -1).applyQuaternion(S.camera.quaternion).normalize();
    })();

    S.ray.set(pos, dir);

    const hits = S.ray.intersectObjects([S.floorMain, S.floorPit].filter(Boolean), false);
    if (!hits.length) {
      S.aimRing.visible = false;
      S._teleLatch = false;
      return;
    }

    const p = hits[0].point;
    S.aimRing.visible = true;
    S.aimRing.position.set(p.x, hits[0].object.position.y + 0.01, p.z);

    const pressed = controllerPressed(c0);
    if (pressed && !S._teleLatch) {
      S._teleLatch = true;
      S.player.position.set(p.x, 0.02, p.z);

      const v = S.refs.stream?.video;
      if (v && v.paused) v.play().catch(() => {});
    }
    if (!pressed) S._teleLatch = false;
  }

  function updateAudio() {
    const v = S.refs.stream?.video;
    if (!v || !S.player) return;
    const dist = S.player.position.length();
    v.volume = Math.max(0, Math.min(1, 1 - (dist / 22)));
  }

  return {
    async build(ctx) {
      Object.assign(S, ctx);

      ensureRoot();
      buildWorld();

      S.ray = new THREE.Raycaster();
      ensureAimRing();

      // Spawn VIP and face center
      S.player.position.set(S.spawnVIP.x, 0.02, S.spawnVIP.z);
      S.player.rotation.y = Math.atan2(0 - S.spawnVIP.x, 0 - S.spawnVIP.z);

      safeLog("[world] build complete ✅ (Update 4.8.3)");
    },

    frame(ctx, dt) {
      updateTeleport();
      updateAudio();
    }
  };
})();

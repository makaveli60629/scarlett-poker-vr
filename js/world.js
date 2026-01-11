// /js/world.js — Scarlett MASTER WORLD (Update 4.7 FULL Option B)
// ✅ Single-scene. Appends to S.refs only.
// ✅ Full circular lobby + 4 hallways + 4 rooms + pit divot
// ✅ HLS stream → jumbotrons + ambient audio
// ✅ Hands-only pinch teleport (no marker visuals; removes pink circle & square)

import * as THREE from "three";
// Optional: if you bundle Hls.js, expose it globally as Hls
// import Hls from "hls.js";

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

    ray: null,

    refs: {
      lobby: null,
      rooms: {},
      hallways: {},
      table: null,
      rail: null,
      jumbotrons: [],
      stream: null,
      lights: null
    },

    // teleport state
    triggerHeld: false,
    _pinchLatch: false
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

  function getFloorMaterial() {
    // rich dark casino floor
    return new THREE.MeshStandardMaterial({
      color: 0x050508,
      roughness: 0.85,
      metalness: 0.08
    });
  }

  function getHallMaterial() {
    // slightly lighter for readability
    return new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      roughness: 0.8,
      metalness: 0.12
    });
  }

  function getRoomMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x070711,
      roughness: 0.75,
      metalness: 0.15
    });
  }

  // -----------------------------
  // HLS / Stream
  // -----------------------------
  function initLobbyStream() {
    const video = document.createElement("video");
    video.id = "lobbyStream";
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.loop = true;
    video.muted = false; // will only play after user gesture (teleport)
    video.preload = "auto";

    const streamUrl = "https://hls.somafm.com/hls/groovesalad/128k/program.m3u8";

    // If Hls is available globally (window.Hls), use it. Else fallback.
    const HlsGlobal = (typeof window !== "undefined") ? window.Hls : undefined;
    if (HlsGlobal && HlsGlobal.isSupported && HlsGlobal.isSupported()) {
      const hls = new HlsGlobal();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else {
      // Some browsers won’t play m3u8 directly; that’s okay.
      video.src = streamUrl;
    }

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    S.refs.stream = { video, texture: tex };
    return tex;
  }

  // -----------------------------
  // Root / World container
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
  // Build Full Option B World
  // -----------------------------
  function ensureLobbyAndRooms() {
    const root = ensureRoot();

    const prev = root.getObjectByName("ScarlettLobbyWorld");
    if (prev) root.remove(prev);

    const W = new THREE.Group();
    W.name = "ScarlettLobbyWorld";
    root.add(W);

    // Dimensions (tuned for Quest comfort)
    const lobbyRadius = 12.0;
    const wallHeight = 8.0;

    const hallLen = 10.0;
    const hallW = 4.0;
    const hallH = 4.5;

    const roomW = 12.0;
    const roomD = 12.0;
    const roomH = 6.0;

    const pitRadius = 4.2;
    const pitDepth = 0.8; // ✅ divot depth

    // 1) Lights (casino mood)
    const lights = new THREE.Group();
    lights.name = "CasinoLights";

    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    lights.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(6, 10, 4);
    key.castShadow = false;
    lights.add(key);

    const rim = new THREE.PointLight(0x7fe7ff, 0.45, 30);
    rim.position.set(0, 6, 0);
    lights.add(rim);

    W.add(lights);
    S.refs.lights = lights;

    // 2) Circular casino wall
    const wallGeo = new THREE.CylinderGeometry(lobbyRadius + 0.1, lobbyRadius + 0.1, wallHeight, 160, 1, true);
    const casinoWall = new THREE.Mesh(wallGeo, getCasinoWallMaterial());
    casinoWall.position.y = wallHeight / 2;
    casinoWall.receiveShadow = true;
    W.add(casinoWall);

    // 3) Main floor as a ring (hole in center for pit opening)
    const floorMat = getFloorMaterial();
    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(pitRadius, lobbyRadius, 160),
      floorMat
    );
    floorRing.name = "LobbyFloorMain";
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0;
    floorRing.receiveShadow = true;
    W.add(floorRing);
    S.floorMain = floorRing;

    // 4) Pit floor (sunken)
    const pitFloor = new THREE.Mesh(
      new THREE.CircleGeometry(pitRadius, 96),
      floorMat
    );
    pitFloor.name = "LobbyFloorPit";
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -pitDepth;
    pitFloor.receiveShadow = true;
    W.add(pitFloor);
    S.floorPit = pitFloor;

    // 5) Pit wall (vertical ring) so it feels like a divot, not a floating floor
    const pitWallGeo = new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 96, 1, true);
    const pitWallMat = new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide });
    const pitWall = new THREE.Mesh(pitWallGeo, pitWallMat);
    pitWall.position.y = -pitDepth / 2;
    W.add(pitWall);

    // 6) Guard rail ring (so you can walk around and look down)
    const railGeo = new THREE.TorusGeometry(pitRadius + 0.25, 0.08, 16, 160);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.9 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.name = "PitGuardRail";
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.95;
    W.add(rail);
    S.refs.rail = rail;

    // 7) Center table placeholder (you can swap with your real BossTable/TableFactory)
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

    W.add(table);
    S.refs.table = table;

    // 8) Hallways + Rooms (N/E/S/W)
    const hallMat = getHallMaterial();
    const roomMat = getRoomMaterial();

    const dirs = [
      { key: "north", angle: 0,     name: "Scorpion" },
      { key: "east",  angle: Math.PI/2, name: "Store" },
      { key: "south", angle: Math.PI,   name: "Spectate" },
      { key: "west",  angle: -Math.PI/2, name: "VIP" }
    ];

    for (const d of dirs) {
      // hallway box
      const hall = new THREE.Mesh(
        new THREE.BoxGeometry(hallW, hallH, hallLen),
        hallMat
      );
      hall.name = `Hallway_${d.key}`;
      hall.position.set(0, hallH/2, -(lobbyRadius + hallLen/2 - 0.2));
      hall.rotation.y = d.angle;
      W.add(hall);
      S.refs.hallways[d.key] = hall;

      // room box at end of hallway
      const room = new THREE.Mesh(
        new THREE.BoxGeometry(roomW, roomH, roomD),
        roomMat
      );
      room.name = `Room_${d.name}`;
      room.position.set(0, roomH/2, -(lobbyRadius + hallLen + roomD/2 - 0.6));
      room.rotation.y = d.angle;
      W.add(room);
      S.refs.rooms[d.key] = room;
    }

    // 9) Jumbotrons (4 sides) using stream texture
    const streamTex = initLobbyStream();
    const jumboMat = new THREE.MeshStandardMaterial({
      map: streamTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.1
    });

    // Clear old
    S.refs.jumbotrons.length = 0;

    const jumboGeo = new THREE.PlaneGeometry(9.5, 5.2);
    for (let i = 0; i < 4; i++) {
      const j = new THREE.Mesh(jumboGeo, jumboMat);
      j.name = `Jumbotron_${i}`;
      j.position.set(0, 3.6, -(lobbyRadius - 0.75));
      j.rotation.y = (i * Math.PI) / 2;
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    // 10) Store stream anchor (logical)
    // (If you later add a table UI anchor object, attach stream audio to that instead.)
    S.refs.lobby = W;

    safeLog("[world] Option B FULL lobby + rooms + pit + rail + jumbotrons ✅");
  }

  // -----------------------------
  // Pinch Detection (Hands-Only)
  // -----------------------------
  function isPinching(hand) {
    // Works if XRHand joints exist
    // pinch = thumb tip close to index tip
    try {
      const thumb = hand.joints?.["thumb-tip"];
      const index = hand.joints?.["index-finger-tip"];
      if (!thumb || !index) return false;

      const a = new THREE.Vector3().setFromMatrixPosition(thumb.matrixWorld);
      const b = new THREE.Vector3().setFromMatrixPosition(index.matrixWorld);
      const dist = a.distanceTo(b);
      return dist < 0.028; // tuned for Quest hand scale
    } catch {
      return false;
    }
  }

  // -----------------------------
  // Teleport (NO marker visuals)
  // -----------------------------
  function updateTeleport() {
    const xr = S.renderer?.xr;
    if (!xr?.isPresenting) return;

    const hand = xr.getHand(0);
    if (!hand || !S.ray) return;

    // Ray from hand forward
    const rot = new THREE.Matrix4().extractRotation(hand.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).normalize();
    const pos = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld);

    S.ray.set(pos, dir);

    const targets = [S.floorMain, S.floorPit].filter(Boolean);
    const hits = S.ray.intersectObjects(targets, false);
    if (!hits.length) {
      S._pinchLatch = false;
      return;
    }

    const p = hits[0].point;

    // pinch logic
    const pinchNow = isPinching(hand) || !!S.triggerHeld;

    // one-shot latch so holding pinch doesn't spam teleport
    if (pinchNow && !S._pinchLatch) {
      S._pinchLatch = true;
      S.triggerHeld = false;

      // teleport to surface
      S.player.position.set(p.x, 0.02, p.z);

      // Start stream audio/video only after user gesture (teleport counts)
      const v = S.refs.stream?.video;
      if (v && v.paused) {
        v.play().catch(() => {});
      }
    }

    if (!pinchNow) S._pinchLatch = false;
  }

  // -----------------------------
  // Spatial audio falloff (simple)
  // -----------------------------
  function updateAudio() {
    const v = S.refs.stream?.video;
    if (!v || !S.player) return;

    const center = new THREE.Vector3(0, 0, 0);
    const dist = S.player.position.distanceTo(center);
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
      ensureLobbyAndRooms();

      // raycaster for teleport
      S.ray = new THREE.Raycaster();

      // ✅ IMPORTANT: no marker created → removes pink circle & square permanently
      safeLog("[world] Update 4.7 build complete ✅ (Teleport marker removed)");
    },

    frame(ctx, dt) {
      updateTeleport();
      updateAudio();
    }
  };
})();

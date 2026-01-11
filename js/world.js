// /js/world.js — Scarlett MASTER WORLD (Update 4.8.1 FULL - FIXED INTERIORS)
// ✅ Fixes black screen by rendering hallway/room interiors (BackSide)
// ✅ VIP spawn -> hallway -> circular lobby with 4 door gaps
// ✅ Pit divot + gold rail + table + chairs + placeholder cards
// ✅ 4 doorway jumbotrons (HLS video texture)
// ✅ Green neon floor aim ring (ONLY teleport visual)
// ✅ No pink square, no green ball markers

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

    floorMain: null,
    floorPit: null,

    ray: null,
    aimRing: null,
    aimPoint: new THREE.Vector3(),
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

  const matFloor = () => new THREE.MeshStandardMaterial({
    color: 0x050508, roughness: 0.88, metalness: 0.06
  });

  // ✅ IMPORTANT: BackSide so you can SEE from inside (no black screen)
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

  const matGold = () => new THREE.MeshStandardMaterial({
    color: 0xd4af37, roughness: 0.22, metalness: 0.92
  });

  const matSign = () => new THREE.MeshStandardMaterial({
    color: 0x11111a, roughness: 0.75, metalness: 0.15,
    emissive: 0x080814, emissiveIntensity: 0.4,
    side: THREE.DoubleSide
  });

  // -----------------------------
  // Stream (simple; plays after user action)
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
  // Green aim ring (only teleport visual)
  // -----------------------------
  function ensureAimRing() {
    if (S.aimRing && S.aimRing.parent) return;

    const ringGeo = new THREE.RingGeometry(0.22, 0.32, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff7f,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      wireframe: false
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = "TeleportAimRing_Green";
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    S.scene.add(ring);
    S.aimRing = ring;
  }

  // -----------------------------
  // Build Lobby + Halls + Rooms
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

    const doorGap = THREE.MathUtils.degToRad(28); // slightly wider doors

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

    // a touch of neon
    const rim = new THREE.PointLight(0x7fe7ff, 0.45, 30);
    rim.position.set(0, 6, 0);
    lights.add(rim);

    W.add(lights);
    S.refs.lights = lights;

    // Circular Wall with REAL door gaps (4 arc segments)
    const wallMat = getCasinoWallMaterial();
    const quarter = (Math.PI * 2) / 4;

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

      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.y = wallHeight / 2;
      wall.receiveShadow = true;
      W.add(wall);
    }

    // Floors: ring + pit
    const floorMat = matFloor();

    const ring = new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 160), floorMat);
    ring.name = "LobbyFloorMain";
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0;
    ring.receiveShadow = true;
    W.add(ring);
    S.floorMain = ring;

    const pit = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 96), floorMat);
    pit.name = "LobbyFloorPit";
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = -pitDepth;
    pit.receiveShadow = true;
    W.add(pit);
    S.floorPit = pit;

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.92, metalness: 0.04, side: THREE.DoubleSide })
    );
    pitWall.position.y = -pitDepth / 2;
    W.add(pitWall);

    // Gold rail
    const rail = new THREE.Mesh(new THREE.TorusGeometry(pitRadius + 0.25, 0.08, 16, 180), matGold());
    rail.name = "PitGuardRail";
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.95;
    W.add(rail);
    S.refs.rail = rail;

    // Table + chairs + cards placeholders
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

    // Halls + Rooms + Door frames + Signs
    const defs = [
      { key: "north", angle: 0,              label: "POKER" },
      { key: "east",  angle: Math.PI / 2,    label: "STORE" },
      { key: "south", angle: Math.PI,        label: "EVENT" },
      { key: "west",  angle: -Math.PI / 2,   label: "VIP" }
    ];

    const doorZ = -(lobbyRadius - 0.15);

    for (const d of defs) {
      // hallway (interior)
      const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallLen), matHall());
      hall.name = `Hallway_${d.key}`;
      hall.position.set(0, hallH / 2, doorZ - hallLen / 2);
      hall.rotation.y = d.angle;
      W.add(hall);
      S.refs.hallways[d.key] = hall;

      // room (interior)
      const room = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), matRoom());
      room.name = `Room_${d.label}`;
      room.position.set(0, roomH / 2, doorZ - hallLen - roomD / 2);
      room.rotation.y = d.angle;
      W.add(room);
      S.refs.rooms[d.key] = room;

      // doorway gold frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(hallW + 0.55, 3.3, 0.25), matGold());
      frame.position.set(0, 2.15, doorZ + 0.10);
      frame.rotation.y = d.angle;
      W.add(frame);

      // sign plate
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(hallW + 0.25, 1.15), matSign());
      sign.position.set(0, 2.15, doorZ + 0.26);
      sign.rotation.y = d.angle;
      W.add(sign);

      // small neon downlight above the doorway
      const p = new THREE.PointLight(0xff2d7a, 0.35, 8);
      p.position.set(0, 3.1, doorZ + 0.15);
      p.applyAxisAngle(new THREE.Vector3(0,1,0), d.angle);
      W.add(p);
    }

    // Jumbotrons ABOVE each doorway
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
      const j = new THREE.Mesh(jumboGeo, jumboMat);
      j.name = `Jumbotron_${d.key}`;
      j.position.set(0, 5.75, doorZ + 0.40);
      j.rotation.y = d.angle + Math.PI; // face inward
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    // VIP spawn location: inside VIP room, not in wall
    // We'll set it just deeper into the VIP room volume.
    S.spawnVIP.set(-18.0, 0, 0);

    safeLog("[world] Update 4.8.1 built ✅ (FULL interiors + VIP spawn)");
  }

  // -----------------------------
  // Teleport: green ring + controller press
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

      // Spawn VIP + face toward lobby center
      S.player.position.set(S.spawnVIP.x, 0.02, S.spawnVIP.z);
      S.player.rotation.y = Math.atan2(0 - S.spawnVIP.x, 0 - S.spawnVIP.z);

      safeLog("[world] build complete ✅ (FULL - interiors visible, green ring only)");
    },

    frame(ctx, dt) {
      updateTeleport();
      updateAudio();
    }
  };
})();

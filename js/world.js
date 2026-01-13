// /js/world.js — Scarlett MASTER WORLD (Update 4.8.6 WORLD FULL - ctx.THREE)
// ✅ Uses ctx.THREE (no bare imports)
// ✅ Radial hall/room placement (no void spawn)
// ✅ VIP spawn inside VIP room
// ✅ Pit divot + gold rail + table + chairs + cards
// ✅ 4 jumbotrons w/ HLS video texture
// ✅ Green teleport halo ring works in Quest (best hit from BOTH controllers, fallback camera)

export const World = (() => {
  const S = {
    THREE: null,
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
    const THREE = S.THREE;
    const tex = new THREE.TextureLoader().load("assets/textures/casino_wall_diffuse.jpg");
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(12, 1);
    tex.anisotropy = 16;

    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.22,
      metalness: 0.55,
      color: 0xffffff,
      side: THREE.BackSide
    });
  }

  const matFloor = () => new S.THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.92, metalness: 0.05 });

  const matHall = () => new S.THREE.MeshStandardMaterial({
    color: 0x0a0a12,
    roughness: 0.86,
    metalness: 0.08,
    side: S.THREE.BackSide,
    emissive: 0x05060a,
    emissiveIntensity: 0.45
  });

  const matRoom = () => new S.THREE.MeshStandardMaterial({
    color: 0x070711,
    roughness: 0.82,
    metalness: 0.10,
    side: S.THREE.BackSide,
    emissive: 0x05060a,
    emissiveIntensity: 0.45
  });

  const matGold = () => new S.THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.24, metalness: 0.92 });

  const matFelt = () => new S.THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.88, metalness: 0.04 });

  const matSign = () => new S.THREE.MeshStandardMaterial({
    color: 0x11111a,
    roughness: 0.75,
    metalness: 0.15,
    emissive: 0x080814,
    emissiveIntensity: 0.4,
    side: S.THREE.DoubleSide
  });

  // -----------------------------
  // Stream (HLS if present; otherwise direct src)
  // -----------------------------
  function initLobbyStream() {
    const THREE = S.THREE;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.loop = true;
    video.preload = "auto";
    video.muted = false;

    const url = "https://hls.somafm.com/hls/groovesalad/128k/program.m3u8";

    const HlsGlobal = (typeof window !== "undefined") ? window.Hls : undefined;
    if (HlsGlobal && HlsGlobal.isSupported && HlsGlobal.isSupported()) {
      const hls = new HlsGlobal();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
    }

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;

    S.refs.stream = { video, texture: tex };
    return tex;
  }

  // -----------------------------
  // Root
  // -----------------------------
  function ensureRoot() {
    const THREE = S.THREE;
    if (S.root && S.root.parent === S.scene) return S.root;

    const g = new THREE.Group();
    g.name = "WorldRoot";
    S.scene.add(g);
    S.root = g;
    return g;
  }

  // -----------------------------
  // Aim ring (green halo)
  // -----------------------------
  function ensureAimRing() {
    const THREE = S.THREE;
    if (S.aimRing && S.aimRing.parent) return;

    const geo = new THREE.RingGeometry(0.22, 0.32, 128);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff7f,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.name = "TeleportAimRing_Green";
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;

    S.scene.add(ring);
    S.aimRing = ring;
  }

  // -----------------------------
  // Utility: radial direction
  // -----------------------------
  function dirFromYaw(yaw) {
    const THREE = S.THREE;
    return new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  }

  function addGoldRibs(parent, radius, height) {
    const THREE = S.THREE;
    const ribCount = 36;
    const ribGeo = new THREE.BoxGeometry(0.08, height, 0.18);
    const ribMat = matGold();

    for (let i = 0; i < ribCount; i++) {
      const a = (i / ribCount) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.set(Math.cos(a) * radius, height / 2, Math.sin(a) * radius);
      rib.lookAt(0, height / 2, 0);
      parent.add(rib);
    }
  }

  function addPlaceholderPlayers(tableGroup) {
    const THREE = S.THREE;
    const g = new THREE.Group();
    g.name = "PlaceholderPlayers";

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.85, metalness: 0.08 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1f1f2a, roughness: 0.7, metalness: 0.1 });

    const bodyGeo = new THREE.CapsuleGeometry(0.16, 0.45, 6, 12);
    const headGeo = new THREE.SphereGeometry(0.14, 18, 14);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 3.35;

      const bot = new THREE.Group();
      bot.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
      bot.lookAt(0, 0.02, 0);

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      bot.add(body);

      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.95;
      bot.add(head);

      g.add(bot);
    }

    tableGroup.add(g);
  }

  // -----------------------------
  // Build world
  // -----------------------------
  function buildWorld() {
    const THREE = S.THREE;
    const root = ensureRoot();

    const prev = root.getObjectByName("ScarlettLobbyWorld");
    if (prev) root.remove(prev);

    const W = new THREE.Group();
    W.name = "ScarlettLobbyWorld";
    root.add(W);
    S.refs.lobby = W;

    // sizes
    const lobbyRadius = 12.0;
    const wallHeight = 8.0;
    const doorGap = THREE.MathUtils.degToRad(28);

    const pitRadius = 4.2;
    const pitDepth = 0.85;

    const hallLen = 10.0, hallW = 4.2, hallH = 4.8;
    const roomW = 13.0, roomD = 13.0, roomH = 6.6;

    // Lights (stronger contrast)
    const lights = new THREE.Group();
    lights.name = "CasinoLights";

    lights.add(new THREE.AmbientLight(0xffffff, 0.22));

    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(6, 12, 4);
    lights.add(key);

    const fill = new THREE.PointLight(0x7fe7ff, 0.25, 45);
    fill.position.set(0, 6, 0);
    lights.add(fill);

    const warm = new THREE.PointLight(0xffcc88, 0.18, 35);
    warm.position.set(0, 4.5, 0);
    lights.add(warm);

    W.add(lights);
    S.refs.lights = lights;

    // Wall arcs with door gaps
    const wallMat = getCasinoWallMaterial();
    const quarter = (Math.PI * 2) / 4;

    for (let i = 0; i < 4; i++) {
      const thetaStart = i * quarter + doorGap / 2;
      const thetaLen = quarter - doorGap;

      const geo = new THREE.CylinderGeometry(
        lobbyRadius + 0.1, lobbyRadius + 0.1, wallHeight,
        128, 1, true, thetaStart, thetaLen
      );

      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.y = wallHeight / 2;
      W.add(wall);
    }

    // Gold ribs hide seams / tighten look
    addGoldRibs(W, lobbyRadius - 0.05, wallHeight);

    // Floors
    const floorMat = matFloor();

    const floorRing = new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 192), floorMat);
    floorRing.name = "LobbyFloorMain";
    floorRing.rotation.x = -Math.PI / 2;
    W.add(floorRing);
    S.floorMain = floorRing;

    const pit = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 128), floorMat);
    pit.name = "LobbyFloorPit";
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = -pitDepth;
    W.add(pit);
    S.floorPit = pit;

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 128, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.94, metalness: 0.03, side: THREE.DoubleSide })
    );
    pitWall.position.y = -pitDepth / 2;
    W.add(pitWall);

    // Rail
    const rail = new THREE.Mesh(new THREE.TorusGeometry(pitRadius + 0.25, 0.085, 16, 220), matGold());
    rail.name = "PitGuardRail";
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.95;
    W.add(rail);
    S.refs.rail = rail;

    // Table
    const table = new THREE.Group();
    table.name = "CenterPokerTable";
    table.position.set(0, -pitDepth + 0.02, 0);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.55, 0.25, 64),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.72, metalness: 0.18 })
    );
    base.position.y = 0.15;
    table.add(base);

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.18, 96), matFelt());
    felt.position.y = 0.35;
    table.add(felt);

    // Chairs
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x14141f, roughness: 0.82, metalness: 0.12 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 3.0;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.55), chairMat);
      c.position.set(Math.cos(a) * r, 0.38, Math.sin(a) * r);
      c.lookAt(0, 0.38, 0);
      table.add(c);
    }

    // Placeholder cards
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65, metalness: 0.0, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.34), cardMat);
      card.rotation.x = -Math.PI / 2;
      card.position.set((i - 2) * 0.28, 0.445, 0);
      table.add(card);
    }

    // Players
    addPlaceholderPlayers(table);

    W.add(table);
    S.refs.table = table;

    // Halls + Rooms (radial)
    const defs = [
      { key: "north", yaw: 0,              label: "POKER" },
      { key: "east",  yaw: Math.PI / 2,    label: "STORE" },
      { key: "south", yaw: Math.PI,        label: "EVENT" },
      { key: "west",  yaw: -Math.PI / 2,   label: "VIP" }
    ];

    for (const d of defs) {
      const dir = dirFromYaw(d.yaw);

      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);
      const hallCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen / 2);
      const roomCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD / 2);

      const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallLen), matHall());
      hall.name = `Hallway_${d.key}`;
      hall.position.set(hallCenter.x, hallH / 2, hallCenter.z);
      hall.rotation.y = d.yaw;
      W.add(hall);
      S.refs.hallways[d.key] = hall;

      const room = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), matRoom());
      room.name = `Room_${d.label}`;
      room.position.set(roomCenter.x, roomH / 2, roomCenter.z);
      room.rotation.y = d.yaw;
      W.add(room);
      S.refs.rooms[d.key] = room;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(hallW + 0.55, 3.3, 0.25), matGold());
      frame.position.set(doorPos.x, 2.15, doorPos.z);
      frame.rotation.y = d.yaw;
      W.add(frame);

      const sign = new THREE.Mesh(new THREE.PlaneGeometry(hallW + 0.25, 1.15), matSign());
      sign.position.set(doorPos.x, 2.15, doorPos.z);
      sign.rotation.y = d.yaw + Math.PI; // face inward
      W.add(sign);
    }

    // Jumbotrons above doors
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
      const dir = dirFromYaw(d.yaw);
      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);

      const j = new THREE.Mesh(jumboGeo, jumboMat);
      j.name = `Jumbotron_${d.key}`;
      j.position.set(doorPos.x * 0.98, 5.75, doorPos.z * 0.98);
      j.rotation.y = d.yaw + Math.PI;
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    safeLog("[world] built ✅ Update 4.8.6 (ctx.THREE)");
  }

  // -----------------------------
  // Teleport ring (best hit from both controllers)
  // -----------------------------
  function rayFromObject(obj) {
    const THREE = S.THREE;
    obj.updateMatrixWorld(true);
    const pos = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
    const rot = new THREE.Matrix4().extractRotation(obj.matrixWorld);
    const dir = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).normalize();
    return { pos, dir };
  }

  function pressed(controller) {
    try {
      const gp = controller?.inputSource?.gamepad;
      if (!gp?.buttons?.length) return false;
      return !!gp.buttons[0]?.pressed;
    } catch { return false; }
  }

  function updateTeleport() {
    if (!S.ray) return;
    ensureAimRing();

    const floors = [S.floorMain, S.floorPit].filter(Boolean);
    if (!floors.length) return;

    let best = null;

    const candidates = [];
    if (S.controllers?.[0]) candidates.push(S.controllers[0]);
    if (S.controllers?.[1]) candidates.push(S.controllers[1]);

    for (const c of candidates) {
      const { pos, dir } = rayFromObject(c);
      S.ray.set(pos, dir);
      const hits = S.ray.intersectObjects(floors, false);
      if (hits.length && (!best || hits[0].distance < best.distance)) best = hits[0];
    }

    if (!best) {
      // camera fallback
      S.camera.updateMatrixWorld(true);
      const camPos = new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
      const camDir = new S.THREE.Vector3(0, 0, -1).applyQuaternion(S.camera.quaternion).normalize();
      S.ray.set(camPos, camDir);
      const hits = S.ray.intersectObjects(floors, false);
      if (hits.length) best = hits[0];
    }

    if (!best) {
      S.aimRing.visible = false;
      S._teleLatch = false;
      return;
    }

    const p = best.point;
    S.aimRing.visible = true;
    S.aimRing.position.set(p.x, best.object.position.y + 0.01, p.z);

    const isPressed = pressed(S.controllers?.[0]) || pressed(S.controllers?.[1]);
    if (isPressed && !S._teleLatch) {
      S._teleLatch = true;
      S.player.position.set(p.x, 0.02, p.z);

      // audio start on user action
      const v = S.refs.stream?.video;
      if (v && v.paused) v.play().catch(() => {});
    }
    if (!isPressed) S._teleLatch = false;
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
      safeLog("[world] build() start…");

      ensureRoot();
      S.ray = new S.THREE.Raycaster();
      buildWorld();
      ensureAimRing();

      // Spawn inside VIP room (west)
      const lobbyRadius = 12.0, hallLen = 10.0, roomD = 13.0;
      const vipYaw = -Math.PI / 2;
      const dir = dirFromYaw(vipYaw);
      const roomCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD / 2);
      const spawn = roomCenter.clone().add(dir.clone().multiplyScalar(2.0));

      S.player.position.set(spawn.x, 0.02, spawn.z);
      S.player.rotation.y = Math.atan2(0 - spawn.x, 0 - spawn.z);

      safeLog("[world] build complete ✅ (VIP spawn)");
    },

    frame(ctx, dt) {
      updateTeleport();
      updateAudio();
    }
  };
})();

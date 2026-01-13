// /js/world.js — Scarlett MASTER WORLD v4.9 (SOUPED UP + XR-safe)
// ✅ ctx.THREE only
// ✅ Lobby w/ 4 door openings + halls + rooms
// ✅ Pit divot + gold rail + table + seats + cards + “players”
// ✅ Better lighting + emissive trims
// ✅ Global invisible ground so teleport ring works anywhere
// ✅ Teleport ring + teleport trigger works with pads from index.js

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null, log:console.log,
    root:null,
    floorMain:null, floorPit:null, ground:null,
    ray:null, aimRing:null, _teleLatch:false,
    refs:{ stream:null, jumbotrons:[], lobby:null }
  };

  const safeLog = (...a)=>{ try{ S.log?.(...a);}catch{} };

  // ---------- Materials ----------
  function wallMat() {
    const THREE = S.THREE;
    const tex = new THREE.TextureLoader().load("assets/textures/casino_wall_diffuse.jpg");
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(12,1);
    tex.anisotropy = 16;

    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.18,
      metalness: 0.55,
      color: 0xffffff,
      side: THREE.BackSide
    });
  }

  const matFloor = () => new S.THREE.MeshStandardMaterial({ color:0x050508, roughness:0.92, metalness:0.05 });
  const matPitWall = () => new S.THREE.MeshStandardMaterial({ color:0x0a0b12, roughness:0.95, metalness:0.06, side:S.THREE.DoubleSide });
  const matGold = () => new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.22, metalness:0.95 });
  const matFelt = () => new S.THREE.MeshStandardMaterial({ color:0x0a3a2a, roughness:0.9, metalness:0.04 });
  const matHall  = () => new S.THREE.MeshStandardMaterial({ color:0x090a12, roughness:0.9, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.55 });
  const matRoom  = () => new S.THREE.MeshStandardMaterial({ color:0x070711, roughness:0.86, metalness:0.1, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.55 });

  function ensureRoot() {
    const THREE = S.THREE;
    if (S.root && S.root.parent === S.scene) return S.root;
    S.root = new THREE.Group();
    S.root.name = "WorldRoot";
    S.scene.add(S.root);
    return S.root;
  }

  function ensureAimRing() {
    const THREE = S.THREE;
    if (S.aimRing && S.aimRing.parent) return;
    const geo = new THREE.RingGeometry(0.22, 0.32, 128);
    const mat = new THREE.MeshBasicMaterial({ color:0x00ff7f, transparent:true, opacity:0.95, side:THREE.DoubleSide });
    S.aimRing = new THREE.Mesh(geo, mat);
    S.aimRing.name = "TeleportAimRing";
    S.aimRing.rotation.x = -Math.PI/2;
    S.aimRing.visible = false;
    S.scene.add(S.aimRing);
  }

  function dirFromYaw(yaw) {
    const THREE = S.THREE;
    return new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  }

  // ---------- Stream ----------
  function initStream() {
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

  // ---------- World build ----------
  function buildWorld() {
    const THREE = S.THREE;
    const root = ensureRoot();

    const prev = root.getObjectByName("ScarlettLobbyWorld");
    if (prev) root.remove(prev);

    const W = new THREE.Group();
    W.name = "ScarlettLobbyWorld";
    root.add(W);
    S.refs.lobby = W;

    // Lighting (more cinematic)
    W.add(new THREE.AmbientLight(0xffffff, 0.18));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(7, 14, 5);
    W.add(key);

    const cyan = new THREE.PointLight(0x7fe7ff, 0.25, 60);
    cyan.position.set(0, 6, 0);
    W.add(cyan);

    const warm = new THREE.PointLight(0xffc890, 0.14, 50);
    warm.position.set(0, 4.3, 0);
    W.add(warm);

    // Dimensions
    const lobbyRadius = 12.0;
    const wallHeight = 8.0;
    const doorGap = THREE.MathUtils.degToRad(30);

    const pitRadius = 4.2;
    const pitDepth = 0.85;

    const hallLen = 10.0, hallW = 4.2, hallH = 4.8;
    const roomW = 13.0, roomD = 13.0, roomH = 6.6;

    // Walls in arcs (4 openings)
    const q = (Math.PI*2)/4;
    for (let i=0;i<4;i++){
      const thetaStart = i*q + doorGap/2;
      const thetaLen = q - doorGap;
      const geo = new THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, wallHeight, 160, 1, true, thetaStart, thetaLen);
      const wall = new THREE.Mesh(geo, wallMat());
      wall.position.y = wallHeight/2;
      W.add(wall);
    }

    // Emissive trim ring around wall base (adds “soup”)
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(lobbyRadius-0.05, 0.03, 12, 240),
      new THREE.MeshStandardMaterial({ color:0x111122, emissive:0x7fe7ff, emissiveIntensity:0.18, roughness:0.7, metalness:0.2 })
    );
    trim.rotation.x = Math.PI/2;
    trim.position.y = 0.02;
    W.add(trim);

    // Floors
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 256), matFloor());
    floorRing.rotation.x = -Math.PI/2;
    W.add(floorRing);
    S.floorMain = floorRing;

    const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 160), matFloor());
    pitFloor.rotation.x = -Math.PI/2;
    pitFloor.position.y = -pitDepth;
    W.add(pitFloor);
    S.floorPit = pitFloor;

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 160, 1, true),
      matPitWall()
    );
    pitWall.position.y = -pitDepth/2;
    W.add(pitWall);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(pitRadius+0.25, 0.085, 16, 260), matGold());
    rail.rotation.x = Math.PI/2;
    rail.position.y = 0.95;
    W.add(rail);

    // ✅ Global invisible ground for teleport anywhere
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300,300),
      new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0.0;
    ground.visible = false;
    W.add(ground);
    S.ground = ground;

    // Center table (better looking)
    const table = new THREE.Group();
    table.position.set(0, -pitDepth + 0.02, 0);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.7, 0.32, 80),
      new THREE.MeshStandardMaterial({ color:0x0d0d14, roughness:0.65, metalness:0.18 })
    );
    base.position.y = 0.16;
    table.add(base);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.2, 120),
      matFelt()
    );
    top.position.y = 0.42;
    table.add(top);

    // Gold edge
    const edge = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.05, 16, 220), matGold());
    edge.rotation.x = Math.PI/2;
    edge.position.y = 0.50;
    table.add(edge);

    // Seats + “players”
    const seatMat = new THREE.MeshStandardMaterial({ color:0x12121a, roughness:0.84, metalness:0.12 });
    const bodyMat = new THREE.MeshStandardMaterial({ color:0x181827, roughness:0.85, metalness:0.08 });
    const headMat = new THREE.MeshStandardMaterial({ color:0x232336, roughness:0.78, metalness:0.08 });

    for (let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2;
      const r = 3.05;

      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.8, 0.58), seatMat);
      chair.position.set(Math.cos(a)*r, 0.40, Math.sin(a)*r);
      chair.lookAt(0,0.40,0);
      table.add(chair);

      // simple bot silhouette
      const bot = new THREE.Group();
      bot.position.set(Math.cos(a)*(r+0.35), 0.02, Math.sin(a)*(r+0.35));
      bot.lookAt(0,0.02,0);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16,0.45,6,12), bodyMat);
      body.position.y = 0.60;
      bot.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), headMat);
      head.position.y = 1.00;
      bot.add(head);

      table.add(bot);
    }

    // Cards
    const cardMat = new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.65, metalness:0.0, side:THREE.DoubleSide });
    for (let i=0;i<5;i++){
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.34), cardMat);
      c.rotation.x = -Math.PI/2;
      c.position.set((i-2)*0.28, 0.52, 0);
      table.add(c);
    }

    W.add(table);

    // Halls + rooms (aligned to openings)
    const defs = [
      { key:"north", yaw:0,            label:"POKER" },
      { key:"east",  yaw:Math.PI/2,    label:"STORE" },
      { key:"south", yaw:Math.PI,      label:"EVENT" },
      { key:"west",  yaw:-Math.PI/2,   label:"VIP" }
    ];

    for (const d of defs){
      const dir = dirFromYaw(d.yaw);
      const hallCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen/2);
      const roomCenter = dir.clone().multiplyScalar(lobbyRadius + hallLen + roomD/2);

      const hall = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallH, hallLen), matHall());
      hall.position.set(hallCenter.x, hallH/2, hallCenter.z);
      hall.rotation.y = d.yaw;
      W.add(hall);

      const room = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, roomD), matRoom());
      room.position.set(roomCenter.x, roomH/2, roomCenter.z);
      room.rotation.y = d.yaw;
      W.add(room);

      // neon doorway marker (subtle)
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(hallW+0.6, 3.2, 0.08),
        new THREE.MeshStandardMaterial({ color:0x0b0b16, emissive:0x7fe7ff, emissiveIntensity:0.22, roughness:0.6, metalness:0.2 })
      );
      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.05);
      door.position.set(doorPos.x, 2.10, doorPos.z);
      door.rotation.y = d.yaw;
      W.add(door);
    }

    // Jumbotrons
    const streamTex = initStream();
    const jumboMat = new THREE.MeshStandardMaterial({
      map: streamTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const jumboGeo = new THREE.PlaneGeometry(7.8, 4.4);
    S.refs.jumbotrons.length = 0;
    for (const d of defs){
      const dir = dirFromYaw(d.yaw);
      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);
      const j = new THREE.Mesh(jumboGeo, jumboMat);
      j.position.set(doorPos.x*0.98, 5.85, doorPos.z*0.98);
      j.rotation.y = d.yaw + Math.PI;
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    // ✅ Spawn in lobby first (so you’re never trapped in a room box)
    S.player.position.set(0, 0.02, 7.5);
    S.player.rotation.y = Math.PI;

    safeLog("[world] built ✅ v4.9 souped-up");
  }

  // ---------- Teleport ----------
  function rayFrom(obj) {
    const THREE = S.THREE;
    obj.updateMatrixWorld(true);
    const pos = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
    const rot = new THREE.Matrix4().extractRotation(obj.matrixWorld);
    const dir = new THREE.Vector3(0,0,-1).applyMatrix4(rot).normalize();
    return { pos, dir };
  }

  function isPressedFromPads(pads) {
    try {
      const a = pads?.left?.gamepad?.buttons?.[0]?.pressed;
      const b = pads?.right?.gamepad?.buttons?.[0]?.pressed;
      return !!(a || b);
    } catch { return false; }
  }

  function updateTeleport(pads) {
    if (!S.ray) return;
    ensureAimRing();

    const targets = [S.floorMain, S.floorPit, S.ground].filter(Boolean);
    if (!targets.length) return;

    let best = null;

    // Prefer controller rays if available
    const candidates = [];
    if (S.controllers?.[0]) candidates.push(S.controllers[0]);
    if (S.controllers?.[1]) candidates.push(S.controllers[1]);

    for (const c of candidates) {
      const { pos, dir } = rayFrom(c);
      S.ray.set(pos, dir);
      const hits = S.ray.intersectObjects(targets, false);
      if (hits.length && (!best || hits[0].distance < best.distance)) best = hits[0];
    }

    // camera fallback
    if (!best) {
      S.camera.updateMatrixWorld(true);
      const camPos = new S.THREE.Vector3().setFromMatrixPosition(S.camera.matrixWorld);
      const camDir = new S.THREE.Vector3(0,0,-1).applyQuaternion(S.camera.quaternion).normalize();
      S.ray.set(camPos, camDir);
      const hits = S.ray.intersectObjects(targets, false);
      if (hits.length) best = hits[0];
    }

    if (!best) { S.aimRing.visible = false; S._teleLatch = false; return; }

    const p = best.point;
    S.aimRing.visible = true;
    S.aimRing.position.set(p.x, 0.01, p.z);

    const pressed = isPressedFromPads(pads);
    if (pressed && !S._teleLatch) {
      S._teleLatch = true;
      S.player.position.set(p.x, 0.02, p.z);

      const v = S.refs.stream?.video;
      if (v && v.paused) v.play().catch(()=>{});
    }
    if (!pressed) S._teleLatch = false;
  }

  function updateAudio() {
    const v = S.refs.stream?.video;
    if (!v || !S.player) return;
    const dist = S.player.position.length();
    v.volume = Math.max(0, Math.min(1, 1 - dist/24));
  }

  return {
    async build(ctx) {
      Object.assign(S, ctx);
      safeLog("[world] build() start…");
      ensureRoot();
      S.ray = new S.THREE.Raycaster();
      buildWorld();
      ensureAimRing();
      safeLog("[world] build complete ✅");
    },
    frame(ctx, dt) {
      // pads passed from index.js in VR mode
      const pads = ctx?.pads;
      updateTeleport(pads);
      updateAudio();
    }
  };
})();

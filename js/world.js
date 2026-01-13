// /js/world.js — Scarlett MASTER WORLD (Update 4.8.7 FULL)
// ✅ ctx.THREE only (no imports)
// ✅ VIP spawn + lobby + pit + rail + table + chairs + cards
// ✅ 4 hallways + 4 rooms placed radially
// ✅ 4 jumbotrons (HLS video texture)
// ✅ Green teleport halo works ANYWHERE (global invisible ground plane)

export const World = (() => {
  const S = {
    THREE:null, scene:null, renderer:null, camera:null, player:null, controllers:null, log:console.log,
    root:null, floorMain:null, floorPit:null, ground:null,
    ray:null, aimRing:null, _teleLatch:false,
    refs:{ stream:null, jumbotrons:[] }
  };

  const safeLog = (...a)=>{ try{ S.log?.(...a);}catch{} };

  function ensureRoot() {
    const THREE = S.THREE;
    if (S.root && S.root.parent === S.scene) return S.root;
    S.root = new THREE.Group();
    S.root.name = "WorldRoot";
    S.scene.add(S.root);
    return S.root;
  }

  function getCasinoWallMaterial() {
    const THREE = S.THREE;
    const tex = new THREE.TextureLoader().load("assets/textures/casino_wall_diffuse.jpg");
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(12,1);
    tex.anisotropy = 16;
    return new THREE.MeshStandardMaterial({ map:tex, roughness:0.22, metalness:0.55, color:0xffffff, side:THREE.BackSide });
  }

  const matFloor = () => new S.THREE.MeshStandardMaterial({ color:0x050508, roughness:0.92, metalness:0.05 });
  const matHall  = () => new S.THREE.MeshStandardMaterial({ color:0x0a0a12, roughness:0.86, metalness:0.08, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.45 });
  const matRoom  = () => new S.THREE.MeshStandardMaterial({ color:0x070711, roughness:0.82, metalness:0.10, side:S.THREE.BackSide, emissive:0x05060a, emissiveIntensity:0.45 });
  const matGold  = () => new S.THREE.MeshStandardMaterial({ color:0xd4af37, roughness:0.24, metalness:0.92 });
  const matFelt  = () => new S.THREE.MeshStandardMaterial({ color:0x0b3a2a, roughness:0.88, metalness:0.04 });

  function ensureAimRing() {
    const THREE = S.THREE;
    if (S.aimRing && S.aimRing.parent) return;
    const geo = new THREE.RingGeometry(0.22, 0.32, 128);
    const mat = new THREE.MeshBasicMaterial({ color:0x00ff7f, transparent:true, opacity:0.95, side:THREE.DoubleSide });
    S.aimRing = new THREE.Mesh(geo, mat);
    S.aimRing.rotation.x = -Math.PI/2;
    S.aimRing.visible = false;
    S.scene.add(S.aimRing);
  }

  function dirFromYaw(yaw) {
    const THREE = S.THREE;
    return new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  }

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

  function buildWorld() {
    const THREE = S.THREE;
    const root = ensureRoot();

    // clear
    const prev = root.getObjectByName("ScarlettLobbyWorld");
    if (prev) root.remove(prev);

    const W = new THREE.Group();
    W.name = "ScarlettLobbyWorld";
    root.add(W);

    // lights
    W.add(new THREE.AmbientLight(0xffffff, 0.22));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(6,12,4);
    W.add(key);

    // sizes
    const lobbyRadius = 12.0;
    const wallHeight = 8.0;
    const doorGap = THREE.MathUtils.degToRad(28);
    const pitRadius = 4.2;
    const pitDepth = 0.85;

    const hallLen = 10.0, hallW = 4.2, hallH = 4.8;
    const roomW = 13.0, roomD = 13.0, roomH = 6.6;

    // wall arcs with door gaps
    const wallMat = getCasinoWallMaterial();
    const quarter = (Math.PI*2)/4;
    for (let i=0;i<4;i++){
      const thetaStart = i*quarter + doorGap/2;
      const thetaLen = quarter - doorGap;
      const geo = new THREE.CylinderGeometry(lobbyRadius+0.1, lobbyRadius+0.1, wallHeight, 128, 1, true, thetaStart, thetaLen);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.y = wallHeight/2;
      W.add(wall);
    }

    // lobby floor ring + pit
    const floorMat = matFloor();
    const ring = new THREE.Mesh(new THREE.RingGeometry(pitRadius, lobbyRadius, 192), floorMat);
    ring.rotation.x = -Math.PI/2;
    W.add(ring);
    S.floorMain = ring;

    const pit = new THREE.Mesh(new THREE.CircleGeometry(pitRadius, 128), floorMat);
    pit.rotation.x = -Math.PI/2;
    pit.position.y = -pitDepth;
    W.add(pit);
    S.floorPit = pit;

    // ✅ global invisible ground (teleport works in VIP rooms/halls)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300,300),
      new THREE.MeshBasicMaterial({ transparent:true, opacity:0.0 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0.0;
    ground.visible = false;
    W.add(ground);
    S.ground = ground;

    // pit wall + rail
    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(pitRadius, pitRadius, pitDepth, 128, 1, true),
      new THREE.MeshStandardMaterial({ color:0x0b0b14, roughness:0.94, metalness:0.03, side:THREE.DoubleSide })
    );
    pitWall.position.y = -pitDepth/2;
    W.add(pitWall);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(pitRadius+0.25, 0.085, 16, 220), matGold());
    rail.rotation.x = Math.PI/2;
    rail.position.y = 0.95;
    W.add(rail);

    // table
    const table = new THREE.Group();
    table.position.set(0, -pitDepth + 0.02, 0);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.25, 64),
      new THREE.MeshStandardMaterial({ color:0x101018, roughness:0.72, metalness:0.18 }));
    base.position.y = 0.15;
    table.add(base);

    const felt = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.18, 96), matFelt());
    felt.position.y = 0.35;
    table.add(felt);

    // chairs + cards
    const chairMat = new THREE.MeshStandardMaterial({ color:0x14141f, roughness:0.82, metalness:0.12 });
    for (let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2;
      const r = 3.0;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.75,0.55), chairMat);
      c.position.set(Math.cos(a)*r, 0.38, Math.sin(a)*r);
      c.lookAt(0,0.38,0);
      table.add(c);
    }

    const cardMat = new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.65, metalness:0.0, side:THREE.DoubleSide });
    for (let i=0;i<5;i++){
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.34), cardMat);
      card.rotation.x = -Math.PI/2;
      card.position.set((i-2)*0.28, 0.445, 0);
      table.add(card);
    }

    W.add(table);

    // halls + rooms
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
    }

    // jumbotrons
    const streamTex = initLobbyStream();
    const jumboMat = new THREE.MeshStandardMaterial({ map:streamTex, emissive:0xffffff, emissiveIntensity:0.35, side:THREE.DoubleSide });
    const jumboGeo = new THREE.PlaneGeometry(7.8, 4.4);
    S.refs.jumbotrons.length = 0;

    for (const d of defs){
      const dir = dirFromYaw(d.yaw);
      const doorPos = dir.clone().multiplyScalar(lobbyRadius - 0.15);
      const j = new THREE.Mesh(jumboGeo, jumboMat);
      j.position.set(doorPos.x*0.98, 5.75, doorPos.z*0.98);
      j.rotation.y = d.yaw + Math.PI;
      W.add(j);
      S.refs.jumbotrons.push(j);
    }

    // VIP spawn (center of VIP room, not inside a wall)
    const vipYaw = -Math.PI/2;
    const vipDir = dirFromYaw(vipYaw);
    const vipRoomCenter = vipDir.clone().multiplyScalar(lobbyRadius + hallLen + roomD/2);
    const spawn = vipRoomCenter.clone().add(vipDir.clone().multiplyScalar(-1.0)); // ✅ inward
    S.player.position.set(spawn.x, 0.02, spawn.z);
    S.player.rotation.y = Math.atan2(0 - spawn.x, 0 - spawn.z);

    safeLog("[world] built ✅ (4.8.7)");
  }

  function rayFromObject(obj) {
    const THREE = S.THREE;
    obj.updateMatrixWorld(true);
    const pos = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
    const rot = new THREE.Matrix4().extractRotation(obj.matrixWorld);
    const dir = new THREE.Vector3(0,0,-1).applyMatrix4(rot).normalize();
    return { pos, dir };
  }

  function pressed(controller) {
    try { return !!controller?.inputSource?.gamepad?.buttons?.[0]?.pressed; }
    catch { return false; }
  }

  function updateTeleport() {
    if (!S.ray) return;
    ensureAimRing();

    const targets = [S.floorMain, S.floorPit, S.ground].filter(Boolean);
    if (!targets.length) return;

    let best = null;

    const candidates = [];
    if (S.controllers?.[0]) candidates.push(S.controllers[0]);
    if (S.controllers?.[1]) candidates.push(S.controllers[1]);

    for (const c of candidates) {
      const { pos, dir } = rayFromObject(c);
      S.ray.set(pos, dir);
      const hits = S.ray.intersectObjects(targets, false);
      if (hits.length && (!best || hits[0].distance < best.distance)) best = hits[0];
    }

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
    S.aimRing.position.set(p.x, best.object.position.y + 0.01, p.z);

    const isPressed = pressed(S.controllers?.[0]) || pressed(S.controllers?.[1]);
    if (isPressed && !S._teleLatch) {
      S._teleLatch = true;
      S.player.position.set(p.x, 0.02, p.z);
      const v = S.refs.stream?.video;
      if (v && v.paused) v.play().catch(()=>{});
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
      safeLog("[world] build complete ✅");
    },
    frame(ctx, dt) {
      updateTeleport();
      updateAudio();
    }
  };
})();

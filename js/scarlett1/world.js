// /js/scarlett1/world.js — Scarlett1 World (FULL) v1.0
// ✅ Exports initWorld() for boot2.js
// ✅ Lobby circle + 4 hallways + 4 rooms
// ✅ Divoted centerpiece table + simple chairs
// ✅ Solid walls + door openings
// ✅ Spawn pads (never spawn on table)
// ✅ Simple roaming bots (not pills only)
// ✅ Safe diagnostics handshake (fixes HUD stuck on “Booting…”)

export function initWorld(ctx = {}) {
  const THREE = ctx.THREE || window.THREE;
  if (!THREE) throw new Error("THREE missing (world.js) — boot must pass ctx.THREE");

  // ---------------------------
  // Diagnostics helpers
  // ---------------------------
  const DLOG = (s) => {
    try {
      window.__SCARLETT_DIAG_LOG && window.__SCARLETT_DIAG_LOG(String(s));
    } catch {}
    try { console.log("[world]", s); } catch {}
  };
  const DSTAT = (s) => {
    try { window.__SCARLETT_DIAG_STATUS && window.__SCARLETT_DIAG_STATUS(String(s)); } catch {}
  };

  DLOG("initWorld() start");

  // ---------------------------
  // DOM + Renderer
  // ---------------------------
  const container = ctx.container || document.body;
  const canvas = ctx.canvas || document.querySelector("canvas#xr") || undefined;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    canvas,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // If your XR spine turns this on later, we won’t fight it.
  if (ctx.enableXR) renderer.xr.enabled = true;

  if (!canvas) {
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.zIndex = "0";
    container.appendChild(renderer.domElement);
  }

  // ---------------------------
  // Scene + Camera + Rig
  // ---------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);

  const camera = ctx.camera || new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    500
  );

  const rig = ctx.rig || new THREE.Group();
  rig.name = "PlayerRig";
  if (!rig.children.includes(camera)) rig.add(camera);

  if (!ctx.rig) scene.add(rig);

  // A gentle “default” camera pose (non-XR view)
  camera.position.set(0, 1.6, 6);
  camera.lookAt(0, 1.2, 0);

  // ---------------------------
  // Lighting
  // ---------------------------
  const hemi = new THREE.HemisphereLight(0x9cc7ff, 0x121019, 0.85);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(6, 10, 6);
  key.castShadow = false;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6aa8ff, 0.35);
  rim.position.set(-10, 6, -10);
  scene.add(rim);

  // Accent “neon” points in corners
  const p1 = new THREE.PointLight(0x2b7cff, 0.65, 40);
  p1.position.set(10, 3, 10);
  scene.add(p1);

  const p2 = new THREE.PointLight(0xff2bd6, 0.25, 35);
  p2.position.set(-10, 3, -10);
  scene.add(p2);

  // ---------------------------
  // Materials
  // ---------------------------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({
    color: 0x0b1020,
    roughness: 0.95,
    metalness: 0.02,
  });

  const MAT_WALL = new THREE.MeshStandardMaterial({
    color: 0x101a2e,
    roughness: 0.85,
    metalness: 0.05,
  });

  const MAT_TRIM = new THREE.MeshStandardMaterial({
    color: 0x1b2a4d,
    roughness: 0.45,
    metalness: 0.15,
  });

  const MAT_FELT = new THREE.MeshStandardMaterial({
    color: 0x0c6b43,
    roughness: 0.95,
    metalness: 0.02,
  });

  const MAT_TABLE = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.55,
    metalness: 0.2,
  });

  const MAT_CHAIR = new THREE.MeshStandardMaterial({
    color: 0x0f1730,
    roughness: 0.8,
    metalness: 0.08,
  });

  const MAT_BOT = new THREE.MeshStandardMaterial({
    color: 0x253d78,
    roughness: 0.55,
    metalness: 0.15,
    emissive: new THREE.Color(0x0b1a3a),
    emissiveIntensity: 0.35,
  });

  // ---------------------------
  // World Dimensions
  // ---------------------------
  const WORLD = {
    lobbyRadius: 9.0,
    lobbyFloorY: 0.0,
    wallHeight: 3.0,
    wallThickness: 0.35,
    hallwayLen: 9.0,
    hallwayW: 3.2,
    roomSize: 9.0,
    roomHeight: 3.0,
    tableRadius: 3.2,
    tableTopY: 0.95,
    divotDepth: 0.55,
    divotRadius: 4.4,
  };

  const world = {
    group: new THREE.Group(),
    scene,
    renderer,
    camera,
    rig,
    spawnPads: [],
    bots: [],
    clock: new THREE.Clock(),
  };
  world.group.name = "WorldRoot";
  scene.add(world.group);

  // ---------------------------
  // Helpers
  // ---------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const deg = (d) => (d * Math.PI) / 180;

  function addMesh(mesh, parent = world.group) {
    parent.add(mesh);
    return mesh;
  }

  function makeRoundedBox(w, h, d, mat) {
    // simple fallback box (no true rounding needed for now)
    const geo = new THREE.BoxGeometry(w, h, d);
    return new THREE.Mesh(geo, mat);
  }

  function makeSign(text, w = 2.3, h = 0.7) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);

    // bg
    g.fillStyle = "rgba(8,12,22,0.85)";
    g.fillRect(0, 0, c.width, c.height);

    // frame
    g.strokeStyle = "rgba(120,160,255,0.55)";
    g.lineWidth = 8;
    g.strokeRect(10, 10, c.width - 20, c.height - 20);

    // title
    g.fillStyle = "rgba(215,230,255,0.95)";
    g.font = "bold 72px system-ui, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height / 2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(w, h);
    return new THREE.Mesh(geo, mat);
  }

  function safeLookAtY(obj, target) {
    const t = target.clone ? target.clone() : new THREE.Vector3(target.x, target.y, target.z);
    const p = obj.position.clone();
    t.y = p.y;
    obj.lookAt(t);
  }

  // ---------------------------
  // Floors: lobby + hallways + rooms
  // ---------------------------
  function buildFloors() {
    // Lobby floor (big circle)
    const lobbyGeo = new THREE.CircleGeometry(WORLD.lobbyRadius, 64);
    const lobby = new THREE.Mesh(lobbyGeo, MAT_FLOOR);
    lobby.rotation.x = -Math.PI / 2;
    lobby.position.y = WORLD.lobbyFloorY;
    addMesh(lobby);

    // Divot ring area: visually shows the depression zone
    const divotRingGeo = new THREE.RingGeometry(WORLD.tableRadius + 0.25, WORLD.divotRadius, 64);
    const divotRingMat = new THREE.MeshStandardMaterial({
      color: 0x070a12,
      roughness: 1.0,
      metalness: 0.0,
      emissive: new THREE.Color(0x060a14),
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    });
    const divotRing = new THREE.Mesh(divotRingGeo, divotRingMat);
    divotRing.rotation.x = -Math.PI / 2;
    divotRing.position.y = WORLD.lobbyFloorY + 0.001;
    addMesh(divotRing);

    // 4 hallways floors (N,E,S,W)
    const hw = WORLD.hallwayW;
    const hl = WORLD.hallwayLen;

    const hallGeo = new THREE.PlaneGeometry(hw, hl);
    const dirs = [
      { name: "STORE", a: 0,  x: 0,  z: -(WORLD.lobbyRadius + hl / 2) },
      { name: "VIP",   a: 90, x: (WORLD.lobbyRadius + hl / 2), z: 0 },
      { name: "SCORP", a: 180,x: 0,  z: (WORLD.lobbyRadius + hl / 2) },
      { name: "GAMES", a: 270,x: -(WORLD.lobbyRadius + hl / 2), z: 0 },
    ];

    dirs.forEach((d) => {
      const hall = new THREE.Mesh(hallGeo, MAT_FLOOR);
      hall.rotation.x = -Math.PI / 2;
      hall.rotation.z = deg(d.a);
      hall.position.set(d.x, WORLD.lobbyFloorY + 0.001, d.z);
      addMesh(hall);

      // A small neon trim strip down the center
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, hl * 0.92),
        new THREE.MeshStandardMaterial({
          color: 0x0d1b33,
          roughness: 0.35,
          metalness: 0.2,
          emissive: new THREE.Color(0x183a80),
          emissiveIntensity: 0.9,
          side: THREE.DoubleSide,
        })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.rotation.z = deg(d.a);
      strip.position.copy(hall.position);
      strip.position.y += 0.002;
      addMesh(strip);

      // Room floor (square)
      const room = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.roomSize, WORLD.roomSize),
        MAT_FLOOR
      );
      room.rotation.x = -Math.PI / 2;

      // Push room beyond hallway
      const push = WORLD.lobbyRadius + hl + WORLD.roomSize / 2;
      if (d.a === 0) room.position.set(0, WORLD.lobbyFloorY + 0.001, -push);
      if (d.a === 90) room.position.set(push, WORLD.lobbyFloorY + 0.001, 0);
      if (d.a === 180) room.position.set(0, WORLD.lobbyFloorY + 0.001, push);
      if (d.a === 270) room.position.set(-push, WORLD.lobbyFloorY + 0.001, 0);
      addMesh(room);

      // Room sign at entrance
      const sign = makeSign(d.name, 2.4, 0.75);
      sign.position.set(d.x, 2.2, d.z);
      sign.rotation.y = deg(d.a);
      // Face lobby center
      safeLookAtY(sign, new THREE.Vector3(0, 2.2, 0));
      addMesh(sign);
      DLOG(`sign: ${d.name}`);
    });
  }

  // ---------------------------
  // Walls: lobby ring + hall walls + room walls
  // ---------------------------
  function buildWalls() {
    const H = WORLD.wallHeight;
    const T = WORLD.wallThickness;

    // Lobby ring wall (approx with segments, leaving 4 door openings)
    const segments = 32;
    const openAngle = deg(22); // doorway width per axis opening
    const radius = WORLD.lobbyRadius;

    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      // Skip around the 4 door axes: 0, 90, 180, 270 degrees
      const axes = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      let isDoor = false;
      for (const ax of axes) {
        const da = Math.atan2(Math.sin(a0 - ax), Math.cos(a0 - ax));
        if (Math.abs(da) < openAngle) { isDoor = true; break; }
      }
      if (isDoor) continue;

      const arcLen = (2 * Math.PI * radius) / segments;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(arcLen, H, T),
        MAT_WALL
      );
      wall.position.set(
        Math.cos(a0) * radius,
        H / 2,
        Math.sin(a0) * radius
      );
      wall.rotation.y = -a0;
      addMesh(wall);

      // top trim
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(arcLen, 0.12, T * 1.05),
        MAT_TRIM
      );
      trim.position.copy(wall.position);
      trim.position.y = H - 0.12;
      trim.rotation.copy(wall.rotation);
      addMesh(trim);
    }

    // Hallway walls (4)
    const hw = WORLD.hallwayW;
    const hl = WORLD.hallwayLen;
    const wallGeo = new THREE.BoxGeometry(T, H, hl);

    const halls = [
      { a: 0,   x: 0,  z: -(WORLD.lobbyRadius + hl / 2), rot: 0 },
      { a: 90,  x: (WORLD.lobbyRadius + hl / 2), z: 0, rot: 90 },
      { a: 180, x: 0,  z: (WORLD.lobbyRadius + hl / 2), rot: 180 },
      { a: 270, x: -(WORLD.lobbyRadius + hl / 2), z: 0, rot: 270 },
    ];

    halls.forEach((h) => {
      // Left/Right walls of hallway
      for (const side of [-1, 1]) {
        const w = new THREE.Mesh(wallGeo, MAT_WALL);
        w.position.set(h.x, H / 2, h.z);
        w.rotation.y = deg(h.rot);
        // shift sideways relative to hallway axis
        const shift = (hw / 2) + (T / 2);
        const sx = Math.cos(deg(h.rot + 90)) * shift * side;
        const sz = Math.sin(deg(h.rot + 90)) * shift * side;
        w.position.x += sx;
        w.position.z += sz;
        addMesh(w);

        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(T * 1.05, 0.12, hl),
          MAT_TRIM
        );
        trim.position.copy(w.position);
        trim.position.y = H - 0.12;
        trim.rotation.copy(w.rotation);
        addMesh(trim);
      }
    });

    // Room walls (simple squares)
    const rs = WORLD.roomSize;
    const push = WORLD.lobbyRadius + WORLD.hallwayLen + rs / 2;

    const roomCenters = [
      new THREE.Vector3(0, 0, -push),
      new THREE.Vector3(push, 0, 0),
      new THREE.Vector3(0, 0, push),
      new THREE.Vector3(-push, 0, 0),
    ];

    roomCenters.forEach((c) => {
      // 4 walls around square room
      const wallLong = new THREE.BoxGeometry(rs, H, T);
      const wallShort = new THREE.BoxGeometry(T, H, rs);

      const wN = new THREE.Mesh(wallLong, MAT_WALL);
      wN.position.set(c.x, H / 2, c.z - rs / 2);
      addMesh(wN);

      const wS = new THREE.Mesh(wallLong, MAT_WALL);
      wS.position.set(c.x, H / 2, c.z + rs / 2);
      addMesh(wS);

      const wE = new THREE.Mesh(wallShort, MAT_WALL);
      wE.position.set(c.x + rs / 2, H / 2, c.z);
      addMesh(wE);

      const wW = new THREE.Mesh(wallShort, MAT_WALL);
      wW.position.set(c.x - rs / 2, H / 2, c.z);
      addMesh(wW);
    });
  }

  // ---------------------------
  // Centerpiece: Divoted Poker Table + simple seats
  // ---------------------------
  function buildTable() {
    // Divot well (visual depression)
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(WORLD.divotRadius, WORLD.divotRadius, WORLD.divotDepth, 64, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x04050a,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide,
      })
    );
    well.position.set(0, WORLD.lobbyFloorY - (WORLD.divotDepth / 2) + 0.01, 0);
    addMesh(well);

    // Table base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(WORLD.tableRadius * 0.55, WORLD.tableRadius * 0.75, 0.75, 48),
      MAT_TABLE
    );
    base.position.set(0, 0.40, 0);
    addMesh(base);

    // Table rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(WORLD.tableRadius, 0.18, 20, 64),
      new THREE.MeshStandardMaterial({
        color: 0x151515,
        roughness: 0.35,
        metalness: 0.25,
        emissive: new THREE.Color(0x0a0f1a),
        emissiveIntensity: 0.5,
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, WORLD.tableTopY, 0);
    addMesh(rim);

    // Table felt top
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(WORLD.tableRadius - 0.22, WORLD.tableRadius - 0.22, 0.08, 64),
      MAT_FELT
    );
    top.position.set(0, WORLD.tableTopY + 0.02, 0);
    addMesh(top);

    // Simple chairs around
    const chairCount = 8;
    for (let i = 0; i < chairCount; i++) {
      const a = (i / chairCount) * Math.PI * 2;

      const seat = makeRoundedBox(0.55, 0.12, 0.55, MAT_CHAIR);
      seat.position.set(
        Math.cos(a) * (WORLD.tableRadius + 1.05),
        0.42,
        Math.sin(a) * (WORLD.tableRadius + 1.05)
      );

      const back = makeRoundedBox(0.55, 0.65, 0.12, MAT_CHAIR);
      back.position.set(0, 0.38, -0.22);
      seat.add(back);

      safeLookAtY(seat, new THREE.Vector3(0, seat.position.y, 0));
      addMesh(seat);
    }
  }

  // ---------------------------
  // Spawn Pads: never spawn on table
  // ---------------------------
  function buildSpawnPads() {
    // 4 pads just inside each hallway entrance, plus 1 VIP “safe” pad
    const pads = [
      { name: "SPAWN_STORE", pos: new THREE.Vector3(0, 0, -(WORLD.lobbyRadius - 1.4)), yaw: 0 },
      { name: "SPAWN_VIP",   pos: new THREE.Vector3((WORLD.lobbyRadius - 1.4), 0, 0), yaw: -90 },
      { name: "SPAWN_SCORP", pos: new THREE.Vector3(0, 0, (WORLD.lobbyRadius - 1.4)), yaw: 180 },
      { name: "SPAWN_GAMES", pos: new THREE.Vector3(-(WORLD.lobbyRadius - 1.4), 0, 0), yaw: 90 },
      { name: "SPAWN_SAFE",  pos: new THREE.Vector3(-2.2, 0, -2.2), yaw: 45 },
    ];
    world.spawnPads = pads;

    // Visual markers (subtle)
    pads.forEach((p) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.55, 40),
        new THREE.MeshStandardMaterial({
          color: 0x0f2b55,
          roughness: 0.4,
          metalness: 0.2,
          emissive: new THREE.Color(0x1a5cff),
          emissiveIntensity: 0.55,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(p.pos);
      ring.position.y = 0.01;
      addMesh(ring);
    });
  }

  function chooseSafeSpawn() {
    // Prefer SAFE, otherwise STORE pad
    const pad = world.spawnPads.find((p) => p.name === "SPAWN_SAFE") || world.spawnPads[0];

    rig.position.copy(pad.pos);
    rig.position.y = 0; // let local-floor handle height
    rig.rotation.set(0, deg(pad.yaw), 0);

    // If we have camera in non-XR, set a pleasant height
    if (!renderer.xr.enabled) camera.position.set(0, 1.6, 0);

    DLOG(`spawn set: ${pad.name} (${pad.pos.x.toFixed(2)}, ${pad.pos.z.toFixed(2)})`);
  }

  // ---------------------------
  // Bots: simple humanoid-ish capsules walking a loop
  // ---------------------------
  function buildBots() {
    const botCount = 10;

    // CapsuleGeometry exists in r158
    const geo = THREE.CapsuleGeometry
      ? new THREE.CapsuleGeometry(0.18, 0.65, 8, 16)
      : new THREE.CylinderGeometry(0.2, 0.2, 0.9, 12);

    for (let i = 0; i < botCount; i++) {
      const bot = new THREE.Mesh(geo, MAT_BOT);
      bot.name = `Bot_${i}`;

      const r = WORLD.lobbyRadius - 1.2;
      const a = (i / botCount) * Math.PI * 2;
      bot.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);

      // Head glow
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x152a55,
          roughness: 0.2,
          metalness: 0.2,
          emissive: new THREE.Color(0x3a74ff),
          emissiveIntensity: 1.1,
        })
      );
      head.position.set(0, 0.55, 0);
      bot.add(head);

      // Store motion params
      bot.userData = {
        a,
        r,
        speed: 0.25 + (i % 4) * 0.04,
        wobble: 0.08 + (i % 3) * 0.03,
      };

      addMesh(bot);
      world.bots.push(bot);
    }
  }

  // ---------------------------
  // Build World
  // ---------------------------
  buildFloors();
  buildWalls();
  buildTable();
  buildSpawnPads();
  buildBots();
  chooseSafeSpawn();

  // ---------------------------
  // Resize
  // ---------------------------
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // ---------------------------
  // Animate
  // ---------------------------
  function tick() {
    const t = world.clock.getElapsedTime();

    // Bot walk loop around lobby
    for (const bot of world.bots) {
      const ud = bot.userData;
      ud.a += ud.speed * 0.008;
      const x = Math.cos(ud.a) * ud.r;
      const z = Math.sin(ud.a) * ud.r;
      bot.position.x = x;
      bot.position.z = z;
      bot.position.y = 0.55 + Math.sin(t * 2.0 + ud.a * 3.0) * ud.wobble * 0.15;

      // face direction of travel (look ahead slightly)
      const x2 = Math.cos(ud.a + 0.05) * ud.r;
      const z2 = Math.sin(ud.a + 0.05) * ud.r;
      bot.lookAt(x2, bot.position.y, z2);
    }
  }

  renderer.setAnimationLoop(() => {
    tick();
    renderer.render(scene, camera);
  });

  DLOG("render loop start ✅");
  DSTAT("World running ✅");

  // === FINAL DIAGNOSTICS HANDSHAKE ===
  if (window.__SCARLETT_DIAG_STATUS) window.__SCARLETT_DIAG_STATUS("World running ✅");
  if (window.__SCARLETT_DIAG_LOG) window.__SCARLETT_DIAG_LOG("initWorld() completed");

  // Optional: expose for modules
  window.__SCARLETT_WORLD__ = world;

  return world;
}
```0

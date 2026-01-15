// /js/scarlett1/world.js — Scarlett 1.3 WORLD (FULL • TIGHT • SEEABLE)
// ✅ Obvious PIT DIVOT + rim + rails + steps
// ✅ Casino TABLE + padded rail + FELT + center base
// ✅ 6 CHAIRS around table
// ✅ Nice floors (lobby ring + patterned inlays + hall contrast)
// ✅ Solid walls, sealed, hallways + door openings
// ✅ Store room prepared (kiosk + display walls + pedestals)
// ✅ Spawn pads safe + face table
// ✅ Colliders + blockedXZ()
// ✅ Frame hooks for modules (bots/store)

export async function initWorld({ THREE, DIAG }) {
  const D = DIAG || console;
  D.log("initWorld() start");

  // --- Ensure app container ---
  let app = document.getElementById("app");
  if (!app) {
    app = document.createElement("div");
    app.id = "app";
    app.style.cssText = "position:fixed; inset:0;";
    document.body.appendChild(app);
  }

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060b);

  // --- Rig + Camera ---
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 900);
  camera.rotation.order = "YXZ";
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  const player = { yaw: Math.PI, pitch: 0 };

  // ----------------------------------------------------
  // Materials (casino-ish)
  // ----------------------------------------------------
  const MAT_FLOOR_A = new THREE.MeshStandardMaterial({ color: 0x0e172a, roughness: 1.0, metalness: 0.0 });
  const MAT_FLOOR_B = new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 1.0, metalness: 0.0 });
  const MAT_INLAY   = new THREE.MeshStandardMaterial({ color: 0x213154, roughness: 0.9, metalness: 0.1 });
  const MAT_WALL    = new THREE.MeshStandardMaterial({ color: 0x17233d, roughness: 0.95, metalness: 0.05 });
  const MAT_TRIM    = new THREE.MeshStandardMaterial({ color: 0x2a3d66, roughness: 0.65, metalness: 0.18 });
  const MAT_RAIL    = new THREE.MeshStandardMaterial({ color: 0x3a5ea6, roughness: 0.35, metalness: 0.25 });
  const MAT_PIT     = new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: 1.0, metalness: 0.0 });
  const MAT_FELT    = new THREE.MeshStandardMaterial({ color: 0x0b3a2b, roughness: 0.92, metalness: 0.03 });
  const MAT_PADDED  = new THREE.MeshStandardMaterial({ color: 0x0c1326, roughness: 0.75, metalness: 0.15 });
  const MAT_CHAIR   = new THREE.MeshStandardMaterial({ color: 0x1c2a4a, roughness: 0.65, metalness: 0.15 });
  const MAT_ACCENT  = new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.45, metalness: 0.25, emissive: 0x163a88, emissiveIntensity: 0.6 });

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------
  function addMesh(geo, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  }

  // Colliders
  const colliders = [];
  function addCollider(mesh, pad = 0.06) {
    mesh.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(mesh);
    b.min.x -= pad; b.min.y -= pad; b.min.z -= pad;
    b.max.x += pad; b.max.y += pad; b.max.z += pad;
    colliders.push(b);
  }

  function blockedXZ(x, z) {
    const p1 = new THREE.Vector3(x, 0.20, z);
    const p2 = new THREE.Vector3(x, 1.20, z);
    for (const b of colliders) {
      if (b.containsPoint(p1) || b.containsPoint(p2)) return true;
    }
    return false;
  }

  function yawFaceTable(x, z) {
    const dx = -x;
    const dz = -z;
    return Math.atan2(dx, -dz);
  }

  function setRigPoseFloor(x, z, yaw = player.yaw) {
    rig.position.set(x, 0, z);
    rig.rotation.y = yaw;
    player.yaw = yaw;
    camera.rotation.x = player.pitch || 0;
  }

  function teleportTo(vec3, yaw = player.yaw) {
    setRigPoseFloor(vec3.x, vec3.z, yaw);
  }

  // ----------------------------------------------------
  // Lighting (bright enough to SEE)
  // ----------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(10, 18, 9);
  scene.add(sun);

  const core = new THREE.PointLight(0x3366ff, 1.2, 110);
  core.position.set(0, 9, 0);
  scene.add(core);

  // Rim lights
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const p = new THREE.PointLight(0x2f6bff, 0.35, 22);
    p.position.set(Math.cos(a) * 14, 2.8, Math.sin(a) * 14);
    scene.add(p);
  }

  // ----------------------------------------------------
  // LOBBY + FLOORS
  // ----------------------------------------------------
  const LOBBY_RADIUS = 18;
  const LOBBY_FLOOR_R = 22;

  // Main lobby floor
  const lobbyFloor = addMesh(new THREE.CircleGeometry(LOBBY_FLOOR_R, 128), MAT_FLOOR_A, 0, 0, 0);
  lobbyFloor.rotation.x = -Math.PI / 2;

  // Pattern inlays (rings)
  const inlay1 = addMesh(new THREE.RingGeometry(10.5, 10.9, 128), MAT_INLAY, 0, 0.01, 0);
  inlay1.rotation.x = -Math.PI / 2;

  const inlay2 = addMesh(new THREE.RingGeometry(16.2, 16.7, 128), MAT_INLAY, 0, 0.01, 0);
  inlay2.rotation.x = -Math.PI / 2;

  // Outer trim ring
  const outerTrim = addMesh(new THREE.RingGeometry(LOBBY_RADIUS - 0.5, LOBBY_RADIUS + 0.5, 160), MAT_TRIM, 0, 0.015, 0);
  outerTrim.rotation.x = -Math.PI / 2;

  // ----------------------------------------------------
  // PIT DIVOT (obvious)
  // ----------------------------------------------------
  const PIT_R = 6.4;
  const PIT_DEPTH = 0.55;

  // Pit base
  const pit = addMesh(new THREE.CircleGeometry(PIT_R, 128), MAT_PIT, 0, -PIT_DEPTH, 0);
  pit.rotation.x = -Math.PI / 2;

  // Pit slope (visual wall)
  const pitWall = addMesh(new THREE.CylinderGeometry(PIT_R + 0.45, PIT_R + 0.05, PIT_DEPTH, 128, 1, true), MAT_TRIM, 0, -PIT_DEPTH / 2, 0);
  pitWall.rotation.y = 0;

  // Pit rim
  const pitRim = addMesh(new THREE.RingGeometry(PIT_R + 0.02, PIT_R + 0.55, 160), MAT_TRIM, 0, -PIT_DEPTH + 0.46, 0);
  pitRim.rotation.x = -Math.PI / 2;

  // Guard rail posts
  const railR = PIT_R + 1.15;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = Math.cos(a) * railR;
    const z = Math.sin(a) * railR;
    const post = addMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.05, 12), MAT_RAIL, x, 0.52, z);
    addCollider(post, 0.03);
  }
  const railRing = addMesh(new THREE.TorusGeometry(railR, 0.055, 10, 160), MAT_RAIL, 0, 1.05, 0);
  railRing.rotation.x = Math.PI / 2;

  // Steps down into pit (one segment)
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.75), MAT_TRIM);
    step.position.set(-4.2 + i * 0.25, -0.10 - i * 0.08, -8.5 + i * 0.6);
    step.rotation.y = 0.4;
    scene.add(step);
    addCollider(step, 0.04);
  }

  // ----------------------------------------------------
  // CASINO TABLE + CHAIRS
  // ----------------------------------------------------
  // Platform inside pit (so you clearly see it)
  const plat = addMesh(new THREE.CylinderGeometry(2.45, 2.45, 0.22, 96), MAT_TRIM, 0, -PIT_DEPTH + 0.25, 0);
  addCollider(plat, 0.10);

  // Table base
  const base = addMesh(new THREE.CylinderGeometry(0.55, 0.85, 0.95, 48), MAT_PADDED, 0, -PIT_DEPTH + 0.72, 0);
  addCollider(base, 0.18);

  // Table rim + padded rail
  const railOuter = addMesh(new THREE.TorusGeometry(1.55, 0.12, 12, 128), MAT_PADDED, 0, -PIT_DEPTH + 1.15, 0);
  railOuter.rotation.x = Math.PI / 2;
  addCollider(railOuter, 0.12);

  const railTrim = addMesh(new THREE.TorusGeometry(1.55, 0.04, 10, 128), MAT_TRIM, 0, -PIT_DEPTH + 1.18, 0);
  railTrim.rotation.x = Math.PI / 2;

  // Felt top
  const feltTop = addMesh(new THREE.CylinderGeometry(1.35, 1.35, 0.07, 96), MAT_FELT, 0, -PIT_DEPTH + 1.18, 0);
  addCollider(feltTop, 0.18);

  // Dealer “chip” marker
  const dealer = addMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 32), MAT_ACCENT, 0.6, -PIT_DEPTH + 1.23, -0.2);
  dealer.rotation.x = Math.PI / 2;

  // Chairs (6 around table)
  function makeChair(angle, r) {
    const g = new THREE.Group();
    g.position.set(Math.cos(angle) * r, -PIT_DEPTH + 0.0, Math.sin(angle) * r);
    g.rotation.y = -angle + Math.PI;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.65), MAT_CHAIR);
    seat.position.set(0, 0.28, 0);
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.08), MAT_CHAIR);
    back.position.set(0, 0.62, 0.28);
    g.add(back);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.26, 10);
    const legPos = [
      [-0.26, 0.13, -0.26],
      [ 0.26, 0.13, -0.26],
      [-0.26, 0.13,  0.26],
      [ 0.26, 0.13,  0.26],
    ];
    for (const [lx, ly, lz] of legPos) {
      const leg = new THREE.Mesh(legGeo, MAT_TRIM);
      leg.position.set(lx, ly, lz);
      g.add(leg);
    }

    scene.add(g);

    // simple collider box (so you can’t walk through chair)
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.75), new THREE.MeshBasicMaterial({ visible: false }));
    col.position.copy(g.position);
    col.position.y += 0.5;
    scene.add(col);
    addCollider(col, 0.02);
  }

  for (let i = 0; i < 6; i++) makeChair((i / 6) * Math.PI * 2 + 0.35, 2.65);

  // ----------------------------------------------------
  // WALLS: LOBBY RING with 4 OPENINGS aligned to hallways
  // ----------------------------------------------------
  // Instead of a full wall ring, we build segments and skip the 4 doorway angles.
  const wallH = 3.0;
  const wallT = 0.55;
  const segCount = 48;

  function angleNear(a, target, eps) {
    // shortest angular difference
    let d = a - target;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d) < eps;
  }

  const DOOR_EPS = 0.18; // how wide the lobby opening is (radians)
  const doorAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];

  for (let i = 0; i < segCount; i++) {
    const a0 = (i / segCount) * Math.PI * 2;
    const a1 = ((i + 1) / segCount) * Math.PI * 2;
    const mid = (a0 + a1) / 2;

    // Skip segments near door angles to create openings
    let skip = false;
    for (const da of doorAngles) {
      if (angleNear(mid, da, DOOR_EPS)) { skip = true; break; }
    }
    if (skip) continue;

    const mx = Math.cos(mid) * LOBBY_RADIUS;
    const mz = Math.sin(mid) * LOBBY_RADIUS;
    const len = (Math.PI * 2 * LOBBY_RADIUS) / segCount;

    const w = addMesh(new THREE.BoxGeometry(len, wallH, wallT), MAT_WALL, mx, wallH/2, mz, -mid);
    addCollider(w, 0.05);
  }

  // ----------------------------------------------------
  // HALLWAYS + ROOMS (tight, sealed)
  // ----------------------------------------------------
  const HALL_LEN = 12;
  const HALL_W = 6;

  const ROOM_W = 16;
  const ROOM_D = 16;
  const ROOM_H = 4;

  const roomCenters = [];

  const dirs = [
    { name: "STORE", angle: 0,            color: 0x2f6bff },
    { name: "VIP",   angle: Math.PI/2,    color: 0xaa44ff },
    { name: "SCORP", angle: Math.PI,      color: 0xffcc44 },
    { name: "GAMES", angle: -Math.PI/2,   color: 0x44ffaa }
  ];

  function buildHallAndRoom(d) {
    const angle = d.angle;
    const cx = Math.cos(angle), cz = Math.sin(angle);
    const px = -cz, pz = cx;

    const hallStartR = LOBBY_RADIUS - 1.2;
    const hallCenterR = hallStartR + HALL_LEN/2;

    const hx = cx * hallCenterR;
    const hz = cz * hallCenterR;

    // Hall floor (contrast)
    const hallFloor = addMesh(new THREE.PlaneGeometry(HALL_W, HALL_LEN), MAT_FLOOR_B, hx, 0.012, hz);
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.rotation.z = angle;

    // Hall side walls
    const sideGeo = new THREE.BoxGeometry(HALL_LEN, 2.9, 0.35);
    const leftWall  = addMesh(sideGeo, MAT_WALL, hx + px*(HALL_W/2), 1.45, hz + pz*(HALL_W/2), angle);
    const rightWall = addMesh(sideGeo, MAT_WALL, hx - px*(HALL_W/2), 1.45, hz - pz*(HALL_W/2), angle);
    addCollider(leftWall, 0.05);
    addCollider(rightWall, 0.05);

    // Hall ceiling trim (visual)
    const ceil = addMesh(new THREE.BoxGeometry(HALL_W, 0.10, HALL_LEN), MAT_TRIM, hx, 2.95, hz, angle);
    // no collider

    // Hall lights
    for (let i = 0; i < 3; i++) {
      const t = (i / 2) - 0.5;
      const lx = hx + cx * (t * HALL_LEN * 0.8);
      const lz = hz + cz * (t * HALL_LEN * 0.8);
      const pl = new THREE.PointLight(d.color, 0.95, 20);
      pl.position.set(lx, 2.5, lz);
      scene.add(pl);
    }

    // Room center
    const roomCenterR = hallStartR + HALL_LEN + ROOM_D/2;
    const rx = cx * roomCenterR;
    const rz = cz * roomCenterR;
    roomCenters.push({ name: d.name, x: rx, z: rz, angle, color: d.color });

    // Room floor
    const roomFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0a1122, roughness: 1.0, metalness: 0,
      emissive: d.color, emissiveIntensity: 0.05
    });
    const roomFloor = addMesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), roomFloorMat, rx, 0.012, rz);
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.rotation.z = angle;

    // Room walls with doorway on front side toward hallway (+Z local)
    const halfW = ROOM_W/2, halfD = ROOM_D/2;
    const doorW = 5.2;
    const sideW = (ROOM_W - doorW)/2;

    function addRoomWall(localX, localZ, w, dZ) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, ROOM_H, dZ), MAT_WALL);
      const v = new THREE.Vector3(localX, ROOM_H/2, localZ).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
      m.position.set(rx + v.x, v.y, rz + v.z);
      m.rotation.y = angle;
      scene.add(m);
      addCollider(m, 0.05);
      return m;
    }

    addRoomWall(0, -halfD, ROOM_W, 0.35);      // back
    addRoomWall(-halfW, 0, 0.35, ROOM_D);      // left
    addRoomWall(halfW, 0, 0.35, ROOM_D);       // right
    addRoomWall(-(doorW/2 + sideW/2), halfD, sideW, 0.35); // front left
    addRoomWall((doorW/2 + sideW/2), halfD, sideW, 0.35);  // front right

    // Room light
    const pl = new THREE.PointLight(d.color, 1.25, 55);
    pl.position.set(rx, 3.1, rz);
    scene.add(pl);

    // Door frame trim (visual)
    const doorFrame = addMesh(new THREE.BoxGeometry(doorW, 2.9, 0.10), MAT_TRIM, rx + cx*(halfD - 0.18), 1.45, rz + cz*(halfD - 0.18), angle);

    // STORE room prep (physical store layout)
    if (d.name === "STORE") {
      // Kiosk platform in the middle
      const kiosk = addMesh(new THREE.BoxGeometry(3.2, 0.2, 2.2), MAT_TRIM, rx, 0.12, rz, angle);
      addCollider(kiosk, 0.06);

      const kioskTop = addMesh(new THREE.BoxGeometry(3.0, 0.10, 2.0), MAT_ACCENT, rx, 0.32, rz, angle);

      // Display walls / shelves on both sides
      const shelfL = addMesh(new THREE.BoxGeometry(0.35, 2.4, 6.2), MAT_TRIM, rx - 6.4*cz, 1.2, rz + 6.4*cx, angle);
      const shelfR = addMesh(new THREE.BoxGeometry(0.35, 2.4, 6.2), MAT_TRIM, rx + 6.4*cz, 1.2, rz - 6.4*cx, angle);
      addCollider(shelfL, 0.05);
      addCollider(shelfR, 0.05);

      // Pedestal pads (for mannequins later)
      for (let i = -2; i <= 2; i++) {
        const px2 = rx + (i * 1.55) * cz;
        const pz2 = rz - (i * 1.55) * cx;
        const ped = addMesh(new THREE.CylinderGeometry(0.45, 0.45, 0.18, 32), MAT_TRIM, px2, 0.09, pz2);
        addCollider(ped, 0.05);
      }

      // Balcony + stairs (already requested)
      const balc = addMesh(new THREE.BoxGeometry(ROOM_W*0.72, 0.18, ROOM_D*0.46), MAT_BALC, rx, 2.25, rz - 2.0, angle);
      addCollider(balc, 0.05);

      const rail = addMesh(new THREE.BoxGeometry(ROOM_W*0.72, 0.10, 0.10), MAT_RAIL, rx, 2.80, rz - (2.0 + ROOM_D*0.23), angle);
      addCollider(rail, 0.04);

      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.65), MAT_TRIM);
        const localZ = 5.0 - i * 0.70;
        const localY = 0.18 + i * 0.26;
        const localX = -5.0;
        const v = new THREE.Vector3(localX, localY, localZ).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
        step.position.set(rx + v.x, v.y, rz + v.z);
        step.rotation.y = angle;
        scene.add(step);
        addCollider(step, 0.04);
      }

      const storeGlow = new THREE.PointLight(0x2f6bff, 1.35, 65);
      storeGlow.position.set(rx, 3.5, rz - 1.0);
      scene.add(storeGlow);
    }
  }

  for (const d of dirs) buildHallAndRoom(d);

  // ----------------------------------------------------
  // Spawn pads
  // ----------------------------------------------------
  const spawnPads = [];
  const padGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 48);

  function makePad(x, z, color, label) {
    const pad = new THREE.Mesh(
      padGeo,
      new THREE.MeshStandardMaterial({
        color: 0x091022, roughness: 0.35, metalness: 0.2,
        emissive: color, emissiveIntensity: 1.2
      })
    );
    pad.position.set(x, 0.035, z);
    pad.name = "spawn_pad";
    pad.userData.teleportPos = new THREE.Vector3(x, 0, z);
    pad.userData.yaw = yawFaceTable(x, z);
    pad.userData.label = label || "";
    scene.add(pad);
    spawnPads.push(pad);

    const beacon = addMesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: 0.9 }),
      x, 0.45, z
    );
    addCollider(beacon, 0.03);

    return pad;
  }

  const entranceR = LOBBY_RADIUS + 4.9;
  makePad(Math.cos(0) * entranceR, Math.sin(0) * entranceR, 0x2f6bff, "STORE_ENT");
  makePad(Math.cos(Math.PI/2) * entranceR, Math.sin(Math.PI/2) * entranceR, 0xaa44ff, "VIP_ENT");
  makePad(Math.cos(Math.PI) * entranceR, Math.sin(Math.PI) * entranceR, 0xffcc44, "SCORP_ENT");
  makePad(Math.cos(-Math.PI/2) * entranceR, Math.sin(-Math.PI/2) * entranceR, 0x44ffaa, "GAMES_ENT");

  // Room center pads
  for (const rc of roomCenters) {
    makePad(rc.x, rc.z, rc.color, rc.name + "_CENTER");
  }

  // ----------------------------------------------------
  // Safe spawn (never inside objects)
  // ----------------------------------------------------
  function safeSpawn(label = "STORE_ENT", forwardMeters = 1.35) {
    const pad = spawnPads.find(p => p.userData?.label === label) || spawnPads[0];
    const yaw = pad?.userData?.yaw ?? Math.PI;

    const away = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(-1);
    const pos = pad.userData.teleportPos.clone().add(away.multiplyScalar(forwardMeters));

    let tries = 0;
    while (blockedXZ(pos.x, pos.z) && tries++ < 18) {
      pos.add(away.clone().multiplyScalar(0.45));
    }

    teleportTo(pos, yawFaceTable(pos.x, pos.z));
    D.log("[spawn] safeSpawn ✅", { label, x: pos.x, z: pos.z });
  }

  safeSpawn("STORE_ENT", 1.35);

  // ----------------------------------------------------
  // Frame hook system (modules attach here)
  // ----------------------------------------------------
  const frameHooks = [];
  function addFrameHook(fn) { frameHooks.push(fn); }

  // ----------------------------------------------------
  // Expose permanent world API
  // ----------------------------------------------------
  window.__SCARLETT1__ = {
    THREE,
    scene,
    renderer,
    camera,
    rig,
    player,
    spawnPads,
    teleportTo,
    addFrameHook,
    colliders,
    blockedXZ
  };

  // ----------------------------------------------------
  // Resize
  // ----------------------------------------------------
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  // ----------------------------------------------------
  // Render loop
  // ----------------------------------------------------
  D.log("render loop start ✅ (world owns loop)");

  let lastT = 0;
  renderer.setAnimationLoop((tMs) => {
    const t = tMs * 0.001;
    const dt = Math.min(0.05, Math.max(0.001, t - lastT));
    lastT = t;

    for (const fn of frameHooks) {
      try { fn({ t, dt }); } catch (e) { D.error("[frameHook] error:", e?.message || e); }
    }

    renderer.render(scene, camera);
  });

  D.log("World running ✅");
}

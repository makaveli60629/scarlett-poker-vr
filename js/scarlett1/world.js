// /js/scarlett1/world.js — Scarlett 1.2 WORLD (FULL • UPDATED • PERMANENT)
// ✅ Exports: initWorld() (boot-compatible)
// ✅ Solid walls + hallways + door openings
// ✅ Pit divot + rails + center table
// ✅ Spawn pads: always safe, always face the table
// ✅ Colliders + blockedXZ()
// ✅ Frame hook system for modules (bots/store/etc.)
// ✅ Better lighting + clear navigation
//
// NOTE: This world does NOT touch your PERMANENT XR controls.
// It only provides geometry + spawn + safe APIs for spine/modules.

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
  scene.background = new THREE.Color(0x05070d);

  // --- Rig + Camera ---
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 700);
  camera.rotation.order = "YXZ";
  camera.position.set(0, 1.65, 0); // 2D height; XR uses floor tracking
  rig.add(camera);

  // --- Player state (yaw/pitch are used by spine) ---
  const player = { yaw: Math.PI, pitch: 0 };

  // ----------------------------------------------------
  // Materials
  // ----------------------------------------------------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0f1626, roughness: 1, metalness: 0 });
  const MAT_HALL  = new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 1, metalness: 0 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x18233b, roughness: 0.95, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x2a3d66, roughness: 0.7, metalness: 0.15 });
  const MAT_PIT   = new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 1, metalness: 0 });
  const MAT_RAIL  = new THREE.MeshStandardMaterial({ color: 0x3a5ea6, roughness: 0.35, metalness: 0.25 });
  const MAT_BALC  = new THREE.MeshStandardMaterial({ color: 0x101a33, roughness: 0.9, metalness: 0.05 });
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0b3a2b, roughness: 0.9, metalness: 0.05 });

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

  // Colliders (AABB list)
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

  function setRigPoseFloor(x, z, yaw = player.yaw) {
    rig.position.set(x, 0, z);
    rig.rotation.y = yaw;
    player.yaw = yaw;
    camera.rotation.x = player.pitch || 0;
  }

  function yawFaceTable(x, z) {
    // Face origin (table at 0,0)
    const dx = -x;
    const dz = -z;
    return Math.atan2(dx, -dz);
  }

  function teleportTo(vec3, yaw = player.yaw) {
    setRigPoseFloor(vec3.x, vec3.z, yaw);
  }

  // ----------------------------------------------------
  // Lighting (clear + readable)
  // ----------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.10));

  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(12, 18, 10);
  scene.add(sun);

  const core = new THREE.PointLight(0x3366ff, 1.25, 95);
  core.position.set(0, 9, 0);
  scene.add(core);

  // Additional “wayfinding” lights around ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.PointLight(0x2f6bff, 0.35, 20);
    p.position.set(Math.cos(a) * 14, 2.6, Math.sin(a) * 14);
    scene.add(p);
  }

  // ----------------------------------------------------
  // Lobby + Pit + Table
  // ----------------------------------------------------
  const LOBBY_RADIUS = 18;
  const LOBBY_FLOOR_R = 22;

  const lobbyFloor = addMesh(new THREE.CircleGeometry(LOBBY_FLOOR_R, 96), MAT_FLOOR, 0, 0, 0);
  lobbyFloor.rotation.x = -Math.PI / 2;

  const ring = addMesh(new THREE.RingGeometry(LOBBY_RADIUS - 0.45, LOBBY_RADIUS + 0.45, 128), MAT_TRIM, 0, 0.01, 0);
  ring.rotation.x = -Math.PI / 2;

  // Pit divot disc
  const pitDisc = addMesh(new THREE.CircleGeometry(6.25, 96), MAT_PIT, 0, -0.12, 0);
  pitDisc.rotation.x = -Math.PI / 2;

  const pitRim = addMesh(new THREE.RingGeometry(6.18, 6.60, 128), MAT_TRIM, 0, -0.10, 0);
  pitRim.rotation.x = -Math.PI / 2;

  // Rail posts + ring
  const railR = 7.25;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = Math.cos(a) * railR;
    const z = Math.sin(a) * railR;
    const post = addMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12), MAT_RAIL, x, 0.5, z);
    addCollider(post, 0.03);
  }
  const railRing = addMesh(new THREE.TorusGeometry(railR, 0.05, 10, 128), MAT_RAIL, 0, 1.0, 0);
  railRing.rotation.x = Math.PI / 2;

  // Center platform + poker table
  const platform = addMesh(new THREE.CylinderGeometry(2.25, 2.25, 0.18, 64), MAT_TRIM, 0, 0.15, 0);
  addCollider(platform, 0.12);

  const tableBase = addMesh(new THREE.CylinderGeometry(1.15, 1.15, 0.18, 64), MAT_TRIM, 0, 0.95, 0);
  addCollider(tableBase, 0.22);

  const felt = addMesh(new THREE.CylinderGeometry(1.05, 1.05, 0.06, 64), MAT_FELT, 0, 1.08, 0);
  addCollider(felt, 0.22);

  // ----------------------------------------------------
  // Lobby Wall Ring (solid)
  // ----------------------------------------------------
  const wallH = 2.85;
  const segCount = 24;
  for (let i = 0; i < segCount; i++) {
    const a0 = (i / segCount) * Math.PI * 2;
    const a1 = ((i + 1) / segCount) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    const mx = Math.cos(mid) * LOBBY_RADIUS;
    const mz = Math.sin(mid) * LOBBY_RADIUS;
    const len = (Math.PI * 2 * LOBBY_RADIUS) / segCount;

    const w = addMesh(new THREE.BoxGeometry(len, wallH, 0.55), MAT_WALL, mx, wallH / 2, mz, -mid);
    addCollider(w, 0.04);
  }

  // ----------------------------------------------------
  // Hallways + Rooms (STORE, VIP, SCORP, GAMES)
  // ----------------------------------------------------
  const HALL_LEN = 12;
  const HALL_W = 6;

  const ROOM_W = 16;
  const ROOM_D = 16;
  const ROOM_H = 4;

  const dirs = [
    { name: "STORE", angle: 0,            color: 0x2f6bff },
    { name: "VIP",   angle: Math.PI/2,    color: 0xaa44ff },
    { name: "SCORP", angle: Math.PI,      color: 0xffcc44 },
    { name: "GAMES", angle: -Math.PI/2,   color: 0x44ffaa }
  ];

  const roomCenters = [];

  function buildHallAndRoom(d) {
    const angle = d.angle;
    const cx = Math.cos(angle), cz = Math.sin(angle);

    // Hall center
    const hallStartR = LOBBY_RADIUS - 1.2;
    const hallCenterR = hallStartR + HALL_LEN / 2;
    const hx = cx * hallCenterR;
    const hz = cz * hallCenterR;

    // Hall floor
    const hallFloor = addMesh(new THREE.PlaneGeometry(HALL_W, HALL_LEN), MAT_HALL, hx, 0.01, hz);
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.rotation.z = angle;

    // Hall walls
    const px = -cz, pz = cx;
    const sideGeo = new THREE.BoxGeometry(HALL_LEN, 2.8, 0.35);
    const leftWall  = addMesh(sideGeo, MAT_WALL, hx + px*(HALL_W/2), 1.4, hz + pz*(HALL_W/2), angle);
    const rightWall = addMesh(sideGeo, MAT_WALL, hx - px*(HALL_W/2), 1.4, hz - pz*(HALL_W/2), angle);
    addCollider(leftWall, 0.04);
    addCollider(rightWall, 0.04);

    // Door frame trim at room end (pure visual)
    const doorTrim = addMesh(new THREE.BoxGeometry(HALL_W, 2.8, 0.08), MAT_TRIM,
      cx*(hallStartR + HALL_LEN - 0.2), 1.4, cz*(hallStartR + HALL_LEN - 0.2), angle);
    // no collider for trim

    // Hall lights
    for (let i = 0; i < 3; i++) {
      const t = (i / 2) - 0.5;
      const lx = hx + cx * (t * HALL_LEN * 0.8);
      const lz = hz + cz * (t * HALL_LEN * 0.8);
      const pl = new THREE.PointLight(d.color, 0.8, 18);
      pl.position.set(lx, 2.4, lz);
      scene.add(pl);
    }

    // Room center
    const roomCenterR = hallStartR + HALL_LEN + ROOM_D/2;
    const rx = cx * roomCenterR;
    const rz = cz * roomCenterR;
    roomCenters.push({ name: d.name, x: rx, z: rz, angle, color: d.color });

    // Room floor
    const roomFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120, roughness: 1, metalness: 0,
      emissive: d.color, emissiveIntensity: 0.06
    });
    const roomFloor = addMesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), roomFloorMat, rx, 0.01, rz);
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.rotation.z = angle;

    // Room walls with doorway on the side facing the hallway
    const wallT = 0.35;
    const halfW = ROOM_W/2;
    const halfD = ROOM_D/2;

    const doorW = 5.0; // doorway opening width
    const sideW = (ROOM_W - doorW) / 2;

    function addRoomWall(localX, localZ, w, dZ) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, ROOM_H, dZ), MAT_WALL);
      const v = new THREE.Vector3(localX, ROOM_H/2, localZ).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
      m.position.set(rx + v.x, v.y, rz + v.z);
      m.rotation.y = angle;
      scene.add(m);
      addCollider(m, 0.04);
    }

    // Back wall
    addRoomWall(0, -halfD, ROOM_W, wallT);
    // Side walls
    addRoomWall(-halfW, 0, wallT, ROOM_D);
    addRoomWall(halfW, 0, wallT, ROOM_D);
    // Front wall split around doorway (front is toward +Z local)
    addRoomWall(-(doorW/2 + sideW/2), halfD, sideW, wallT);
    addRoomWall((doorW/2 + sideW/2), halfD, sideW, wallT);

    // Room light
    const pl = new THREE.PointLight(d.color, 1.1, 45);
    pl.position.set(rx, 3.0, rz);
    scene.add(pl);

    // Room signage (visual)
    const sign = addMesh(new THREE.BoxGeometry(2.8, 0.45, 0.08), MAT_TRIM,
      rx + cx*(halfD - 0.25), 2.6, rz + cz*(halfD - 0.25), angle);
    // no collider

    // STORE: balcony + stairs
    if (d.name === "STORE") {
      // Balcony deck (raised)
      const balc = addMesh(
        new THREE.BoxGeometry(ROOM_W*0.72, 0.18, ROOM_D*0.46),
        MAT_BALC,
        rx, 2.2, rz - 2.0, angle
      );
      addCollider(balc, 0.04);

      // Balcony rail
      const rail = addMesh(
        new THREE.BoxGeometry(ROOM_W*0.72, 0.10, 0.10),
        MAT_RAIL,
        rx, 2.75, rz - (2.0 + ROOM_D*0.23), angle
      );
      addCollider(rail, 0.03);

      // Stairs up to balcony (in room corner)
      const steps = 9;
      for (let i = 0; i < steps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.62), MAT_TRIM);
        const localZ = 4.9 - i * 0.68;
        const localY = 0.18 + i * 0.26;
        const localX = -4.9;
        const v = new THREE.Vector3(localX, localY, localZ).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
        step.position.set(rx + v.x, v.y, rz + v.z);
        step.rotation.y = angle;
        scene.add(step);
        addCollider(step, 0.03);
      }

      // Extra store lighting
      const storeGlow = new THREE.PointLight(0x2f6bff, 1.2, 60);
      storeGlow.position.set(rx, 3.4, rz - 1.0);
      scene.add(storeGlow);
    }
  }

  for (const d of dirs) buildHallAndRoom(d);

  // ----------------------------------------------------
  // Spawn Pads (teleport targets)
  // ----------------------------------------------------
  const spawnPads = [];
  const padGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 48);

  function makePad(x, z, color, label) {
    const pad = new THREE.Mesh(
      padGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0b142a,
        roughness: 0.4,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 1.1
      })
    );
    pad.position.set(x, 0.035, z);
    pad.name = "spawn_pad";
    pad.userData.teleportPos = new THREE.Vector3(x, 0, z);
    pad.userData.yaw = yawFaceTable(x, z); // always face table
    pad.userData.label = label || "";
    scene.add(pad);
    spawnPads.push(pad);

    // Beacon (tiny collider so you don't stand inside)
    const beacon = addMesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: 0.8 }),
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

  for (const rc of roomCenters) {
    makePad(rc.x, rc.z, rc.color, rc.name + "_CENTER");
  }

  // ----------------------------------------------------
  // Safe spawn (never on objects, always faces table)
  // ----------------------------------------------------
  function safeSpawn(label = "STORE_ENT", forwardMeters = 1.25) {
    const pad = spawnPads.find(p => p.userData?.label === label) || spawnPads[0];
    const yaw = pad?.userData?.yaw ?? Math.PI;

    // Move slightly “out” from pad so you never stand on beacon/edge
    const away = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(-1);
    const pos = pad.userData.teleportPos.clone().add(away.multiplyScalar(forwardMeters));

    let tries = 0;
    while (blockedXZ(pos.x, pos.z) && tries++ < 16) {
      pos.add(away.clone().multiplyScalar(0.5));
    }

    teleportTo(pos, yawFaceTable(pos.x, pos.z));
    D.log("[spawn] safeSpawn ✅", { label, x: pos.x, z: pos.z });
  }

  safeSpawn("STORE_ENT", 1.25);

  // ----------------------------------------------------
  // Hook system (modules use this)
  // ----------------------------------------------------
  const frameHooks = [];
  function addFrameHook(fn) { frameHooks.push(fn); }

  // ----------------------------------------------------
  // Expose permanent world API to window (spine/modules rely on this)
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
  // Render loop (world owns loop; spine hooks in)
  // ----------------------------------------------------
  D.log("render loop start ✅ (world owns loop)");

  let lastT = 0;
  renderer.setAnimationLoop((tMs) => {
    const t = tMs * 0.001;
    const dt = Math.min(0.05, Math.max(0.001, t - lastT));
    lastT = t;

    // run hooks safely
    for (const fn of frameHooks) {
      try { fn({ t, dt }); } catch (e) { D.error("[frameHook] error:", e?.message || e); }
    }

    renderer.render(scene, camera);
  });

  D.log("World running ✅");
}

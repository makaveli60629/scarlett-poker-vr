// /js/scarlett1/world.js — Scarlett 1 World v5
// ✅ Spawn in ROOM (default STORE_CENTER)
// ✅ PlayerRig group so camera + controllers/lasers move together
// ✅ Solid colliders for walls / pit / table
// ✅ Spawn safety: never spawn inside objects; auto-picks next pad if blocked
// Exposes window.__SCARLETT1__ for spine_xr.js

export async function initWorld({ THREE, DIAG }) {
  const D = DIAG || console;
  D.log("initWorld() start");

  const app = document.getElementById("app");
  if (!app) throw new Error("#app missing");

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // ---------- Scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  // ---------- PlayerRig ----------
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    500
  );
  camera.rotation.order = "YXZ";
  rig.add(camera);

  // Player state
  const player = {
    yaw: Math.PI,
    pitch: 0
  };

  function setRigPose(x, y, z, yaw = player.yaw) {
    rig.position.set(x, y, z);
    player.yaw = yaw;
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.0));

  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(8, 14, 6);
  scene.add(dir);

  const blue = new THREE.PointLight(0x3366ff, 1.1, 60);
  blue.position.set(0, 7, 0);
  scene.add(blue);

  const purple = new THREE.PointLight(0xaa44ff, 0.8, 80);
  purple.position.set(-12, 5, -12);
  scene.add(purple);

  // ---------- Materials ----------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({
    color: 0x0f1626,
    roughness: 1.0,
    metalness: 0.0
  });

  const MAT_WALL = new THREE.MeshStandardMaterial({
    color: 0x18233b,
    roughness: 0.95,
    metalness: 0.05
  });

  const MAT_TRIM = new THREE.MeshStandardMaterial({
    color: 0x2a3d66,
    roughness: 0.7,
    metalness: 0.15
  });

  const MAT_PIT = new THREE.MeshStandardMaterial({
    color: 0x070a12,
    roughness: 1,
    metalness: 0
  });

  function addMesh(geo, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  // ---------- COLLIDERS ----------
  // We'll store Box3 in world-space every frame (static objects so one-time calc is OK)
  const colliders = [];
  function addColliderForMesh(mesh, pad = 0.08) {
    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    box.min.x -= pad; box.min.y -= pad; box.min.z -= pad;
    box.max.x += pad; box.max.y += pad; box.max.z += pad;
    colliders.push({ mesh, box });
  }

  function pointBlocked(x, y, z) {
    const p = new THREE.Vector3(x, y, z);
    for (const c of colliders) {
      if (c.box.containsPoint(p)) return true;
    }
    return false;
  }

  // ---------- WORLD GEOMETRY ----------
  const LOBBY_RADIUS = 18;
  const LOBBY_FLOOR_R = 22;

  // Lobby floor
  const lobbyFloor = addMesh(new THREE.CircleGeometry(LOBBY_FLOOR_R, 96), MAT_FLOOR, 0, 0, 0);
  lobbyFloor.rotation.x = -Math.PI / 2;

  // Ring trim
  const ring = addMesh(
    new THREE.RingGeometry(LOBBY_RADIUS - 0.4, LOBBY_RADIUS + 0.4, 128),
    MAT_TRIM,
    0,
    0.01,
    0
  );
  ring.rotation.x = -Math.PI / 2;

  // Pit disc (visual)
  const pitDisc = addMesh(new THREE.CircleGeometry(6.2, 80), MAT_PIT, 0, -0.12, 0);
  pitDisc.rotation.x = -Math.PI / 2;

  // Pit rim
  const pitRim = addMesh(new THREE.RingGeometry(6.15, 6.5, 96), MAT_TRIM, 0, -0.10, 0);
  pitRim.rotation.x = -Math.PI / 2;

  // Center platform + table placeholder (solid)
  const platform = addMesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b2a22, roughness: 0.85, metalness: 0.05 }),
    0,
    0.15,
    0
  );

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2b, roughness: 0.85, metalness: 0.05 })
  );
  table.position.set(0, 1.05, 0);
  scene.add(table);

  // Lobby wall ring (solid)
  const wallH = 2.8;
  const segCount = 24;
  for (let i = 0; i < segCount; i++) {
    const a0 = (i / segCount) * Math.PI * 2;
    const a1 = ((i + 1) / segCount) * Math.PI * 2;
    const mx = Math.cos((a0 + a1) / 2) * LOBBY_RADIUS;
    const mz = Math.sin((a0 + a1) / 2) * LOBBY_RADIUS;
    const len = (Math.PI * 2 * LOBBY_RADIUS) / segCount;

    const w = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, 0.55), MAT_WALL);
    w.position.set(mx, wallH / 2, mz);
    w.rotation.y = -((a0 + a1) / 2);
    scene.add(w);
  }

  // Rooms + hallways (with SOLID room walls)
  const HALL_LEN = 12;
  const HALL_W = 6;
  const ROOM_W = 16;
  const ROOM_D = 16;
  const ROOM_H = 4;

  const dirs = [
    { name: "STORE", angle: 0, color: 0x2f6bff },
    { name: "VIP", angle: Math.PI / 2, color: 0xaa44ff },
    { name: "SCORP", angle: Math.PI, color: 0xffcc44 },
    { name: "GAMES", angle: -Math.PI / 2, color: 0x44ffaa }
  ];

  const roomCenters = [];

  function buildHallAndRoom(angle, roomName, accent) {
    const cx = Math.cos(angle);
    const cz = Math.sin(angle);

    const hallStartR = LOBBY_RADIUS - 1.2;
    const hallCenterR = hallStartR + HALL_LEN / 2;
    const hx = cx * hallCenterR;
    const hz = cz * hallCenterR;

    // Hall floor
    const hallFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_W, HALL_LEN),
      new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 1, metalness: 0 })
    );
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(hx, 0.01, hz);
    hallFloor.rotation.z = angle;
    scene.add(hallFloor);

    // Room center
    const roomCenterR = hallStartR + HALL_LEN + ROOM_D / 2;
    const rx = cx * roomCenterR;
    const rz = cz * roomCenterR;

    // Room floor
    const roomFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      new THREE.MeshStandardMaterial({
        color: 0x0b1120,
        roughness: 1,
        metalness: 0,
        emissive: accent,
        emissiveIntensity: 0.06
      })
    );
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(rx, 0.01, rz);
    roomFloor.rotation.z = angle;
    scene.add(roomFloor);

    // SOLID room walls: build 4 walls, leaving the hallway opening
    const wallT = 0.35;
    const halfW = ROOM_W / 2;
    const halfD = ROOM_D / 2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x131c2f,
      roughness: 0.95,
      metalness: 0.05,
      emissive: accent,
      emissiveIntensity: 0.04
    });

    // Helper to place wall in room-local then rotate around room center
    function addRoomWall(localX, localZ, w, d) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, ROOM_H, d), wallMat);
      // local -> world
      const v = new THREE.Vector3(localX, ROOM_H / 2, localZ);
      v.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
      m.position.set(rx + v.x, v.y, rz + v.z);
      m.rotation.y = angle;
      scene.add(m);
      return m;
    }

    // Back wall
    const back = addRoomWall(0, -halfD, ROOM_W, wallT);
    // Left wall
    const left = addRoomWall(-halfW, 0, wallT, ROOM_D);
    // Right wall
    const right = addRoomWall(halfW, 0, wallT, ROOM_D);
    // Front wall (split: leave doorway opening aligned to hallway)
    const doorW = 5.0;
    const sideW = (ROOM_W - doorW) / 2;
    const frontL = addRoomWall(-(doorW/2 + sideW/2), halfD, sideW, wallT);
    const frontR = addRoomWall((doorW/2 + sideW/2), halfD, sideW, wallT);

    // Accent light inside room
    const pl = new THREE.PointLight(accent, 1.2, 45);
    pl.position.set(rx, 3.0, rz);
    scene.add(pl);

    // Store center
    roomCenters.push({ name: roomName, x: rx, z: rz, angle });

    // Add colliders for walls
    addColliderForMesh(back);
    addColliderForMesh(left);
    addColliderForMesh(right);
    addColliderForMesh(frontL);
    addColliderForMesh(frontR);
  }

  for (const d of dirs) buildHallAndRoom(d.angle, d.name, d.color);

  // Add colliders for pit/table/platform (so you never spawn on them)
  addColliderForMesh(platform, 0.15);
  addColliderForMesh(table, 0.25);

  // ---------- SPAWN PADS ----------
  const spawnPads = [];
  const padGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 48);

  function makePad(x, z, color, label, yaw) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0b142a,
      roughness: 0.4,
      metalness: 0.2,
      emissive: color,
      emissiveIntensity: 1.1
    });

    const pad = new THREE.Mesh(padGeo, mat);
    pad.position.set(x, 0.035, z);
    pad.name = "spawn_pad";
    pad.userData.teleportPos = new THREE.Vector3(x, 1.65, z);
    pad.userData.yaw = yaw ?? Math.PI;
    pad.userData.label = label || "";
    scene.add(pad);

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: 0.8 })
    );
    beacon.position.set(x, 0.45, z);
    scene.add(beacon);

    spawnPads.push(pad);
    return pad;
  }

  // Lobby pads (still exist)
  const padLobbyN = makePad(0, 10.5, 0x2f6bff, "LOBBY_N", Math.PI);
  makePad(10.5, 0, 0xaa44ff, "LOBBY_E", -Math.PI/2);
  makePad(0, -10.5, 0xffcc44, "LOBBY_S", 0);
  makePad(-10.5, 0, 0x44ffaa, "LOBBY_W", Math.PI/2);

  // Room pads (CENTER pads)
  for (const rc of roomCenters) {
    const col = dirs.find(d => d.name === rc.name)?.color || 0xffffff;
    // yaw face toward room interior (opposite of hallway direction)
    const yaw = rc.angle + Math.PI;
    makePad(rc.x, rc.z, col, rc.name + "_CENTER", yaw);
  }

  // ---------- TELEPORT / SPAWN (rig-based) ----------
  function teleportTo(vec3, yaw = player.yaw) {
    setRigPose(vec3.x, vec3.y, vec3.z, yaw);
  }

  function safetySnapIfBlocked(preferredLabel = "STORE_CENTER") {
    // Try preferred first, then all pads
    const tryPads = [];
    const pref = spawnPads.find(p => p.userData?.label === preferredLabel);
    if (pref) tryPads.push(pref);
    for (const p of spawnPads) if (p !== pref) tryPads.push(p);

    for (const p of tryPads) {
      const v = p.userData.teleportPos;
      const yaw = p.userData.yaw ?? Math.PI;
      // Check feet + head clearance points
      const feetOK = !pointBlocked(v.x, 0.15, v.z);
      const chestOK = !pointBlocked(v.x, 1.0, v.z);
      const headOK = !pointBlocked(v.x, 1.65, v.z);
      if (feetOK && chestOK && headOK) {
        teleportTo(v, yaw);
        D.log("[spawn] safe pad:", p.userData.label);
        return true;
      }
    }

    // If somehow everything blocked, force lobby N
    teleportTo(padLobbyN.userData.teleportPos, padLobbyN.userData.yaw);
    D.warn("[spawn] all pads blocked? forced LOBBY_N");
    return false;
  }

  // ✅ SPAWN IN A ROOM (NOT LOBBY)
  // Default = STORE_CENTER (change label if you want VIP_CENTER etc)
  safetySnapIfBlocked("STORE_CENTER");

  // ---------- Resize ----------
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  // Expose to XR module
  window.__SCARLETT1__ = {
    THREE,
    scene,
    renderer,
    camera,
    rig,
    player,
    spawnPads,
    teleportTo,
    safetySnapIfBlocked
  };

  D.log("render loop start ✅");
  renderer.setAnimationLoop((t) => {
    table.rotation.y = t * 0.0004;
    renderer.render(scene, camera);
  });
}

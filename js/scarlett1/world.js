// /js/scarlett1/world.js — Scarlett 1.3 WORLD (FULL • UPDATED • PERMANENT)
// ✅ Exports: initWorld() (boot-compatible)
// ✅ Fix: MAT_BALC defined (and other safety guards)
// ✅ Pit divot + rails + center table + 8 chairs
// ✅ Solid walls + hallways + rooms (STORE/VIP/SCORP/GAMES)
// ✅ Store balcony + stairs
// ✅ Spawn pads (safe, not on objects) + always face table
// ✅ Colliders + blockedXZ()
// ✅ Frame hook system (modules can attach safely)
// ✅ Exposes window.__SCARLETT1__ API

export async function initWorld({ THREE, DIAG }) {
  const D = DIAG || console;
  D.log("initWorld() start");

  // ---------- App root ----------
  let app = document.getElementById("app");
  if (!app) {
    app = document.createElement("div");
    app.id = "app";
    app.style.cssText = "position:fixed; inset:0; overflow:hidden;";
    document.body.appendChild(app);
  }

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // ---------- Scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  // ---------- Rig + Camera ----------
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 800);
  camera.rotation.order = "YXZ";
  camera.position.set(0, 1.65, 0); // 2D height; XR uses floor
  rig.add(camera);

  // Player state used by spine
  const player = { yaw: Math.PI, pitch: 0 };

  // ---------- Materials (ALL DEFINED) ----------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0f1626, roughness: 1, metalness: 0 });
  const MAT_HALL  = new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 1, metalness: 0 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x18233b, roughness: 0.95, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x2a3d66, roughness: 0.7, metalness: 0.15 });
  const MAT_PIT   = new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 1, metalness: 0 });
  const MAT_RAIL  = new THREE.MeshStandardMaterial({ color: 0x3a5ea6, roughness: 0.35, metalness: 0.25 });
  const MAT_BALC  = new THREE.MeshStandardMaterial({ color: 0x101b33, roughness: 0.85, metalness: 0.15 }); // ✅ FIX
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0b3a2b, roughness: 0.9, metalness: 0.05 });
  const MAT_SEAT  = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.95, metalness: 0.05 });
  const MAT_SEAT2 = new THREE.MeshStandardMaterial({ color: 0x222f4b, roughness: 0.7, metalness: 0.10 });

  // ---------- Helpers ----------
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

  function yawFaceOrigin(x, z) {
    const dx = -x, dz = -z;
    return Math.atan2(dx, -dz);
  }

  function teleportTo(vec3, yaw = player.yaw) {
    setRigPoseFloor(vec3.x, vec3.z, yaw);
  }

  // ---------- Lighting ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.10));

  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(12, 18, 10);
  scene.add(sun);

  const core = new THREE.PointLight(0x3366ff, 1.25, 95);
  core.position.set(0, 9, 0);
  scene.add(core);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.PointLight(0x2f6bff, 0.35, 20);
    p.position.set(Math.cos(a) * 14, 2.6, Math.sin(a) * 14);
    scene.add(p);
  }

  // ---------- Lobby + Pit + Table ----------
  const LOBBY_RADIUS = 18;
  const LOBBY_FLOOR_R = 22;

  const lobbyFloor = addMesh(new THREE.CircleGeometry(LOBBY_FLOOR_R, 96), MAT_FLOOR, 0, 0, 0);
  lobbyFloor.rotation.x = -Math.PI / 2;

  const ring = addMesh(new THREE.RingGeometry(LOBBY_RADIUS - 0.45, LOBBY_RADIUS + 0.45, 128), MAT_TRIM, 0, 0.01, 0);
  ring.rotation.x = -Math.PI / 2;

  // Pit “divot”
  const pitDisc = addMesh(new THREE.CircleGeometry(6.25, 96), MAT_PIT, 0, -0.14, 0);
  pitDisc.rotation.x = -Math.PI / 2;

  const pitRim = addMesh(new THREE.RingGeometry(6.18, 6.65, 128), MAT_TRIM, 0, -0.12, 0);
  pitRim.rotation.x = -Math.PI / 2;

  // Rail ring + posts (collidable)
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

  // Table platform (collidable)
  const platform = addMesh(new THREE.CylinderGeometry(2.25, 2.25, 0.18, 64), MAT_TRIM, 0, 0.15, 0);
  addCollider(platform, 0.12);

  // Poker table base + felt (collidable)
  const tableBase = addMesh(new THREE.CylinderGeometry(1.25, 1.25, 0.22, 64), MAT_TRIM, 0, 0.92, 0);
  addCollider(tableBase, 0.25);

  const felt = addMesh(new THREE.CylinderGeometry(1.15, 1.15, 0.07, 64), MAT_FELT, 0, 1.06, 0);
  addCollider(felt, 0.25);

  // Simple dealer chip (visual)
  const dealer = addMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 32), MAT_TRIM, 0.55, 1.11, 0.05);
  dealer.rotation.x = Math.PI / 2;

  // ---------- 8 Chairs (simple but correct) ----------
  function buildChair(x, z, yaw) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 0.55), MAT_SEAT);
    seat.position.set(0, 0.52, 0);
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.60, 0.10), MAT_SEAT2);
    back.position.set(0, 0.82, -0.23);
    g.add(back);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.50, 10);
    const legPos = [
      [-0.22, 0.25, -0.22],
      [ 0.22, 0.25, -0.22],
      [-0.22, 0.25,  0.22],
      [ 0.22, 0.25,  0.22]
    ];
    for (const [lx, ly, lz] of legPos) {
      const leg = new THREE.Mesh(legGeo, MAT_TRIM);
      leg.position.set(lx, ly, lz);
      g.add(leg);
    }

    scene.add(g);
    // add collider as box around chair group
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.2, 0.75), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set(x, 0.60, z);
    proxy.rotation.y = yaw;
    scene.add(proxy);
    addCollider(proxy, 0.02);
  }

  const chairR = 3.35;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * chairR;
    const z = Math.sin(a) * chairR;
    const yaw = Math.atan2(-x, z); // face table
    buildChair(x, z, yaw);
  }

  // ---------- Lobby wall ring (solid / sealed) ----------
  const wallH = 2.85;
  const segCount = 26;
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

  // ---------- Hallways + Rooms ----------
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

    // Room center
    const roomCenterR = hallStartR + HALL_LEN + ROOM_D/2;
    const rx = cx * roomCenterR;
    const rz = cz * roomCenterR;
    roomCenters.push({ name: d.name, x: rx, z: rz, angle, color: d.color });

    // Room floor
    const roomFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 1,
      metalness: 0,
      emissive: d.color,
      emissiveIntensity: 0.06
    });
    const roomFloor = addMesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), roomFloorMat, rx, 0.01, rz);
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.rotation.z = angle;

    // Room walls w/ doorway opening (front side)
    const wallT = 0.35;
    const halfW = ROOM_W/2;
    const halfD = ROOM_D/2;
    const doorW = 5.0;
    const sideW = (ROOM_W - doorW) / 2;

    function addRoomWall(localX, localZ, w, dZ) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, ROOM_H, dZ), MAT_WALL);
      const v = new THREE.Vector3(localX, ROOM_H/2, localZ).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
      m.position.set(rx + v.x, v.y, rz + v.z);
      m.rotation.y = angle;
      scene.add(m);
      addCollider(m, 0.04);
    }

    // back + sides
    addRoomWall(0, -halfD, ROOM_W, wallT);
    addRoomWall(-halfW, 0, wallT, ROOM_D);
    addRoomWall(halfW, 0, wallT, ROOM_D);

    // front split around doorway (toward +localZ)
    addRoomWall(-(doorW/2 + sideW/2), halfD, sideW, wallT);
    addRoomWall((doorW/2 + sideW/2), halfD, sideW, wallT);

    // Lights
    const roomLight = new THREE.PointLight(d.color, 1.1, 45);
    roomLight.position.set(rx, 3.0, rz);
    scene.add(roomLight);

    for (let i = 0; i < 3; i++) {
      const t = (i / 2) - 0.5;
      const lx = hx + cx * (t * HALL_LEN * 0.8);
      const lz = hz + cz * (t * HALL_LEN * 0.8);
      const pl = new THREE.PointLight(d.color, 0.8, 18);
      pl.position.set(lx, 2.4, lz);
      scene.add(pl);
    }

    D.log("sign:", d.name);

    // STORE: balcony + stairs
    if (d.name === "STORE") {
      const balc = addMesh(
        new THREE.BoxGeometry(ROOM_W*0.72, 0.18, ROOM_D*0.46),
        MAT_BALC,
        rx, 2.2, rz - 2.0, angle
      );
      addCollider(balc, 0.04);

      const rail = addMesh(
        new THREE.BoxGeometry(ROOM_W*0.72, 0.10, 0.10),
        MAT_RAIL,
        rx, 2.75, rz - (2.0 + ROOM_D*0.23), angle
      );
      addCollider(rail, 0.03);

      // stairs
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

      const storeGlow = new THREE.PointLight(0x2f6bff, 1.2, 60);
      storeGlow.position.set(rx, 3.4, rz - 1.0);
      scene.add(storeGlow);

      // simple display pedestals (prepared for Store module later)
      for (let i = 0; i < 6; i++) {
        const px = (i % 3) * 2.4 - 2.4;
        const pz = Math.floor(i / 3) * 2.6 - 1.0;
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 28), MAT_TRIM);
        const v = new THREE.Vector3(px, 0.30, pz).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
        ped.position.set(rx + v.x, v.y, rz + v.z);
        ped.rotation.y = angle;
        ped.userData.storePedestal = true;
        scene.add(ped);
        addCollider(ped, 0.05);
      }
    }
  }

  for (const d of dirs) buildHallAndRoom(d);

  // ---------- Spawn Pads ----------
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
    pad.userData.yaw = yawFaceOrigin(x, z);
    pad.userData.label = label || "";
    scene.add(pad);
    spawnPads.push(pad);

    // beacon
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

  function safeSpawn(label = "STORE_ENT", forwardMeters = 1.25) {
    const pad = spawnPads.find(p => p.userData?.label === label) || spawnPads[0];
    const yaw = pad?.userData?.yaw ?? Math.PI;

    // push off the pad a little so you never stand on edges/objects
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const pos = pad.userData.teleportPos.clone().add(forward.multiplyScalar(1.25));

    let tries = 0;
    while (blockedXZ(pos.x, pos.z) && tries++ < 16) {
      pos.add(forward.clone().multiplyScalar(0.5));
    }

    teleportTo(pos, yawFaceOrigin(pos.x, pos.z));
    D.log("[spawn] safeSpawn ✅", { label, x: pos.x, z: pos.z });
  }

  safeSpawn("STORE_ENT", 1.25);

  // ---------- Module Hooks ----------
  const frameHooks = [];
  function addFrameHook(fn) { frameHooks.push(fn); }

  // Expose API (modules + XR use this)
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

  // ---------- Resize ----------
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  // ---------- Render loop ----------
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

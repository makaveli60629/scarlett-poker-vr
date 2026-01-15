// /js/scarlett1/world.js — Scarlett 1.0 World (FULL)
// ✅ PlayerRig group
// ✅ Floor-correct XR (rig.y=0; camera.y=1.65 for 2D only)
// ✅ Hallways + doorways + solid walls (colliders)
// ✅ Store balcony + stairs
// ✅ Divot pit + rails
// ✅ World owns render loop + hook system (uncrashable)

export async function initWorld({ THREE, DIAG }) {
  const D = DIAG || console;
  D.log("initWorld() start");

  const app = document.getElementById("app");
  if (!app) throw new Error("#app missing");

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  app.innerHTML = "";
  app.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  // Rig + Camera
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.rotation.order = "YXZ";
  rig.add(camera);

  // 2D eye height
  camera.position.set(0, 1.65, 0);

  const player = { yaw: Math.PI, pitch: 0 };

  function setRigPoseFloor(x, z, yaw = player.yaw) {
    rig.position.set(x, 0, z);
    player.yaw = yaw;
    rig.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(8, 14, 6);
  scene.add(dir);

  const blue = new THREE.PointLight(0x3366ff, 1.0, 70);
  blue.position.set(0, 7, 0);
  scene.add(blue);

  // Materials
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0f1626, roughness: 1, metalness: 0 });
  const MAT_HALL  = new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 1, metalness: 0 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x18233b, roughness: 0.95, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x2a3d66, roughness: 0.7, metalness: 0.15 });
  const MAT_PIT   = new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 1, metalness: 0 });
  const MAT_RAIL  = new THREE.MeshStandardMaterial({ color: 0x3a5ea6, roughness: 0.35, metalness: 0.25 });
  const MAT_BALC  = new THREE.MeshStandardMaterial({ color: 0x101a33, roughness: 0.9, metalness: 0.05 });

  function addMesh(geo, mat, x, y, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  }

  // --- Colliders (simple “solid walls”) ---
  // Store axis-aligned Box3 colliders. Movement checks these.
  const colliders = [];
  function addCollider(mesh, pad = 0.05) {
    mesh.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(mesh);
    b.min.x -= pad; b.min.y -= pad; b.min.z -= pad;
    b.max.x += pad; b.max.y += pad; b.max.z += pad;
    colliders.push(b);
  }

  function blockedXZ(x, z) {
    const p1 = new THREE.Vector3(x, 0.2, z);
    const p2 = new THREE.Vector3(x, 1.0, z);
    for (const b of colliders) {
      if (b.containsPoint(p1) || b.containsPoint(p2)) return true;
    }
    return false;
  }

  // --- Lobby ---
  const LOBBY_RADIUS = 18;
  const LOBBY_FLOOR_R = 22;

  const lobbyFloor = addMesh(new THREE.CircleGeometry(LOBBY_FLOOR_R, 96), MAT_FLOOR, 0, 0, 0);
  lobbyFloor.rotation.x = -Math.PI / 2;

  const ring = addMesh(new THREE.RingGeometry(LOBBY_RADIUS - 0.4, LOBBY_RADIUS + 0.4, 128), MAT_TRIM, 0, 0.01, 0);
  ring.rotation.x = -Math.PI / 2;

  // Divot pit
  const pitDisc = addMesh(new THREE.CircleGeometry(6.2, 80), MAT_PIT, 0, -0.12, 0);
  pitDisc.rotation.x = -Math.PI / 2;

  const pitRim = addMesh(new THREE.RingGeometry(6.15, 6.5, 96), MAT_TRIM, 0, -0.10, 0);
  pitRim.rotation.x = -Math.PI / 2;

  // Rails around pit (visual + collider posts)
  const railR = 7.2;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = Math.cos(a) * railR;
    const z = Math.sin(a) * railR;

    const post = addMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 12), MAT_RAIL, x, 0.5, z);
    addCollider(post, 0.02);
  }
  // A low ring rail
  const railRing = addMesh(new THREE.TorusGeometry(railR, 0.05, 10, 96), MAT_RAIL, 0, 1.0, 0);
  railRing.rotation.x = Math.PI / 2;

  // Center platform + table placeholder (colliders)
  const platform = addMesh(new THREE.CylinderGeometry(2.2, 2.2, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b2a22, roughness: 0.85, metalness: 0.05 }),
    0, 0.15, 0
  );
  addCollider(platform, 0.10);

  const table = addMesh(new THREE.CylinderGeometry(1.1, 1.1, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b3a2b, roughness: 0.85, metalness: 0.05 }),
    0, 1.05, 0
  );
  addCollider(table, 0.20);

  // Lobby wall ring segments
  const wallH = 2.8;
  const segCount = 24;
  for (let i = 0; i < segCount; i++) {
    const a0 = (i / segCount) * Math.PI * 2;
    const a1 = ((i + 1) / segCount) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    const mx = Math.cos(mid) * LOBBY_RADIUS;
    const mz = Math.sin(mid) * LOBBY_RADIUS;
    const len = (Math.PI * 2 * LOBBY_RADIUS) / segCount;

    const w = addMesh(new THREE.BoxGeometry(len, wallH, 0.55), MAT_WALL, mx, wallH / 2, mz, -mid);
    addCollider(w, 0.03);
  }

  // --- Hallways + Rooms (with doorway openings) ---
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
    const sideGeo = new THREE.BoxGeometry(HALL_LEN, 2.8, 0.35);
    const px = -cz, pz = cx;

    const leftWall = addMesh(sideGeo, MAT_WALL, hx + px * (HALL_W/2), 1.4, hz + pz * (HALL_W/2), angle);
    const rightWall = addMesh(sideGeo, MAT_WALL, hx - px * (HALL_W/2), 1.4, hz - pz * (HALL_W/2), angle);
    addCollider(leftWall, 0.03);
    addCollider(rightWall, 0.03);

    // Room center
    const roomCenterR = hallStartR + HALL_LEN + ROOM_D / 2;
    const rx = cx * roomCenterR;
    const rz = cz * roomCenterR;
    roomCenters.push({ name: d.name, x: rx, z: rz, angle, color: d.color });

    // Room floor
    const roomFloor = addMesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 1, metalness: 0, emissive: d.color, emissiveIntensity: 0.06 }),
      rx, 0.01, rz
    );
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.rotation.z = angle;

    // Room walls (4 sides, front split for doorway aligned to hallway)
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
      addCollider(m, 0.03);
      return m;
    }

    // back, left, right
    addRoomWall(0, -halfD, ROOM_W, wallT);
    addRoomWall(-halfW, 0, wallT, ROOM_D);
    addRoomWall(halfW, 0, wallT, ROOM_D);
    // front split (door opening)
    addRoomWall(-(doorW/2 + sideW/2), halfD, sideW, wallT);
    addRoomWall((doorW/2 + sideW/2), halfD, sideW, wallT);

    // Accent light
    const pl = new THREE.PointLight(d.color, 1.1, 45);
    pl.position.set(rx, 3.0, rz);
    scene.add(pl);

    // Store balcony + stairs (only in STORE)
    if (d.name === "STORE") {
      // Balcony slab (above half the room)
      const balc = addMesh(
        new THREE.BoxGeometry(ROOM_W * 0.7, 0.18, ROOM_D * 0.45),
        MAT_BALC,
        rx, 2.2, rz - 2.0,
        angle
      );
      addCollider(balc, 0.03);

      // Balcony rail
      const rail = addMesh(new THREE.BoxGeometry(ROOM_W * 0.7, 0.10, 0.10), MAT_RAIL, rx, 2.75, rz - (2.0 + ROOM_D*0.225), angle);
      addCollider(rail, 0.02);

      // Stairs (simple ramp made of steps)
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.18, 0.6),
          MAT_TRIM
        );
        const localZ = 4.8 - i * 0.65;
        const localY = 0.18 + i * 0.26;
        const localX = -4.8;

        const v = new THREE.Vector3(localX, localY, localZ).applyAxisAngle(new THREE.Vector3(0,1,0), angle);
        step.position.set(rx + v.x, v.y, rz + v.z);
        step.rotation.y = angle;
        scene.add(step);
        addCollider(step, 0.02);
      }
    }
  }

  for (const d of dirs) buildHallAndRoom(d);

  // --- Spawn pads ---
  const spawnPads = [];
  const padGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 48);

  function makePad(x, z, color, label, yaw) {
    const pad = new THREE.Mesh(
      padGeo,
      new THREE.MeshStandardMaterial({ color: 0x0b142a, roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: 1.1 })
    );
    pad.position.set(x, 0.035, z);
    pad.name = "spawn_pad";
    pad.userData.teleportPos = new THREE.Vector3(x, 0, z); // floor coords
    pad.userData.yaw = yaw ?? Math.PI;
    pad.userData.label = label || "";
    scene.add(pad);
    spawnPads.push(pad);

    const beacon = addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: 0.8 }),
      x, 0.45, z
    );
    addCollider(beacon, 0.02);

    return pad;
  }

  const entranceR = LOBBY_RADIUS + 4.8;

  const padStoreEnt = makePad(Math.cos(0) * entranceR, Math.sin(0) * entranceR, 0x2f6bff, "STORE_ENT", Math.PI);
  makePad(Math.cos(Math.PI/2) * entranceR, Math.sin(Math.PI/2) * entranceR, 0xaa44ff, "VIP_ENT", -Math.PI/2);
  makePad(Math.cos(Math.PI) * entranceR, Math.sin(Math.PI) * entranceR, 0xffcc44, "SCORP_ENT", 0);
  makePad(Math.cos(-Math.PI/2) * entranceR, Math.sin(-Math.PI/2) * entranceR, 0x44ffaa, "GAMES_ENT", Math.PI/2);

  for (const rc of roomCenters) {
    makePad(rc.x, rc.z, rc.color, rc.name + "_CENTER", rc.angle + Math.PI);
  }

  function teleportTo(vec3, yaw = player.yaw) {
    setRigPoseFloor(vec3.x, vec3.z, yaw);
  }

  // Spawn in front of STORE_ENT (not on top of it)
  function spawnInFrontOf(label = "STORE_ENT", forwardMeters = 1.25) {
    const pad = spawnPads.find(p => p.userData?.label === label) || padStoreEnt;
    const yaw = pad.userData.yaw ?? Math.PI;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const pos = pad.userData.teleportPos.clone().add(fwd.multiplyScalar(forwardMeters));

    // If blocked, move further forward a bit
    let tries = 0;
    while (blockedXZ(pos.x, pos.z) && tries++ < 8) {
      pos.add(fwd.clone().multiplyScalar(0.5));
    }
    teleportTo(pos, yaw);
    D.log("[spawn] in front of", label, "pos=", { x: pos.x, z: pos.z });
  }

  spawnInFrontOf("STORE_ENT", 1.25);

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  // Hook system
  const frameHooks = [];
  function addFrameHook(fn) { frameHooks.push(fn); }

  // Expose
  window.__SCARLETT1__ = {
    THREE, scene, renderer, camera, rig, player,
    spawnPads, teleportTo,
    addFrameHook,
    colliders,
    blockedXZ
  };

  D.log("render loop start ✅ (world owns loop)");

  let lastT = 0;
  renderer.setAnimationLoop((tMs) => {
    const t = tMs * 0.001;
    const dt = Math.min(0.05, Math.max(0.001, t - lastT));
    lastT = t;

    // animate table slightly
    table.rotation.y = t * 0.35;

    // run hooks safely
    for (const fn of frameHooks) {
      try { fn({ t, dt }); }
      catch (e) { D.error("[frameHook] error:", e?.message || e); }
    }

    renderer.render(scene, camera);
  });
    }

// /js/scarlett1/world.js — Scarlett World SOUPED v2.1
// ✅ Big lobby + hallways + rooms + table + chairs + bots + store
// ✅ Adds Quest XR Controllers + Lasers + Teleport
// ✅ Adds XR Hands + Pinch Teleport
// ✅ SAFE: Only activates in XR session; Android 2D controls untouched.

import { VRButton } from "../VRButton.js";

export async function initWorld({ THREE, log }) {
  log = log || console.log;

  // ===== Renderer =====
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.style.margin = "0";
  document.body.style.background = "#000";
  document.body.appendChild(renderer.domElement);

  // ===== Scene =====
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060b);
  scene.fog = new THREE.Fog(0x04060b, 10, 140);

  // ===== Player Rig =====
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const cameraPitch = new THREE.Group();
  cameraPitch.name = "CameraPitch";
  player.add(cameraPitch);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.position.set(0, 1.6, 0);
  cameraPitch.add(camera);

  scene.add(player);

  // ===== Lights =====
  scene.add(new THREE.HemisphereLight(0xaecbff, 0x0c1018, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(14, 20, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7aa7ff, 0.25);
  rim.position.set(-18, 12, -12);
  scene.add(rim);

  // ===== Materials =====
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 0.92, metalness: 0.02 });
  const MAT_HALL  = new THREE.MeshStandardMaterial({ color: 0x09101c, roughness: 0.95, metalness: 0.04 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x070d16, roughness: 0.96, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x12233e, roughness: 0.55, metalness: 0.35 });
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0b6b4b, roughness: 0.95, metalness: 0.0 });
  const MAT_TABLE = new THREE.MeshStandardMaterial({ color: 0x121b2b, roughness: 0.65, metalness: 0.14 });
  const MAT_PAD   = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.35, metalness: 0.2, emissive: 0x112244 });
  const MAT_GLASS = new THREE.MeshStandardMaterial({ color: 0x0a1a2c, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25 });

  // ===== Dimensions =====
  const LOBBY_R = 18;
  const WALL_H  = 4.8;
  const WALL_T  = 0.55;

  const HALL_W  = 6.2;
  const HALL_L  = 16;

  const ROOM_W  = 18;
  const ROOM_L  = 18;

  const DOOR_W  = 5.6;

  // ===== Helpers =====
  const UP = new THREE.Vector3(0, 1, 0);

  function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
  function cyl(rTop, rBot, h, mat, seg=48) { return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat); }
  function torus(r, t, mat) { return new THREE.Mesh(new THREE.TorusGeometry(r, t, 16, 96), mat); }
  function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }

  function signCanvas(text) {
    const c = document.createElement("canvas");
    c.width = 768; c.height = 256;
    const g = c.getContext("2d");
    g.clearRect(0,0,c.width,c.height);
    g.fillStyle = "rgba(0,0,0,0)";
    g.fillRect(0,0,c.width,c.height);
    g.fillStyle = "rgba(120,200,255,0.92)";
    g.font = "900 92px system-ui, Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width/2, c.height/2);
    g.strokeStyle = "rgba(120,200,255,0.20)";
    g.lineWidth = 6;
    g.strokeRect(18, 18, c.width-36, c.height-36);
    return new THREE.CanvasTexture(c);
  }

  function addSign(text, pos, lookAt) {
    log(`sign: ${text}`);
    const tex = signCanvas(text);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const p = plane(6.5, 2.1, m);
    p.position.copy(pos);
    p.lookAt(lookAt);
    scene.add(p);
  }

  // ===== Lobby Floor =====
  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R, 120), MAT_FLOOR);
  lobbyFloor.rotation.x = -Math.PI / 2;
  lobbyFloor.receiveShadow = true;
  scene.add(lobbyFloor);

  const trim = new THREE.Mesh(new THREE.RingGeometry(LOBBY_R-0.9, LOBBY_R-0.4, 128), MAT_TRIM);
  trim.rotation.x = -Math.PI/2;
  trim.position.y = 0.012;
  scene.add(trim);

  // ===== Outer Wall Ring with Door Openings =====
  function addRingWalls() {
    const r = LOBBY_R - WALL_T/2;
    const circum = 2 * Math.PI * r;
    const segCount = 32;
    const segArc = circum / segCount;

    const doors = [
      { a: -Math.PI/2, label: "GAMES" },
      { a: 0,          label: "STORE" },
      { a: Math.PI/2,  label: "SCORP" },
      { a: Math.PI,    label: "VIP" }
    ];

    function isInDoorGap(theta) {
      for (const d of doors) {
        let diff = Math.atan2(Math.sin(theta - d.a), Math.cos(theta - d.a));
        const halfGap = (DOOR_W / r) * 0.55;
        if (Math.abs(diff) < halfGap) return true;
      }
      return false;
    }

    for (let i=0; i<segCount; i++) {
      const theta = (i / segCount) * Math.PI*2;
      if (isInDoorGap(theta)) continue;

      const w = segArc * 0.95;
      const wall = box(w, WALL_H, WALL_T, MAT_WALL);
      wall.position.set(Math.cos(theta)*r, WALL_H/2, Math.sin(theta)*r);
      wall.rotation.y = -theta;
      scene.add(wall);

      const strip = box(w, 0.14, WALL_T+0.03, MAT_TRIM);
      strip.position.set(wall.position.x, WALL_H-0.35, wall.position.z);
      strip.rotation.copy(wall.rotation);
      scene.add(strip);
    }

    for (const d of doors) {
      const frameR = LOBBY_R - WALL_T/2;
      const x = Math.cos(d.a) * frameR;
      const z = Math.sin(d.a) * frameR;

      const frame = box(DOOR_W+0.6, 3.6, 0.24, MAT_TRIM);
      frame.position.set(x, 1.8, z);
      frame.rotation.y = -d.a;
      scene.add(frame);

      const sPos = new THREE.Vector3(Math.cos(d.a)*(LOBBY_R-2.2), 3.2, Math.sin(d.a)*(LOBBY_R-2.2));
      addSign(d.label, sPos, new THREE.Vector3(0,3.2,0));
    }
  }
  addRingWalls();

  // ===== Hallways + Rooms =====
  const rooms = [
    { id:"GAMES", doorA:-Math.PI/2, hallCenter:new THREE.Vector3(0, 0, -(LOBBY_R + HALL_L/2 - 1.2)), roomCenter:new THREE.Vector3(0,0, -(LOBBY_R + HALL_L + ROOM_L/2 - 2.0)) },
    { id:"STORE", doorA:0,         hallCenter:new THREE.Vector3( (LOBBY_R + HALL_L/2 - 1.2), 0, 0), roomCenter:new THREE.Vector3( (LOBBY_R + HALL_L + ROOM_L/2 - 2.0),0, 0) },
    { id:"SCORP", doorA:Math.PI/2, hallCenter:new THREE.Vector3(0, 0, (LOBBY_R + HALL_L/2 - 1.2)), roomCenter:new THREE.Vector3(0,0, (LOBBY_R + HALL_L + ROOM_L/2 - 2.0)) },
    { id:"VIP",   doorA:Math.PI,   hallCenter:new THREE.Vector3( -(LOBBY_R + HALL_L/2 - 1.2), 0, 0), roomCenter:new THREE.Vector3( -(LOBBY_R + HALL_L + ROOM_L/2 - 2.0),0, 0) }
  ];

  function buildHallAndRoom(rm) {
    const hallFloor = box(HALL_W, 0.14, HALL_L, MAT_HALL);
    hallFloor.position.set(rm.hallCenter.x, 0.07, rm.hallCenter.z);
    hallFloor.rotation.y = -rm.doorA;
    scene.add(hallFloor);

    const sideWall = box(HALL_L, WALL_H, WALL_T, MAT_WALL);

    const left = sideWall.clone();
    left.rotation.y = -rm.doorA + Math.PI/2;
    left.position.set(rm.hallCenter.x, WALL_H/2, rm.hallCenter.z);
    left.position.add(new THREE.Vector3(Math.cos(rm.doorA+Math.PI/2), 0, Math.sin(rm.doorA+Math.PI/2)).multiplyScalar(HALL_W/2));
    scene.add(left);

    const right = sideWall.clone();
    right.rotation.y = -rm.doorA + Math.PI/2;
    right.position.set(rm.hallCenter.x, WALL_H/2, rm.hallCenter.z);
    right.position.add(new THREE.Vector3(Math.cos(rm.doorA-Math.PI/2), 0, Math.sin(rm.doorA-Math.PI/2)).multiplyScalar(HALL_W/2));
    scene.add(right);

    const ceil = box(HALL_W, 0.16, HALL_L, MAT_TRIM);
    ceil.position.set(rm.hallCenter.x, WALL_H-0.25, rm.hallCenter.z);
    ceil.rotation.y = -rm.doorA;
    scene.add(ceil);

    const roomFloor = box(ROOM_W, 0.18, ROOM_L, MAT_FLOOR);
    roomFloor.position.set(rm.roomCenter.x, 0.09, rm.roomCenter.z);
    roomFloor.rotation.y = -rm.doorA;
    scene.add(roomFloor);

    const rotY = -rm.doorA;
    function placeLocal(mesh, lx, ly, lz, ry=0) {
      const p = new THREE.Vector3(lx, ly, lz);
      p.applyAxisAngle(UP, rotY);
      mesh.position.set(rm.roomCenter.x + p.x, p.y, rm.roomCenter.z + p.z);
      mesh.rotation.y = rotY + ry;
      scene.add(mesh);
    }

    const hx = ROOM_W/2, hz = ROOM_L/2;

    const backWall = box(ROOM_W, WALL_H, WALL_T, MAT_WALL);
    placeLocal(backWall, 0, WALL_H/2, -hz, 0);

    const segW = (ROOM_W - DOOR_W) / 2;
    const fwL = box(segW, WALL_H, WALL_T, MAT_WALL);
    const fwR = box(segW, WALL_H, WALL_T, MAT_WALL);
    placeLocal(fwL, -(DOOR_W/2 + segW/2), WALL_H/2, hz, 0);
    placeLocal(fwR,  (DOOR_W/2 + segW/2), WALL_H/2, hz, 0);

    const side1 = box(ROOM_L, WALL_H, WALL_T, MAT_WALL);
    const side2 = box(ROOM_L, WALL_H, WALL_T, MAT_WALL);
    placeLocal(side1, -hx, WALL_H/2, 0, Math.PI/2);
    placeLocal(side2,  hx, WALL_H/2, 0, Math.PI/2);

    const signPos = new THREE.Vector3(0, 3.3, hz-0.6).applyAxisAngle(UP, rotY).add(rm.roomCenter.clone());
    addSign(rm.id, signPos, rm.roomCenter.clone().add(new THREE.Vector3(0,2.4,0)));

    const glass = box(ROOM_W*0.65, 2.8, 0.12, MAT_GLASS);
    placeLocal(glass, 0, 1.6, -hz+0.9, 0);
  }

  for (const rm of rooms) buildHallAndRoom(rm);

  // ===== Center Table + Divot =====
  const divot = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 9.2, 128),
    new THREE.MeshStandardMaterial({ color: 0x06080e, roughness: 1.0, metalness: 0.0 })
  );
  divot.rotation.x = -Math.PI / 2;
  divot.position.y = 0.01;
  scene.add(divot);

  const tableBase = cyl(4.9, 4.9, 0.8, MAT_TABLE, 64);
  tableBase.position.y = 0.4;
  scene.add(tableBase);

  const felt = cyl(4.45, 4.45, 0.14, MAT_FELT, 64);
  felt.position.y = 0.82;
  scene.add(felt);

  const rail = torus(4.55, 0.24, MAT_TRIM);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 1.0;
  scene.add(rail);

  const shadowDisk = new THREE.Mesh(
    new THREE.CircleGeometry(8.8, 96),
    new THREE.MeshStandardMaterial({ color: 0x03050a, roughness: 1.0, metalness: 0.0 })
  );
  shadowDisk.rotation.x = -Math.PI/2;
  shadowDisk.position.y = 0.005;
  scene.add(shadowDisk);

  // ===== Chairs =====
  function addChair(angle, radius) {
    const group = new THREE.Group();
    const seat = box(0.85, 0.16, 0.85, MAT_TABLE);
    seat.position.y = 0.52;
    group.add(seat);

    const back = box(0.85, 0.95, 0.12, MAT_WALL);
    back.position.set(0, 1.05, -0.36);
    group.add(back);

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.52, 10);
    for (const sx of [-0.32, 0.32]) for (const sz of [-0.32, 0.32]) {
      const leg = new THREE.Mesh(legGeo, MAT_TRIM);
      leg.position.set(sx, 0.26, sz);
      group.add(leg);
    }

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    group.position.set(x, 0, z);
    group.rotation.y = -angle + Math.PI;
    scene.add(group);
  }
  for (let i=0; i<8; i++) addChair((i/8)*Math.PI*2, 7.6);

  // ===== Spawn Pads =====
  const spawns = [];
  function addSpawn(name, x, z, yaw) {
    const pad = cyl(0.9, 0.9, 0.09, MAT_PAD, 28);
    pad.position.set(x, 0.05, z);
    pad.name = name;
    scene.add(pad);
    spawns.push({ name, x, z, yaw });
  }

  addSpawn("SPAWN_N", 0, -(LOBBY_R - 3.5), Math.PI);
  addSpawn("SPAWN_E", (LOBBY_R - 3.5), 0, -Math.PI/2);
  addSpawn("SPAWN_S", 0, (LOBBY_R - 3.5), 0);
  addSpawn("SPAWN_W", -(LOBBY_R - 3.5), 0, Math.PI/2);

  const spawn = spawns.find(s => s.name === "SPAWN_N") || spawns[0];
  player.position.set(spawn.x, 0, spawn.z);
  player.rotation.y = spawn.yaw;
  log(`spawn ✅ ${spawn.name}`);

  // ===== STORE Room =====
  const store = rooms.find(r => r.id === "STORE");
  if (store) {
    const center = store.roomCenter.clone();
    const kiosk = box(3.6, 1.1, 2.2, MAT_TRIM);
    kiosk.position.set(center.x, 0.55, center.z);
    kiosk.rotation.y = store.doorA;
    scene.add(kiosk);

    const screen = box(3.2, 1.6, 0.12, MAT_GLASS);
    screen.position.set(center.x, 1.55, center.z - 1.05);
    screen.rotation.y = store.doorA;
    scene.add(screen);

    const manGeo = new THREE.CapsuleGeometry(0.35, 1.1, 8, 16);
    const manMat = new THREE.MeshStandardMaterial({ color: 0x1a2f55, roughness: 0.6, metalness: 0.25, emissive: 0x050a12 });
    for (let i=0; i<5; i++) {
      const m = new THREE.Mesh(manGeo, manMat);
      m.position.set(center.x + (-5 + i*2.5), 1.05, center.z + 3.8);
      scene.add(m);

      const base = cyl(0.7, 0.7, 0.08, MAT_TRIM, 20);
      base.position.set(m.position.x, 0.04, m.position.z);
      scene.add(base);
    }
  }

  // ===== Bots =====
  const bots = [];
  const BOT_COUNT = 10;
  const botGeo = new THREE.CapsuleGeometry(0.28, 0.95, 6, 14);
  const botMat = new THREE.MeshStandardMaterial({ color: 0x1b3cff, roughness: 0.35, metalness: 0.25, emissive: 0x0b1430 });
  const rand = (min, max) => min + Math.random() * (max - min);

  function spawnBot() {
    const b = new THREE.Mesh(botGeo, botMat);
    b.position.set(rand(-8, 8), 1.05, rand(-8, 8));
    b.userData = { vx: 0, vz: 0, tx: rand(-10, 10), tz: rand(-10, 10), t: rand(0, 10) };
    scene.add(b);
    bots.push(b);
  }
  for (let i=0; i<BOT_COUNT; i++) spawnBot();

  function steerBots(dt) {
    for (const b of bots) {
      const u = b.userData;
      u.t -= dt;
      if (u.t <= 0) {
        u.t = rand(2.0, 6.0);
        const a = rand(0, Math.PI*2);
        const r = rand(2.5, LOBBY_R-5.0);
        u.tx = Math.cos(a) * r;
        u.tz = Math.sin(a) * r;
      }
      const dx = u.tx - b.position.x;
      const dz = u.tz - b.position.z;
      const d = Math.hypot(dx, dz) + 1e-6;

      const td = Math.hypot(b.position.x, b.position.z);
      if (td < 8.2) { u.tx = b.position.x * 1.2; u.tz = b.position.z * 1.2; }

      const spd = 0.9;
      u.vx = (dx / d) * spd;
      u.vz = (dz / d) * spd;

      b.position.x += u.vx * dt;
      b.position.z += u.vz * dt;

      b.rotation.y = Math.atan2(u.vx, u.vz);
      b.position.y = 1.05 + Math.sin((performance.now()*0.002) + u.tz) * 0.03;
    }
  }

  // ===== VR Button =====
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ready ✅");
  } catch (e) {
    log("VRButton failed:", e?.message || e);
  }

  // ===== XR CONTROLLERS + HANDS (Quest only; safe for Android) =====
  const xr = {
    installed: false,
    tmpMat: new THREE.Matrix4(),
    rayOrigin: new THREE.Vector3(),
    rayDir: new THREE.Vector3(),
    rayEnd: new THREE.Vector3(),
    plane: new THREE.Plane(new THREE.Vector3(0,1,0), 0), // y=0
    hit: new THREE.Vector3(),
    controller: [null, null],
    grip: [null, null],
    hand: [null, null],
    laser: [null, null],
    selecting: [false, false],
    pinchSelecting: [false, false],
  };

  function teleportTo(point) {
    // Keep head height by moving rig so camera ends at target
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const rigPos = new THREE.Vector3();
    player.getWorldPosition(rigPos);

    // offset in rig-space (xz only)
    const dx = camPos.x - rigPos.x;
    const dz = camPos.z - rigPos.z;

    player.position.set(point.x - dx, 0, point.z - dz);
  }

  function computeRayFromObject(obj) {
    xr.tmpMat.identity().extractRotation(obj.matrixWorld);
    xr.rayOrigin.setFromMatrixPosition(obj.matrixWorld);
    xr.rayDir.set(0, 0, -1).applyMatrix4(xr.tmpMat).normalize();
  }

  function raycastToFloor() {
    // intersect ray with y=0 plane
    const denom = xr.plane.normal.dot(xr.rayDir);
    if (Math.abs(denom) < 1e-6) return null;
    const t = -(xr.plane.normal.dot(xr.rayOrigin) + xr.plane.constant) / denom;
    if (t < 0.0) return null;
    xr.hit.copy(xr.rayOrigin).addScaledVector(xr.rayDir, t);
    return xr.hit;
  }

  function setLaser(i, hitPointOrNull) {
    const laser = xr.laser[i];
    if (!laser) return;
    const dist = hitPointOrNull
      ? hitPointOrNull.distanceTo(xr.rayOrigin)
      : 6.0;
    laser.scale.z = dist;
  }

  async function installXR() {
    if (xr.installed) return;
    xr.installed = true;

    log("[XR] installing controllers + hands…");

    // Controllers
    for (let i=0; i<2; i++) {
      const c = renderer.xr.getController(i);
      c.name = `xr_controller_${i}`;
      player.add(c);
      xr.controller[i] = c;

      // Laser (a thin line pointing forward)
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geom, mat);
      line.name = `laser_${i}`;
      line.scale.z = 6.0;
      c.add(line);
      xr.laser[i] = line;

      c.addEventListener("selectstart", () => { xr.selecting[i] = true; });
      c.addEventListener("selectend", () => {
        xr.selecting[i] = false;
        // teleport on release if we had a valid floor point
        computeRayFromObject(c);
        const hit = raycastToFloor();
        if (hit) teleportTo(hit);
      });
    }

    // Optional controller models (nice to have; safe if import fails)
    try {
      const { XRControllerModelFactory } = await import(
        "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js"
      );
      const factory = new XRControllerModelFactory();

      for (let i=0; i<2; i++) {
        const grip = renderer.xr.getControllerGrip(i);
        grip.name = `xr_grip_${i}`;
        grip.add(factory.createControllerModel(grip));
        player.add(grip);
        xr.grip[i] = grip;
      }
      log("[XR] controller models ✅");
    } catch (e) {
      log("[XR] controller models skipped:", e?.message || e);
    }

    // Hands (for bright-room / no-controller use)
    try {
      const { XRHandModelFactory } = await import(
        "https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js"
      );
      const handFactory = new XRHandModelFactory();

      for (let i=0; i<2; i++) {
        const h = renderer.xr.getHand(i);
        h.name = `xr_hand_${i}`;
        h.add(handFactory.createHandModel(h, "mesh"));
        player.add(h);
        xr.hand[i] = h;

        h.addEventListener("pinchstart", () => { xr.pinchSelecting[i] = true; });
        h.addEventListener("pinchend", () => {
          xr.pinchSelecting[i] = false;
          computeRayFromObject(h);
          const hit = raycastToFloor();
          if (hit) teleportTo(hit);
        });
      }
      log("[XR] hands ✅ (pinch teleport enabled)");
    } catch (e) {
      log("[XR] hands skipped:", e?.message || e);
    }
  }

  renderer.xr.addEventListener("sessionstart", () => {
    // Only run when XR session actually starts (Quest)
    installXR();
  });

  // ===== Resize =====
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ===== Updates =====
  const updates = [];
  const addUpdate = (fn) => updates.push(fn);

  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());

    // bots
    steerBots(dt);

    // XR laser aiming (only when installed and in XR)
    if (xr.installed && renderer.xr.isPresenting) {
      for (let i=0; i<2; i++) {
        const c = xr.controller[i];
        if (!c) continue;
        computeRayFromObject(c);
        const hit = raycastToFloor();
        setLaser(i, hit);
      }
    }

    for (const fn of updates) {
      try { fn(dt); } catch (e) { log("[world] update err", e?.message || e); }
    }

    renderer.render(scene, camera);
  });

  log("render loop start ✅");
  log("initWorld() completed ✅");

  return { renderer, scene, camera, player, cameraPitch, addUpdate, __hasLoop: true };
                }

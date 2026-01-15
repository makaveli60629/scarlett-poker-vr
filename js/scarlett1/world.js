// /js/scarlett1/world.js — Scarlett 1.0 WORLD (FULL • PERMANENT) v3.0
// ✅ XR: Hands + pinch teleport + trigger teleport + lasers
// ✅ XR: Left stick move (forward/back + strafe), Right stick 45° snap turn
// ✅ Android: virtual sticks (kept separate; auto-hide only during XR presenting)
// ✅ Teleport visuals: floor reticle + glow arc lines
// ✅ World: lobby + halls + 4 rooms + sealed ceilings + bright lights
// ✅ Center: pit divot + rails + stairs + table + chairs
// ✅ Store: balcony + short stairs + telepad + mannequins
// ✅ Bots: limbs + walking
// ✅ Module system: loads /modules.json safely + registers per-frame updates
//
// Requires these existing files:
//   /js/VRButton.js
//   /js/scarlett1/spine_android.js (Android sticks)
//   /js/scarlett1/spine_modules.js (SAFE module loader)  [optional but recommended]
//   /js/scarlett1/addons/poker_module.js (from below)

// IMPORTANT: boot expects worldMod.initWorld() to exist.
import { VRButton } from "../VRButton.js";
import { initAndroidSticks } from "./spine_android.js";

// OPTIONAL: safe module loader; if missing it won’t break.
let initModulesSafe = null;
try {
  // dynamic import later (after base path known) to avoid hard fail
} catch {}

export async function initWorld({ THREE, log }) {
  log = log || ((...a) => console.log("[world]", ...a));

  // --------------------------
  // BASE PATH (GitHub Pages safe)
  // --------------------------
  const href = location.href;
  const isGH = href.includes("github.io");
  const base = (location.pathname.includes("/scarlett-poker-vr/") ? "/scarlett-poker-vr/" : "/");
  const here = base + "js/scarlett1/";
  const v = Date.now();

  // --------------------------
  // UPDATE BUS (for modules)
  // --------------------------
  const updates = [];
  const registerUpdate = (fn) => {
    if (typeof fn === "function") updates.push(fn);
    return fn;
  };

  // --------------------------
  // RENDERER
  // --------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;

  document.body.style.margin = "0";
  document.body.style.background = "#000";
  document.body.appendChild(renderer.domElement);

  // --------------------------
  // SCENE
  // --------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x05070d, 18, 260);

  // --------------------------
  // PLAYER RIG
  // --------------------------
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const cameraPitch = new THREE.Group();
  cameraPitch.name = "CameraPitch";
  player.add(cameraPitch);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 900);
  camera.position.set(0, 1.6, 0);
  cameraPitch.add(camera);

  scene.add(player);

  // --------------------------
  // LIGHTING (bright)
  // --------------------------
  scene.add(new THREE.AmbientLight(0xbfd7ff, 0.55));
  scene.add(new THREE.HemisphereLight(0xb9dcff, 0x10131a, 0.85));

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(30, 55, 25);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9bbcff, 0.45);
  fill.position.set(-35, 35, -25);
  scene.add(fill);

  const p1 = new THREE.PointLight(0x89c7ff, 0.9, 220, 2);
  p1.position.set(0, 18, 0);
  scene.add(p1);

  // --------------------------
  // MATERIALS
  // --------------------------
  const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: 0x0a1323, roughness: 0.92, metalness: 0.02 });
  const MAT_HALL  = new THREE.MeshStandardMaterial({ color: 0x08111f, roughness: 0.95, metalness: 0.04 });
  const MAT_WALL  = new THREE.MeshStandardMaterial({ color: 0x070d17, roughness: 0.96, metalness: 0.05 });
  const MAT_TRIM  = new THREE.MeshStandardMaterial({ color: 0x132744, roughness: 0.55, metalness: 0.35 });
  const MAT_TABLE = new THREE.MeshStandardMaterial({ color: 0x121b2b, roughness: 0.65, metalness: 0.14 });
  const MAT_FELT  = new THREE.MeshStandardMaterial({ color: 0x0b6b4b, roughness: 0.95, metalness: 0.0 });
  const MAT_PAD   = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.35, metalness: 0.2, emissive: 0x163060 });
  const MAT_GLASS = new THREE.MeshStandardMaterial({ color: 0x0a1a2c, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25 });

  const MAT_GLOW_LINE = new THREE.LineBasicMaterial({ color: 0x7cc8ff, transparent: true, opacity: 0.92 });
  const MAT_RETICLE = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.25, metalness: 0.2, emissive: 0x2040aa, emissiveIntensity: 0.8 });

  // --------------------------
  // CONFIG (you asked: world was too big -> MAKE IT EASY TO SCALE DOWN)
  // Change SCALE to 1.35 or 1.5 if you want less space.
  // --------------------------
  const SCALE = 1.55;              // ✅ reduced from 2.0 (less huge)
  const LOBBY_R = 18 * SCALE;
  const WALL_H  = 4.8 * SCALE;
  const WALL_T  = 0.55;

  const HALL_W  = 6.2 * SCALE;
  const HALL_L  = 16  * SCALE;

  const ROOM_W  = 18  * SCALE;
  const ROOM_L  = 18  * SCALE;

  const DOOR_W  = 5.6 * SCALE;

  const UP = new THREE.Vector3(0, 1, 0);

  // --------------------------
  // GEOMETRY HELPERS
  // --------------------------
  const box = (w,h,d,mat) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  const cyl = (rt,rb,h,mat,seg=48) => new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
  const torus = (r,t,mat) => new THREE.Mesh(new THREE.TorusGeometry(r,t,16,96), mat);
  const plane = (w,h,mat) => new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);

  function signCanvas(text) {
    const c = document.createElement("canvas");
    c.width = 768; c.height = 256;
    const g = c.getContext("2d");
    g.clearRect(0,0,c.width,c.height);
    g.fillStyle = "rgba(120,200,255,0.94)";
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
    const p = plane(6.5*SCALE*0.55, 2.1*SCALE*0.55, m);
    p.position.copy(pos);
    p.lookAt(lookAt);
    scene.add(p);
  }

  // --------------------------
  // LOBBY FLOOR + CEILING
  // --------------------------
  const lobbyFloor = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R, 160), MAT_FLOOR);
  lobbyFloor.rotation.x = -Math.PI/2;
  scene.add(lobbyFloor);

  const trimRing = new THREE.Mesh(new THREE.RingGeometry(LOBBY_R-0.9, LOBBY_R-0.3, 160), MAT_TRIM);
  trimRing.rotation.x = -Math.PI/2;
  trimRing.position.y = 0.012;
  scene.add(trimRing);

  const lobbyCeil = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R + 1.0, 160), MAT_WALL);
  lobbyCeil.rotation.x = Math.PI/2;
  lobbyCeil.position.y = WALL_H + 0.02;
  scene.add(lobbyCeil);

  // --------------------------
  // RING WALLS + DOORS
  // --------------------------
  const doors = [
    { a: -Math.PI/2, label: "GAMES" },
    { a: 0,          label: "STORE" },
    { a: Math.PI/2,  label: "SCORP" },
    { a: Math.PI,    label: "VIP" }
  ];

  (function addRingWalls() {
    const r = LOBBY_R - WALL_T/2;
    const circum = 2 * Math.PI * r;
    const segCount = 44;
    const segArc = circum / segCount;

    function isInDoorGap(theta) {
      for (const d of doors) {
        let diff = Math.atan2(Math.sin(theta - d.a), Math.cos(theta - d.a));
        const halfGap = (DOOR_W / r) * 0.55;
        if (Math.abs(diff) < halfGap) return true;
      }
      return false;
    }

    for (let i=0; i<segCount; i++) {
      const theta = (i/segCount)*Math.PI*2;
      if (isInDoorGap(theta)) continue;

      const w = segArc * 0.95;
      const wall = box(w, WALL_H, WALL_T, MAT_WALL);
      wall.position.set(Math.cos(theta)*r, WALL_H/2, Math.sin(theta)*r);
      wall.rotation.y = -theta;
      scene.add(wall);

      const strip = box(w, 0.18, WALL_T+0.03, MAT_TRIM);
      strip.position.set(wall.position.x, WALL_H-0.55, wall.position.z);
      strip.rotation.copy(wall.rotation);
      scene.add(strip);
    }

    for (const d of doors) {
      const frameR = LOBBY_R - WALL_T/2;
      const x = Math.cos(d.a)*frameR;
      const z = Math.sin(d.a)*frameR;

      const frame = box(DOOR_W+0.8, 3.6*SCALE*0.75, 0.28, MAT_TRIM);
      frame.position.set(x, (3.6*SCALE*0.75)/2, z);
      frame.rotation.y = -d.a;
      scene.add(frame);

      const sPos = new THREE.Vector3(Math.cos(d.a)*(LOBBY_R-5.5), WALL_H-1.7, Math.sin(d.a)*(LOBBY_R-5.5));
      addSign(d.label, sPos, new THREE.Vector3(0, WALL_H-2.0, 0));
    }
  })();

  // --------------------------
  // HALLS + ROOMS
  // --------------------------
  const rooms = [
    { id:"GAMES", doorA:-Math.PI/2, hallCenter:new THREE.Vector3(0,0, -(LOBBY_R + HALL_L/2 - 1.2*SCALE)), roomCenter:new THREE.Vector3(0,0, -(LOBBY_R + HALL_L + ROOM_L/2 - 2.0*SCALE)) },
    { id:"STORE", doorA:0,         hallCenter:new THREE.Vector3((LOBBY_R + HALL_L/2 - 1.2*SCALE),0,0), roomCenter:new THREE.Vector3((LOBBY_R + HALL_L + ROOM_L/2 - 2.0*SCALE),0,0) },
    { id:"SCORP", doorA:Math.PI/2, hallCenter:new THREE.Vector3(0,0, (LOBBY_R + HALL_L/2 - 1.2*SCALE)), roomCenter:new THREE.Vector3(0,0, (LOBBY_R + HALL_L + ROOM_L/2 - 2.0*SCALE)) },
    { id:"VIP",   doorA:Math.PI,   hallCenter:new THREE.Vector3(-(LOBBY_R + HALL_L/2 - 1.2*SCALE),0,0), roomCenter:new THREE.Vector3(-(LOBBY_R + HALL_L + ROOM_L/2 - 2.0*SCALE),0,0) }
  ];

  function buildHallAndRoom(rm) {
    const hallFloor = box(HALL_W, 0.14, HALL_L, MAT_HALL);
    hallFloor.position.set(rm.hallCenter.x, 0.07, rm.hallCenter.z);
    hallFloor.rotation.y = -rm.doorA;
    scene.add(hallFloor);

    const hallCeil = box(HALL_W, 0.18, HALL_L, MAT_WALL);
    hallCeil.position.set(rm.hallCenter.x, WALL_H + 0.02, rm.hallCenter.z);
    hallCeil.rotation.y = -rm.doorA;
    scene.add(hallCeil);

    const sideWall = box(HALL_L, WALL_H, WALL_T, MAT_WALL);

    const left = sideWall.clone();
    left.rotation.y = -rm.doorA + Math.PI/2;
    left.position.set(rm.hallCenter.x, WALL_H/2, rm.hallCenter.z);
    left.position.add(new THREE.Vector3(Math.cos(rm.doorA+Math.PI/2),0,Math.sin(rm.doorA+Math.PI/2)).multiplyScalar(HALL_W/2));
    scene.add(left);

    const right = sideWall.clone();
    right.rotation.y = -rm.doorA + Math.PI/2;
    right.position.set(rm.hallCenter.x, WALL_H/2, rm.hallCenter.z);
    right.position.add(new THREE.Vector3(Math.cos(rm.doorA-Math.PI/2),0,Math.sin(rm.doorA-Math.PI/2)).multiplyScalar(HALL_W/2));
    scene.add(right);

    const roomFloor = box(ROOM_W, 0.18, ROOM_L, MAT_FLOOR);
    roomFloor.position.set(rm.roomCenter.x, 0.09, rm.roomCenter.z);
    roomFloor.rotation.y = -rm.doorA;
    scene.add(roomFloor);

    const roomCeil = box(ROOM_W, 0.18, ROOM_L, MAT_WALL);
    roomCeil.position.set(rm.roomCenter.x, WALL_H + 0.02, rm.roomCenter.z);
    roomCeil.rotation.y = -rm.doorA;
    scene.add(roomCeil);

    const rotY = -rm.doorA;
    const hx = ROOM_W/2, hz = ROOM_L/2;

    function placeLocal(mesh, lx, ly, lz, ry=0) {
      const p = new THREE.Vector3(lx, ly, lz);
      p.applyAxisAngle(UP, rotY);
      mesh.position.set(rm.roomCenter.x + p.x, p.y, rm.roomCenter.z + p.z);
      mesh.rotation.y = rotY + ry;
      scene.add(mesh);
    }

    placeLocal(box(ROOM_W, WALL_H, WALL_T, MAT_WALL), 0, WALL_H/2, -hz, 0);

    const segW = (ROOM_W - DOOR_W) / 2;
    placeLocal(box(segW, WALL_H, WALL_T, MAT_WALL), -(DOOR_W/2 + segW/2), WALL_H/2, hz, 0);
    placeLocal(box(segW, WALL_H, WALL_T, MAT_WALL),  (DOOR_W/2 + segW/2), WALL_H/2, hz, 0);

    placeLocal(box(ROOM_L, WALL_H, WALL_T, MAT_WALL), -hx, WALL_H/2, 0, Math.PI/2);
    placeLocal(box(ROOM_L, WALL_H, WALL_T, MAT_WALL),  hx, WALL_H/2, 0, Math.PI/2);

    const signPos = new THREE.Vector3(0, WALL_H-1.2, hz-1.3).applyAxisAngle(UP, rotY).add(rm.roomCenter.clone());
    addSign(rm.id, signPos, rm.roomCenter.clone().add(new THREE.Vector3(0, WALL_H-2.0, 0)));

    const glass = box(ROOM_W*0.55, 3.2, 0.12, MAT_GLASS);
    placeLocal(glass, 0, 1.8, -hz+1.1, 0);
  }

  rooms.forEach(buildHallAndRoom);

  // --------------------------
  // PIT DIVOT + TABLE + CHAIRS
  // --------------------------
  const pitOuterR = 9.2;
  const pitInnerR = 5.2;

  const pitRing = new THREE.Mesh(
    new THREE.RingGeometry(pitInnerR, pitOuterR, 160),
    new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 1.0, metalness: 0.0 })
  );
  pitRing.rotation.x = -Math.PI/2;
  pitRing.position.y = 0.01;
  scene.add(pitRing);

  const pitFloor = new THREE.Mesh(
    new THREE.CircleGeometry(pitInnerR - 0.05, 120),
    new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 1.0, metalness: 0.0 })
  );
  pitFloor.rotation.x = -Math.PI/2;
  pitFloor.position.y = -0.55;
  scene.add(pitFloor);

  // pit stairs down (short)
  (function addPitStairs() {
    const steps = 7;
    const startZ = pitOuterR - 0.7;
    const endZ = pitInnerR + 0.9;
    const dz = (startZ - endZ) / steps;
    const dy = 0.55 / steps;
    for (let i=0; i<steps; i++) {
      const s = box(3.2, 0.12, dz*0.95, MAT_TRIM);
      s.position.set(0, 0.06 - i*dy, -(endZ + i*dz));
      scene.add(s);
    }
  })();

  // table
  const tableBase = cyl(4.9, 4.9, 0.8, MAT_TABLE, 64);
  tableBase.position.y = 0.4;
  scene.add(tableBase);

  const felt = cyl(4.45, 4.45, 0.14, MAT_FELT, 64);
  felt.position.y = 0.82;
  scene.add(felt);

  const rail = torus(4.55, 0.24, MAT_TRIM);
  rail.rotation.x = Math.PI/2;
  rail.position.y = 1.0;
  scene.add(rail);

  // guardrails around pit edge
  (function addGuardRails() {
    const railR = pitOuterR + 0.65;
    const posts = 32;
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.05, 12);
    const railGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 10);

    for (let i=0; i<posts; i++) {
      const a = (i/posts)*Math.PI*2;
      const x = Math.cos(a)*railR;
      const z = Math.sin(a)*railR;

      const post = new THREE.Mesh(postGeo, MAT_TRIM);
      post.position.set(x, 0.55, z);
      scene.add(post);

      const a2 = ((i+1)/posts)*Math.PI*2;
      const x2 = Math.cos(a2)*railR;
      const z2 = Math.sin(a2)*railR;

      const mid = new THREE.Vector3((x+x2)/2, 0.92, (z+z2)/2);
      const seg = new THREE.Mesh(railGeo, MAT_TRIM);
      seg.position.copy(mid);

      const dx = x2-x, dz = z2-z;
      const len = Math.hypot(dx,dz);
      seg.scale.set(1,1,len);
      seg.rotation.y = Math.atan2(dx, dz);
      seg.rotation.x = Math.PI/2;
      scene.add(seg);
    }

    const glowRing = torus(railR, 0.03, new THREE.MeshStandardMaterial({
      color: 0x2b6cff, emissive: 0x2b6cff, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.2
    }));
    glowRing.rotation.x = Math.PI/2;
    glowRing.position.y = 0.98;
    scene.add(glowRing);
  })();

  // chairs
  (function addChairs() {
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

      const x = Math.cos(angle)*radius;
      const z = Math.sin(angle)*radius;
      group.position.set(x, 0, z);
      group.rotation.y = -angle + Math.PI;
      scene.add(group);
    }
    for (let i=0; i<8; i++) addChair((i/8)*Math.PI*2, 7.6);
  })();

  // --------------------------
  // STORE BALCONY + STAIRS + TELEPAD + MANNEQUINS
  // --------------------------
  const storeRoom = rooms.find(r => r.id === "STORE");
  let storeTelePad = null;

  if (storeRoom) {
    const center = storeRoom.roomCenter.clone();

    const kiosk = box(4.6, 1.2, 3.0, MAT_TRIM);
    kiosk.position.set(center.x, 0.6, center.z);
    kiosk.rotation.y = storeRoom.doorA;
    scene.add(kiosk);

    const screen = box(4.2, 2.0, 0.12, MAT_GLASS);
    screen.position.set(center.x, 1.8, center.z - 1.45);
    screen.rotation.y = storeRoom.doorA;
    scene.add(screen);

    const balcY = 3.3;
    const balc = box(ROOM_W*0.62, 0.18, ROOM_L*0.30, MAT_HALL);
    balc.position.set(center.x - 2.8, balcY, center.z + 5.2);
    balc.rotation.y = storeRoom.doorA;
    scene.add(balc);

    const steps = 8;
    for (let i=0; i<steps; i++) {
      const s = box(3.2, 0.14, 0.55, MAT_TRIM);
      s.position.set(center.x + 3.6, 0.07 + i*(balcY/steps), center.z + 2.0 + i*0.55);
      s.rotation.y = storeRoom.doorA;
      scene.add(s);
    }

    storeTelePad = cyl(1.0, 1.0, 0.10, new THREE.MeshStandardMaterial({
      color: 0x2b6cff, emissive: 0x2b6cff, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0.2
    }), 28);
    storeTelePad.position.set(center.x - 2.8, balcY + 0.09, center.z + 5.2);
    storeTelePad.name = "TELEPAD_BALCONY";
    scene.add(storeTelePad);

    const manGeo = new THREE.CapsuleGeometry(0.35, 1.1, 8, 16);
    const manMat = new THREE.MeshStandardMaterial({ color: 0x1a2f55, roughness: 0.6, metalness: 0.25, emissive: 0x050a12 });
    for (let i=0; i<6; i++) {
      const m = new THREE.Mesh(manGeo, manMat);
      m.position.set(center.x + (-7 + i*2.8), 1.05, center.z + 6.8);
      scene.add(m);

      const baseP = cyl(0.7, 0.7, 0.08, MAT_TRIM, 20);
      baseP.position.set(m.position.x, 0.04, m.position.z);
      scene.add(baseP);
    }
  }

  // --------------------------
  // SPAWN PADS
  // --------------------------
  const spawns = [];
  function addSpawn(name, x, z, yaw) {
    const pad = cyl(0.9, 0.9, 0.09, MAT_PAD, 28);
    pad.position.set(x, 0.05, z);
    pad.name = name;
    scene.add(pad);
    spawns.push({ name, x, z, yaw });
  }

  addSpawn("SPAWN_N", 0, -(LOBBY_R - 6.0), Math.PI);
  addSpawn("SPAWN_E", (LOBBY_R - 6.0), 0, -Math.PI/2);
  addSpawn("SPAWN_S", 0, (LOBBY_R - 6.0), 0);
  addSpawn("SPAWN_W", -(LOBBY_R - 6.0), 0, Math.PI/2);

  const spawn = spawns.find(s => s.name === "SPAWN_N") || spawns[0];
  player.position.set(spawn.x, 0, spawn.z);
  player.rotation.y = spawn.yaw;
  log(`spawn ✅ ${spawn.name}`);

  // --------------------------
  // HOVER CARDS (tiny FX)
  // --------------------------
  const hoverCards = [];
  (function makeHoverCards() {
    const g = new THREE.PlaneGeometry(0.62, 0.88);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.05, emissive: 0x111111 });
    for (let i=0; i<5; i++) {
      const card = new THREE.Mesh(g, m);
      card.rotation.x = -Math.PI/2;
      card.position.y = 1.12;
      scene.add(card);
      hoverCards.push(card);
    }
  })();

  // --------------------------
  // BOTS (limbs + walking)
  // --------------------------
  const bots = [];
  const BOT_COUNT = 10;
  const rand = (min,max)=>min+Math.random()*(max-min);

  function makeBot() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b3cff, roughness: 0.35, metalness: 0.25, emissive: 0x0b1430 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x122744, roughness: 0.55, metalness: 0.25, emissive: 0x081020 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.62, 6, 14), bodyMat);
    torso.position.y = 1.05;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), bodyMat);
    head.position.y = 1.55;
    g.add(head);

    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10);
    const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.62, 10);

    const armL = new THREE.Mesh(armGeo, limbMat);
    const armR = new THREE.Mesh(armGeo, limbMat);
    armL.position.set(-0.28, 1.15, 0);
    armR.position.set( 0.28, 1.15, 0);
    g.add(armL, armR);

    const legL = new THREE.Mesh(legGeo, limbMat);
    const legR = new THREE.Mesh(legGeo, limbMat);
    legL.position.set(-0.12, 0.55, 0);
    legR.position.set( 0.12, 0.55, 0);
    g.add(legL, legR);

    g.userData = { armL, armR, legL, legR, tx:0, tz:0, t:0, speed:0.85+Math.random()*0.35, phase:Math.random()*10 };
    return g;
  }

  function spawnBot() {
    const b = makeBot();
    b.position.set(rand(-10,10), 0, rand(-10,10));
    b.userData.tx = rand(-LOBBY_R+8, LOBBY_R-8);
    b.userData.tz = rand(-LOBBY_R+8, LOBBY_R-8);
    b.userData.t = rand(1.5,6);
    scene.add(b);
    bots.push(b);
  }
  for (let i=0;i<BOT_COUNT;i++) spawnBot();

  function updateBots(dt, now) {
    for (const b of bots) {
      const u = b.userData;
      u.t -= dt;
      if (u.t <= 0) {
        u.t = rand(2,6);
        const a = rand(0, Math.PI*2);
        const r = rand(10, LOBBY_R-10);
        u.tx = Math.cos(a)*r;
        u.tz = Math.sin(a)*r;
      }

      const dx = u.tx - b.position.x;
      const dz = u.tz - b.position.z;
      const d = Math.hypot(dx,dz)+1e-6;

      // keep out of pit
      const td = Math.hypot(b.position.x, b.position.z);
      if (td < 10.2) { u.tx = b.position.x*1.35; u.tz = b.position.z*1.35; }

      b.position.x += (dx/d)*u.speed*dt;
      b.position.z += (dz/d)*u.speed*dt;
      b.rotation.y = Math.atan2((dx/d),(dz/d));

      const w = (now + u.phase) * 6.0;
      u.legL.rotation.x = Math.sin(w) * 0.55;
      u.legR.rotation.x = Math.sin(w + Math.PI) * 0.55;
      u.armL.rotation.x = Math.sin(w + Math.PI) * 0.45;
      u.armR.rotation.x = Math.sin(w) * 0.45;
    }
  }

  // --------------------------
  // VR BUTTON
  // --------------------------
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton ready ✅");
  } catch (e) {
    log("VRButton failed:", e?.message || e);
  }

  // --------------------------
  // ANDROID STICKS (SAFE + SEPARATE)
  // --------------------------
  try {
    initAndroidSticks({
      THREE,
      camera,
      rig: player,
      renderer,
      log: (...a) => log("[android]", ...a),
      // default movement (works for debugging)
    });
  } catch (e) {
    log("[android] sticks init failed:", e?.message || e);
  }

  // --------------------------
  // XR: CONTROLLERS + HANDS + TELEPORT VISUALS + STICKS
  // --------------------------
  const xr = {
    installed: false,
    tmpMat: new THREE.Matrix4(),
    rayOrigin: new THREE.Vector3(),
    rayDir: new THREE.Vector3(),
    plane: new THREE.Plane(new THREE.Vector3(0,1,0), 0),
    hit: new THREE.Vector3(),
    controller: [null,null],
    grip: [null,null],
    hand: [null,null],
    laser: [null,null],
    reticle: null,
    arc: [null,null],
    arcPts: [new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],
    moveSpeed: 2.2,
    strafeSpeed: 2.0,
    snapAngle: Math.PI/4,
    snapCooldown: 0,
    snapDead: 0.72
  };

  function teleportTo(point) {
    const camPos = new THREE.Vector3(); camera.getWorldPosition(camPos);
    const rigPos = new THREE.Vector3(); player.getWorldPosition(rigPos);
    const dx = camPos.x - rigPos.x;
    const dz = camPos.z - rigPos.z;
    player.position.set(point.x - dx, 0, point.z - dz);
  }

  function computeRayFromObject(obj) {
    xr.tmpMat.identity().extractRotation(obj.matrixWorld);
    xr.rayOrigin.setFromMatrixPosition(obj.matrixWorld);
    xr.rayDir.set(0,0,-1).applyMatrix4(xr.tmpMat).normalize();
  }

  function raycastToFloor() {
    const denom = xr.plane.normal.dot(xr.rayDir);
    if (Math.abs(denom) < 1e-6) return null;
    const t = -(xr.plane.normal.dot(xr.rayOrigin) + xr.plane.constant) / denom;
    if (t < 0) return null;
    xr.hit.copy(xr.rayOrigin).addScaledVector(xr.rayDir, t);
    return xr.hit;
  }

  function ensureTeleportVisuals() {
    if (!xr.reticle) {
      xr.reticle = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 40), MAT_RETICLE);
      xr.reticle.rotation.x = -Math.PI/2;
      xr.reticle.position.y = 0.02;
      xr.reticle.visible = false;
      scene.add(xr.reticle);

      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 40),
        new THREE.MeshStandardMaterial({
          color: 0x2b6cff, emissive: 0x2b6cff, emissiveIntensity: 0.9,
          roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.25
        })
      );
      glow.rotation.x = -Math.PI/2;
      glow.position.y = 0.019;
      xr.reticle.add(glow);
    }

    for (let i=0;i<2;i++) {
      if (!xr.arc[i]) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()
        ]);
        const line = new THREE.Line(geo, MAT_GLOW_LINE);
        line.visible = false;
        scene.add(line);
        xr.arc[i] = line;
      }
    }
  }

  function updateArc(i, start, end) {
    const mid = xr.arcPts[2];
    mid.copy(start).lerp(end, 0.5);
    mid.y += 1.2;

    const p0 = xr.arcPts[0].copy(start);
    const p1 = xr.arcPts[1].copy(start).lerp(mid, 0.5);
    const p2 = xr.arcPts[2];
    const p3 = xr.arcPts[3].copy(mid).lerp(end, 0.5);
    const p4 = xr.arcPts[4].copy(end);

    xr.arc[i].geometry.setFromPoints([p0,p1,p2,p3,p4]);
    xr.arc[i].visible = true;
  }

  function getYawForward() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    return dir;
  }

  function getXRGamepads() {
    const s = renderer.xr.getSession?.();
    if (!s) return { left:null, right:null };
    let left=null, right=null;
    for (const src of s.inputSources) {
      if (!src || !src.gamepad) continue;
      const h = src.handedness || "none";
      if (h === "left") left = src.gamepad;
      if (h === "right") right = src.gamepad;
    }
    return { left, right };
  }

  function readStick(gp) {
    if (!gp || !gp.axes) return { x:0, y:0 };
    const a0 = gp.axes[0] || 0, a1 = gp.axes[1] || 0;
    const a2 = gp.axes[2] || 0, a3 = gp.axes[3] || 0;
    const m01 = Math.abs(a0)+Math.abs(a1);
    const m23 = Math.abs(a2)+Math.abs(a3);
    return (m23 > m01) ? { x:a2, y:a3 } : { x:a0, y:a1 };
  }

  async function installXR() {
    if (xr.installed) return;
    xr.installed = true;
    ensureTeleportVisuals();

    log("[XR] installing controllers + hands + sticks…");

    // controllers + trigger teleport
    for (let i=0;i<2;i++) {
      const c = renderer.xr.getController(i);
      player.add(c);
      xr.controller[i] = c;

      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
      const mat = new THREE.LineBasicMaterial({ color: 0x66aaff, transparent:true, opacity:0.9 });
      const line = new THREE.Line(geom, mat);
      line.scale.z = 6;
      c.add(line);
      xr.laser[i] = line;

      c.addEventListener("selectend", () => {
        computeRayFromObject(c);
        const hit = raycastToFloor();
        if (hit) teleportTo(hit);
      });
    }

    // controller models (safe)
    try {
      const { XRControllerModelFactory } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRControllerModelFactory.js");
      const factory = new XRControllerModelFactory();
      for (let i=0;i<2;i++) {
        const grip = renderer.xr.getControllerGrip(i);
        grip.add(factory.createControllerModel(grip));
        player.add(grip);
        xr.grip[i] = grip;
      }
      log("[XR] controller models ✅");
    } catch (e) {
      log("[XR] controller models skipped:", e?.message || e);
    }

    // hands + pinch teleport (safe)
    try {
      const { XRHandModelFactory } = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js");
      const handFactory = new XRHandModelFactory();
      for (let i=0;i<2;i++) {
        const h = renderer.xr.getHand(i);
        h.add(handFactory.createHandModel(h, "mesh"));
        player.add(h);
        xr.hand[i] = h;

        h.addEventListener("pinchend", () => {
          computeRayFromObject(h);
          const hit = raycastToFloor();
          if (hit) teleportTo(hit);
        });
      }
      log("[XR] hands ✅");
    } catch (e) {
      log("[XR] hands skipped:", e?.message || e);
    }
  }

  renderer.xr.addEventListener("sessionstart", () => {
    log("XR session start ✅");
    installXR();
  });

  // --------------------------
  // MODULE LOADER (SAFE)
  // --------------------------
  async function tryLoadModules() {
    // load spine_modules.js safely (no crash if missing)
    if (!initModulesSafe) {
      try {
        const mod = await import(`${here}spine_modules.js?v=${v}`);
        initModulesSafe = mod?.initModules || null;
      } catch (e) {
        log("[mods] spine_modules.js missing (skip):", e?.message || e);
        return;
      }
    }
    if (!initModulesSafe) return;

    const ctxForMods = {
      THREE, scene, renderer, player, camera, log,
      registerUpdate,
      // useful pointers:
      world: { SCALE, LOBBY_R, WALL_H, ROOM_W, ROOM_L },
      table: { center: new THREE.Vector3(0,0,0), feltY: 0.82 },
      store: { telepad: storeTelePad }
    };

    try {
      await initModulesSafe(ctxForMods);
      log("[mods] loaded ✅");
    } catch (e) {
      log("[mods] init failed (safe):", e?.message || e);
    }
  }

  // kick module loading after first frame (keeps boot stable)
  setTimeout(() => { tryLoadModules(); }, 0);

  // --------------------------
  // RESIZE
  // --------------------------
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --------------------------
  // MAIN LOOP
  // --------------------------
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    const t = performance.now() * 0.001;

    // bots
    updateBots(dt, t);

    // hover cards
    for (let i=0;i<hoverCards.length;i++) {
      const c = hoverCards[i];
      const a = t*0.45 + i*(Math.PI*2/hoverCards.length);
      c.position.x = Math.cos(a) * 1.9;
      c.position.z = Math.sin(a) * 1.3;
      c.position.y = 1.12 + Math.sin(t*1.4 + i) * 0.06;
      c.rotation.y = a + Math.PI/2;
    }

    // XR visuals + locomotion
    if (xr.installed && renderer.xr.isPresenting) {
      ensureTeleportVisuals();

      // aim source (prefer right controller/hand)
      const aimObj = xr.controller[1] || xr.controller[0] || xr.hand[1] || xr.hand[0];
      if (aimObj) {
        computeRayFromObject(aimObj);
        const hit = raycastToFloor();
        if (hit) {
          xr.reticle.visible = true;
          xr.reticle.position.set(hit.x, 0.02, hit.z);
        } else xr.reticle.visible = false;
      }

      // arcs + laser length
      for (let i=0;i<2;i++) {
        const src = xr.controller[i] || xr.hand[i];
        if (!src || !xr.arc[i]) { if (xr.arc[i]) xr.arc[i].visible=false; continue; }
        computeRayFromObject(src);
        const hit = raycastToFloor();
        if (!hit) { xr.arc[i].visible=false; continue; }
        const start = new THREE.Vector3().setFromMatrixPosition(src.matrixWorld);
        updateArc(i, start, hit.clone());
        if (xr.laser[i]) xr.laser[i].scale.z = Math.max(0.25, Math.min(12, hit.distanceTo(start)));
      }

      // locomotion: left stick move, right stick snap turn
      const { left, right } = getXRGamepads();
      const L = readStick(left);
      const R = readStick(right);

      const dz = 0.14;
      const lx = Math.abs(L.x) < dz ? 0 : L.x;
      const ly = Math.abs(L.y) < dz ? 0 : L.y;
      const rx = Math.abs(R.x) < dz ? 0 : R.x;

      if (lx !== 0 || ly !== 0) {
        const fwd = getYawForward();
        const rightVec = new THREE.Vector3().crossVectors(fwd, UP).normalize().multiplyScalar(-1);
        const forwardAmt = -ly * xr.moveSpeed * dt;
        const strafeAmt  =  lx * xr.strafeSpeed * dt;
        player.position.addScaledVector(fwd, forwardAmt);
        player.position.addScaledVector(rightVec, strafeAmt);
      }

      xr.snapCooldown = Math.max(0, xr.snapCooldown - dt);
      if (xr.snapCooldown <= 0) {
        if (rx > xr.snapDead) { player.rotation.y -= xr.snapAngle; xr.snapCooldown = 0.22; }
        else if (rx < -xr.snapDead) { player.rotation.y += xr.snapAngle; xr.snapCooldown = 0.22; }
      }

      // telepad pulse
      if (storeTelePad && xr.reticle && xr.reticle.visible) {
        const d = xr.reticle.position.distanceTo(storeTelePad.position);
        storeTelePad.scale.setScalar(d < 1.2 ? (1.0 + Math.sin(t*6)*0.05) : 1.0);
      }
    }

    // module updates (poker module, etc)
    for (let i=0;i<updates.length;i++) {
      try { updates[i](dt, t); } catch (e) { log("[mod update err]", e?.message || e); }
    }

    renderer.render(scene, camera);
  });

  log("render loop start ✅");
  log("initWorld() completed ✅");

  return { renderer, scene, camera, player, cameraPitch, registerUpdate };
}

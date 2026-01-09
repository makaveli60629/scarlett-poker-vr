// /js/world.js — Scarlett World v10.9 (SEAT FIX + LIGHTS + DECOR + LEFT/RIGHT DOORS)
// - Seat anchors lowered so bots sit correctly (no floating feet)
// - Added ceiling lights + corner lights
// - Added pillars + plants for vibe
// - Doors remain LEFT/RIGHT
// - Keeps Bots integration

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const tableFocus = new THREE.Vector3(0, 0, -6.5);
  const tableY = 0.92;

  // ---------- TEXTURES ----------
  const loader = new THREE.TextureLoader();
  const floorTex = loader.load("./assets/textures/scarlett_floor_tile_seamless.png?v=" + v);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);
  floorTex.colorSpace = THREE.SRGBColorSpace;

  const wallTex = loader.load("./assets/textures/1767279790736.jpg?v=" + v);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(5, 2);
  wallTex.colorSpace = THREE.SRGBColorSpace;

  // Put your processed transparent door PNG here:
  // /assets/textures/scarlett_door.png
  const doorTex = loader.load("./assets/textures/scarlett_door.png?v=" + v);
  doorTex.colorSpace = THREE.SRGBColorSpace;

  // ---------- ROOM ----------
  const roomW = 28, roomD = 28, roomH = 6.8;

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.0 })
  );
  floor.name = "Floor";
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  group.add(floor);

  // walls
  function wall(x, z, ry, w = roomW, h = roomH) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.88, metalness: 0.0 })
    );
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
    return m;
  }
  wall(0, -roomD / 2, 0, roomW, roomH);
  wall(0, roomD / 2, Math.PI, roomW, roomH);
  wall(-roomW / 2, 0, Math.PI / 2, roomD, roomH);
  wall(roomW / 2, 0, -Math.PI / 2, roomD, roomH);

  // ---------- LIGHTS / CEILING ----------
  const ceil = new THREE.Group();
  ceil.name = "CeilingLights";
  group.add(ceil);

  function addCeilLight(x, z, color, intensity) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, roughness: 0.2 })
    );
    bulb.position.set(x, roomH - 0.35, z);
    ceil.add(bulb);

    const L = new THREE.PointLight(color, intensity, 14);
    L.position.copy(bulb.position);
    ceil.add(L);
  }

  // main area lights
  addCeilLight(0, tableFocus.z, 0x7fe7ff, 0.85);
  addCeilLight(2.8, tableFocus.z - 1.5, 0xff2d7a, 0.65);
  addCeilLight(-2.8, tableFocus.z - 1.5, 0xff2d7a, 0.65);
  addCeilLight(0, tableFocus.z + 2.2, 0xffffff, 0.7);

  // corner ambience
  addCeilLight(roomW/2 - 2.5, roomD/2 - 2.5, 0x7fe7ff, 0.35);
  addCeilLight(-roomW/2 + 2.5, roomD/2 - 2.5, 0xff2d7a, 0.35);
  addCeilLight(roomW/2 - 2.5, -roomD/2 + 2.5, 0xff2d7a, 0.35);
  addCeilLight(-roomW/2 + 2.5, -roomD/2 + 2.5, 0x7fe7ff, 0.35);

  // ---------- TABLE TOP (felt + lines) ----------
  function feltTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0a3a2c";
    ctx.fillRect(0,0,1024,1024);

    // grain
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
    }

    // thick outer white border
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(512, 512, 440, 330, 0, 0, Math.PI * 2);
    ctx.stroke();

    // pass line (aqua)
    ctx.strokeStyle = "rgba(127,231,255,0.88)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(512, 512, 365, 270, 0, 0, Math.PI * 2);
    ctx.stroke();

    // logo
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.font = "bold 90px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCARLETT VR POKER", 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  const feltTex = feltTexture();
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.95, 2.25, 0.18, 64),
    new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.88, metalness: 0.05 })
  );
  tableTop.position.set(tableFocus.x, tableY, tableFocus.z);
  group.add(tableTop);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.90, 1.15, 28),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.position.set(tableFocus.x, tableY - 0.68, tableFocus.z);
  group.add(tableBase);

  // ---------- RAIL ----------
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.10, 12, 90),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.45, metalness: 0.25, emissive: 0x101020, emissiveIntensity: 0.25 })
  );
  rail.position.set(tableFocus.x, 0.95, tableFocus.z);
  rail.rotation.x = Math.PI / 2;
  group.add(rail);

  const railGlow = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.03, 10, 120),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.52, roughness: 0.2, metalness: 0.0 })
  );
  railGlow.position.copy(rail.position);
  railGlow.rotation.copy(rail.rotation);
  group.add(railGlow);

  // ---------- CHAIRS + SEATS ----------
  const seats = [];
  function makeChair(angle, idx) {
    const chair = new THREE.Group();
    chair.name = "Chair_" + idx;

    const r = 2.75;
    const x = tableFocus.x + Math.cos(angle) * r;
    const z = tableFocus.z + Math.sin(angle) * r;

    chair.position.set(x, 0, z);
    chair.rotation.y = -angle + Math.PI / 2;

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.10, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    seat.position.y = 0.48;
    chair.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.58, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    back.position.set(0, 0.78, -0.23);
    chair.add(back);

    // ✅ lowered anchor (was 0.52). This fixes floating feet & “standing in chair”
    const anchor = new THREE.Object3D();
    anchor.name = "SeatAnchor";
    anchor.position.set(0, 0.46, 0.08);
    chair.add(anchor);

    group.add(chair);
    seats[idx] = { anchor, yaw: chair.rotation.y };
  }

  const angles = [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85];
  angles.forEach((a, i) => makeChair(a, i + 1));

  function getSeats() { return seats; }

  // ---------- GUARD (outside rail front) ----------
  const guard = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.75, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.6, metalness: 0.15, emissive: 0x0b0b10, emissiveIntensity: 0.25 })
  );
  guard.position.set(tableFocus.x, 0.95, tableFocus.z + 4.5);
  guard.name = "GuardNPC";
  group.add(guard);

  // ---------- DECOR (pillars + plants) ----------
  function pillar(x, z) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.28, 3.8, 18),
      new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.55, metalness: 0.25 })
    );
    p.position.set(x, 1.9, z);
    group.add(p);
  }
  pillar(-roomW/2 + 1.8, tableFocus.z - 6);
  pillar(roomW/2 - 1.8, tableFocus.z - 6);
  pillar(-roomW/2 + 1.8, tableFocus.z + 6);
  pillar(roomW/2 - 1.8, tableFocus.z + 6);

  function plant(x, z) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.7, metalness: 0.05 })
    );
    pot.position.set(x, 0.16, z);
    group.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x2f7a4e, roughness: 0.9, metalness: 0.0, emissive: 0x102010, emissiveIntensity: 0.15 })
    );
    leaves.position.set(x, 0.75, z);
    group.add(leaves);
  }
  plant(-roomW/2 + 2.6, tableFocus.z);
  plant(roomW/2 - 2.6, tableFocus.z);

  // ---------- DOORS LEFT/RIGHT ----------
  function makeDoor(signText, x, z, yaw) {
    const door = new THREE.Group();
    door.position.set(x, 0, z);
    door.rotation.y = yaw;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.2, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.45, metalness: 0.25 })
    );
    frame.position.set(0, 1.6, 0);
    door.add(frame);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 3.0),
      new THREE.MeshStandardMaterial({
        map: doorTex,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.35,
        metalness: 0.1,
        emissive: 0x111111,
        emissiveIntensity: 0.25
      })
    );
    panel.position.set(0, 1.55, 0.10);
    door.add(panel);

    // neon sign above
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 1024; signCanvas.height = 256;
    const ctx = signCanvas.getContext("2d");
    ctx.clearRect(0,0,1024,256);
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#7fe7ff";
    ctx.fillText(signText, 512, 130);
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshStandardMaterial({ map: signTex, transparent: true, emissive: 0x7fe7ff, emissiveIntensity: 0.65 })
    );
    sign.position.set(0, 3.25, 0.12);
    door.add(sign);

    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.52, 48),
      new THREE.MeshStandardMaterial({ color: 0xff2d7a, emissive: 0xff2d7a, emissiveIntensity: 0.60, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.02, 1.25);
    pad.name = signText === "STORE" ? "PadStore" : "PadPoker";
    door.add(pad);

    group.add(door);
    return { door, pad };
  }

  makeDoor("STORE", -roomW / 2 + 0.25, tableFocus.z, Math.PI / 2);
  makeDoor("POKER",  roomW / 2 - 0.25, tableFocus.z, -Math.PI / 2);

  // ---------- SPAWN PAD ----------
  const spawnPad = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 64),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.50, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnPad.rotation.x = -Math.PI / 2;
  spawnPad.position.set(0, 0.02, 3.6);
  spawnPad.name = "SpawnPad";
  group.add(spawnPad);

  // ---------- BOTS ----------
  try {
    Bots.init({ THREE, scene, getSeats, tableFocus, metrics: { tableY, seatY: 0.46 } });
  } catch (e) {
    console.error(e);
    log?.("[world] bots init failed ❌ " + (e?.message || e));
  }

  log?.("[world] ready ✅");

  const api = {
    group,
    floor,
    tableFocus,
    tableY,
    spawn: new THREE.Vector3(0, 0, 3.6),
    spawnYaw: 0,

    getSeats,

    connect({ playerRig, camera }) {
      try { Bots.setPlayerRig(playerRig, camera); } catch {}
      api.playerRigRef = playerRig;
      api.cameraRef = camera;
    },

    tick(dt) {
      spawnPad.material.opacity = 0.65 + Math.sin(performance.now() * 0.004) * 0.18;
      railGlow.material.emissiveIntensity = 0.40 + Math.sin(performance.now() * 0.003) * 0.22;
      try { Bots.update(dt); } catch (e) { console.error(e); }
    }
  };

  return api;
}

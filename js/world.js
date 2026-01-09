// /js/world.js — Scarlett World MASTER v12.0
// Includes:
// - Full room + textures (safe fallbacks)
// - 6-max OVAL table + trim + neon pass line
// - Chairs always face table + seat anchors
// - Store recessed into wall (walk-in) + 4 mannequin display outside
// - Teleporter ARCH restored using your pic2.png
// - Teleport pads: Poker ↔ Store
// - No blue spawn ring (spawn is invisible marker)

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const tableFocus = new THREE.Vector3(0, 0, -8.8);
  const tableY = 0.92;

  // ---------- TEXTURE HELPERS (SAFE) ----------
  const loader = new THREE.TextureLoader();

  function loadTex(url, opts = {}) {
    try {
      const t = loader.load(url);
      if (opts.repeat) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(opts.repeat[0], opts.repeat[1]);
      }
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    } catch {
      return null;
    }
  }

  // Your textures (from screenshot)
  const floorTex = loadTex("./assets/textures/scarlett_floor_tile_seamless.png?v=" + v, { repeat:[6,6] });
  const wallTex  = loadTex("./assets/textures/scarlett_wall_seamless.png?v=" + v, { repeat:[5,2] });

  const doorStoreTex = loadTex("./assets/textures/scarlett_door_store.png?v=" + v);
  const doorPokerTex = loadTex("./assets/textures/scarlett_door_poker.png?v=" + v);

  // Teleporter arch image from your phone list:
  // ✅ Make sure this exists: /assets/textures/pic2.png
  const archTex = loadTex("./assets/textures/pic2.png?v=" + v);

  // ---------- ROOM ----------
  const roomW = 34, roomD = 34, roomH = 7.2;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({
      map: floorTex || null,
      color: floorTex ? 0xffffff : 0x0b0d14,
      roughness: 0.92,
      metalness: 0.0
    })
  );
  floor.name = "Floor";
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  function wall(x, z, ry, w = roomW, h = roomH) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: wallTex || null,
        color: wallTex ? 0xffffff : 0x111318,
        roughness: 0.88,
        metalness: 0.0
      })
    );
    m.position.set(x, h/2, z);
    m.rotation.y = ry;
    group.add(m);
    return m;
  }
  wall(0, -roomD/2, 0, roomW, roomH);
  wall(0,  roomD/2, Math.PI, roomW, roomH);
  wall(-roomW/2, 0, Math.PI/2, roomD, roomH);
  wall( roomW/2, 0, -Math.PI/2, roomD, roomH);

  // ---------- LIGHTS ----------
  const ceil = new THREE.Group(); ceil.name = "CeilingLights"; group.add(ceil);

  function addCeilLight(x, z, color, intensity) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, roughness: 0.2 })
    );
    bulb.position.set(x, roomH - 0.4, z);
    ceil.add(bulb);

    const L = new THREE.PointLight(color, intensity, 16);
    L.position.copy(bulb.position);
    ceil.add(L);
  }

  addCeilLight(0, tableFocus.z, 0x7fe7ff, 0.85);
  addCeilLight(3.2, tableFocus.z - 1.6, 0xff2d7a, 0.55);
  addCeilLight(-3.2, tableFocus.z - 1.6, 0xff2d7a, 0.55);
  addCeilLight(0, tableFocus.z + 2.2, 0xffffff, 0.70);

  // Corner accents
  addCeilLight(roomW/2 - 2.5, roomD/2 - 2.5, 0x7fe7ff, 0.30);
  addCeilLight(-roomW/2 + 2.5, roomD/2 - 2.5, 0xff2d7a, 0.30);
  addCeilLight(roomW/2 - 2.5, -roomD/2 + 2.5, 0xff2d7a, 0.30);
  addCeilLight(-roomW/2 + 2.5, -roomD/2 + 2.5, 0x7fe7ff, 0.30);

  // ---------- TABLE (OVAL 6-MAX) ----------
  function feltTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0a3a2c";
    ctx.fillRect(0,0,1024,1024);

    // noise
    for (let i=0;i<1500;i++){
      ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
    }

    const cx=512, cy=512;
    // outer border
    ctx.strokeStyle="rgba(255,255,255,0.92)";
    ctx.lineWidth=24;
    ctx.beginPath();
    ctx.ellipse(cx,cy,460,310,0,0,Math.PI*2);
    ctx.stroke();

    // pass line (neon aqua embedded)
    ctx.strokeStyle="rgba(127,231,255,0.88)";
    ctx.lineWidth=10;
    ctx.beginPath();
    ctx.ellipse(cx,cy,390,260,0,0,Math.PI*2);
    ctx.stroke();

    // inner trim
    ctx.strokeStyle="rgba(255,45,122,0.25)";
    ctx.lineWidth=8;
    ctx.beginPath();
    ctx.ellipse(cx,cy,340,225,0,0,Math.PI*2);
    ctx.stroke();

    // title
    ctx.fillStyle="rgba(255,255,255,0.14)";
    ctx.font="bold 84px Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("SCARLETT POKER", cx, cy);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.55, 0.18, 72),
    new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.88, metalness: 0.05 })
  );
  tableTop.name = "TableTop";
  tableTop.position.set(tableFocus.x, tableY, tableFocus.z);
  group.add(tableTop);

  // Table trim ring
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(2.55, 0.06, 14, 120),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.45,
      metalness: 0.22,
      emissive: 0x111122,
      emissiveIntensity: 0.25
    })
  );
  trim.position.set(tableFocus.x, tableY + 0.04, tableFocus.z);
  trim.rotation.x = Math.PI / 2;
  group.add(trim);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(4.15, 0.11, 14, 140),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.45, metalness: 0.25, emissive: 0x101020, emissiveIntensity: 0.22 })
  );
  rail.name = "Rail";
  rail.position.set(tableFocus.x, 0.95, tableFocus.z);
  rail.rotation.x = Math.PI / 2;
  group.add(rail);

  const railGlow = new THREE.Mesh(
    new THREE.TorusGeometry(4.15, 0.03, 12, 160),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.52, roughness: 0.2 })
  );
  railGlow.position.copy(rail.position);
  railGlow.rotation.copy(rail.rotation);
  group.add(railGlow);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.05, 1.25, 32),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.position.set(tableFocus.x, tableY - 0.70, tableFocus.z);
  group.add(tableBase);

  // ---------- DECOR ----------
  function pillar(x, z) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 4.2, 20),
      new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.55, metalness: 0.25 })
    );
    p.position.set(x, 2.1, z);
    group.add(p);
    return p;
  }
  pillar(-roomW/2 + 2.0, tableFocus.z - 6.5);
  pillar(roomW/2 - 2.0, tableFocus.z - 6.5);
  pillar(-roomW/2 + 2.0, tableFocus.z + 6.5);
  pillar(roomW/2 - 2.0, tableFocus.z + 6.5);

  function plant(x, z) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.34, 18),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.7, metalness: 0.05 })
    );
    pot.position.set(x, 0.17, z);
    group.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x2f7a4e, roughness: 0.9, emissive: 0x102010, emissiveIntensity: 0.15 })
    );
    leaves.position.set(x, 0.80, z);
    group.add(leaves);
  }
  plant(-roomW/2 + 2.9, tableFocus.z);
  plant(roomW/2 - 2.9, tableFocus.z);

  // ---------- CHAIRS + SEATS ----------
  const seats = [];
  function makeChair(angle, idx) {
    const chair = new THREE.Group();
    chair.name = "Chair_" + idx;

    const r = 2.95;
    chair.position.set(
      tableFocus.x + Math.cos(angle) * r,
      0,
      tableFocus.z + Math.sin(angle) * r
    );

    // Always face table
    chair.lookAt(tableFocus.x, 0, tableFocus.z);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.10, 0.58),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    seat.position.y = 0.48;
    chair.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.62, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    back.position.set(0, 0.82, 0.25);
    chair.add(back);

    const anchor = new THREE.Object3D();
    anchor.name = "SeatAnchor";
    anchor.position.set(0, 0.42, -0.10);
    chair.add(anchor);

    group.add(chair);
    seats[idx] = { anchor, yaw: chair.rotation.y };
  }

  // 6 seats around oval
  const angles = [-0.35, 0.55, 1.55, 2.55, 3.55, 4.40];
  angles.forEach((a, i) => makeChair(a, i + 1));
  const getSeats = () => seats;

  // ---------- STORE (RECESSED WALK-IN) ----------
  // Store is on RIGHT side wall area; recessed into wall.
  const store = new THREE.Group();
  store.name = "StoreNook";
  group.add(store);

  const storeCenter = new THREE.Vector3(roomW/2 - 2.8, 0, tableFocus.z + 4.2);
  const storeW = 6.8, storeD = 5.2, storeH = 3.2;

  // Cut-in illusion: build interior box inset
  const storeFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(storeW, storeD),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.95 })
  );
  storeFloor.rotation.x = -Math.PI/2;
  storeFloor.position.set(storeCenter.x - 1.8, 0.01, storeCenter.z);
  store.add(storeFloor);

  const storeWallMat = new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.85, metalness: 0.05 });

  function storeWall(px, py, pz, ry, w, h) {
    const wmesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), storeWallMat);
    wmesh.position.set(px, py, pz);
    wmesh.rotation.y = ry;
    store.add(wmesh);
  }
  // back and sides
  storeWall(storeCenter.x - 1.8, storeH/2, storeCenter.z - storeD/2, 0, storeW, storeH);
  storeWall(storeCenter.x - 1.8 - storeW/2, storeH/2, storeCenter.z, Math.PI/2, storeD, storeH);
  storeWall(storeCenter.x - 1.8 + storeW/2, storeH/2, storeCenter.z, -Math.PI/2, storeD, storeH);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(storeW, 0.18, storeD),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.6, metalness: 0.2 })
  );
  roof.position.set(storeCenter.x - 1.8, storeH + 0.04, storeCenter.z);
  store.add(roof);

  // Underglow lights
  const underA = new THREE.PointLight(0x7fe7ff, 0.35, 8);
  underA.position.set(storeCenter.x - 1.8 - 2.2, storeH - 0.2, storeCenter.z);
  store.add(underA);

  const underP = new THREE.PointLight(0xff2d7a, 0.28, 8);
  underP.position.set(storeCenter.x - 1.8 + 2.2, storeH - 0.2, storeCenter.z);
  store.add(underP);

  // Display rails (two)
  function displayRail(px, pz) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.10, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.55, metalness: 0.25 })
    );
    rail.position.set(px, 0.55, pz);
    store.add(rail);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(2.22, 0.03, 1.62),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.75, roughness: 0.3 })
    );
    glow.position.set(px, 0.62, pz);
    store.add(glow);
  }

  // Right-hand inside wall rail + left one
  displayRail(storeCenter.x - 1.8 + 2.2, storeCenter.z - 0.3);
  displayRail(storeCenter.x - 1.8 - 2.2, storeCenter.z - 0.3);

  // ---------- MANNEQUINS OUTSIDE STORE (4) ----------
  function makeMannequin() {
    // reuse Bots “Avatar Update 1” rig style (simple humanoid)
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x141923, roughness: 0.78, metalness: 0.08, emissive: 0x001018, emissiveIntensity: 0.12 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.55, 8, 12), mat);
    torso.position.y = 1.05; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.8 }));
    head.position.y = 1.55; g.add(head);
    const legGeo = new THREE.CapsuleGeometry(0.06, 0.45, 8, 12);
    const l1 = new THREE.Mesh(legGeo, mat); l1.position.set(-0.10, 0.45, 0); g.add(l1);
    const l2 = new THREE.Mesh(legGeo, mat); l2.position.set( 0.10, 0.45, 0); g.add(l2);
    const armGeo = new THREE.CapsuleGeometry(0.05, 0.32, 8, 12);
    const a1 = new THREE.Mesh(armGeo, mat); a1.position.set(-0.26, 1.15, 0); a1.rotation.z = 0.25; g.add(a1);
    const a2 = new THREE.Mesh(armGeo, mat); a2.position.set( 0.26, 1.15, 0); a2.rotation.z = -0.25; g.add(a2);
    return g;
  }

  const mannequins = new THREE.Group();
  mannequins.name = "StoreMannequins";
  group.add(mannequins);

  for (let i=0;i<4;i++){
    const m = makeMannequin();
    m.position.set(storeCenter.x - 4.8 + i*1.1, 0, storeCenter.z + 2.4);
    m.lookAt(storeCenter.x - 2.0, 1.2, storeCenter.z);
    mannequins.add(m);

    const glow = new THREE.PointLight(0x7fe7ff, 0.18, 5);
    glow.position.set(m.position.x, 2.4, m.position.z);
    mannequins.add(glow);
  }

  // ---------- TELEPORT ARCH (RESTORED) ----------
  // Built with planes + emissive + small “electric” corner sparks
  const teleportArch = new THREE.Group();
  teleportArch.name = "TeleportArch";
  group.add(teleportArch);

  const archPos = new THREE.Vector3(0, 0, 10.0); // lobby front area
  teleportArch.position.copy(archPos);

  const archFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 3.5, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.35, metalness: 0.25 })
  );
  archFrame.position.set(0, 1.75, 0);
  teleportArch.add(archFrame);

  const archPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 3.3),
    new THREE.MeshStandardMaterial({
      map: archTex || null,
      transparent: true,
      alphaTest: 0.03,
      emissive: 0x7fe7ff,
      emissiveIntensity: 1.25,
      roughness: 0.2,
      metalness: 0.1
    })
  );
  archPanel.position.set(0, 1.75, 0.19);
  teleportArch.add(archPanel);

  // Pad disc
  const archPad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 0.06, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.35,
      metalness: 0.25,
      emissive: 0x0b2b55,
      emissiveIntensity: 0.65
    })
  );
  archPad.position.set(0, 0.03, 0.10);
  teleportArch.add(archPad);

  const archRing = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.33, 72),
    new THREE.MeshStandardMaterial({
      color: 0x7fe7ff,
      emissive: 0x7fe7ff,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.80,
      side: THREE.DoubleSide
    })
  );
  archRing.rotation.x = -Math.PI/2;
  archRing.position.set(0, 0.065, 0.10);
  teleportArch.add(archRing);

  // Spark “electric” corners
  function spark(x, y, z, col=0xff2d7a) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 12),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.0, roughness: 0.2 })
    );
    s.position.set(x,y,z);
    teleportArch.add(s);

    const L = new THREE.PointLight(col, 0.55, 6);
    L.position.copy(s.position);
    teleportArch.add(L);
    return s;
  }
  const spL = spark(-1.2, 3.35, 0.15);
  const spR = spark( 1.2, 3.35, 0.15);

  // ---------- TELEPORT PADS (POKER + STORE + STORE INSIDE) ----------
  function makePad(name, x, z, color) {
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.52, 56),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.75, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI/2;
    pad.position.set(x, 0.02, z);
    pad.name = name;
    group.add(pad);
    return pad;
  }

  const padPoker = makePad("PadPoker",  0, tableFocus.z + 4.8, 0xff2d7a);
  const padStore = makePad("PadStore",  storeCenter.x - 6.2, storeCenter.z + 2.4, 0x7fe7ff);
  const padStoreInside = makePad("PadStoreInside", storeCenter.x - 1.8, storeCenter.z + 1.2, 0x7fe7ff);

  // ---------- DOOR SIGNS (LIGHTWEIGHT) ----------
  function makeDoorSign(text, x, z, yaw, tex) {
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
        map: tex || null,
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
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,1024,256);
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#7fe7ff";
    ctx.fillText(text, 512, 130);

    const signTex = new THREE.CanvasTexture(c);
    signTex.colorSpace = THREE.SRGBColorSpace;

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshStandardMaterial({ map: signTex, transparent: true, emissive: 0x7fe7ff, emissiveIntensity: 0.70 })
    );
    sign.position.set(0, 3.25, 0.12);
    door.add(sign);

    group.add(door);
  }

  makeDoorSign("POKER", -roomW/2 + 0.3, tableFocus.z, Math.PI/2, doorPokerTex);
  makeDoorSign("STORE",  roomW/2 - 0.3, tableFocus.z, -Math.PI/2, doorStoreTex);

  // ---------- BOTS (SEATED ONLY) ----------
  Bots.init({
    THREE,
    scene,
    getSeats,
    tableFocus,
    metrics: { tableY, seatY: 0.42 },
    config: { count: 6, idle: true }
  });

  log?.("[world] ready ✅");

  // ---------- API ----------
  const api = {
    group,
    floor,
    tableFocus,
    tableY,
    spawn: new THREE.Vector3(0, 0, 9.0),  // ✅ safe lobby spawn (NOT inside table)
    spawnYaw: Math.PI,

    // teleport destinations
    destPoker: new THREE.Vector3(0, 0, tableFocus.z + 4.2),
    destStore: new THREE.Vector3(storeCenter.x - 1.8, 0, storeCenter.z + 1.2),
    destLobby: new THREE.Vector3(archPos.x, 0, archPos.z + 1.8),

    connect({ playerRig, camera }) {
      api.playerRigRef = playerRig;
      api.cameraRef = camera;
      try { Bots.setPlayerRig(playerRig, camera); } catch {}
    },

    // used by Teleport system
    findPadByName(name) {
      return group.getObjectByName(name);
    },

    tick(dt) {
      // animate arch glow + corner sparks
      archRing.material.emissiveIntensity = 0.70 + Math.sin(performance.now()*0.004)*0.25;
      spL.scale.setScalar(1.0 + Math.sin(performance.now()*0.012)*0.08);
      spR.scale.setScalar(1.0 + Math.cos(performance.now()*0.011)*0.08);

      railGlow.material.emissiveIntensity = 0.42 + Math.sin(performance.now() * 0.003) * 0.22;

      try { Bots.update(dt); } catch (e) { console.error(e); }
    }
  };

  return api;
}

// /js/world.js — Scarlett World v12.2 (FULL CASINO BEAUTIFIED + STORE CUT-IN + ARCHES)
// ✅ Full lobby look (trim + insets + pillars + neon + posters + arches)
// ✅ Store cut-in zone + roof + display rails + underlights
// ✅ Chairs face table + correct seat anchors
// ✅ Bots init (seated)
// ✅ findPadByName for teleport pads

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const tableFocus = new THREE.Vector3(0, 0, -6.5);
  const tableY = 0.92;

  // ---------- TEXTURES ----------
  const loader = new THREE.TextureLoader();
  const tex = (p) => {
    const t = loader.load(p + (p.includes("?") ? "" : ("?v=" + v)));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const floorTex = tex("./assets/textures/scarlett_floor_tile_seamless.png");
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);

  const wallTex = tex("./assets/textures/1767279790736.jpg");
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(5, 2);

  const doorTex = tex("./assets/textures/scarlett_door.png");

  // Optional posters (safe if missing)
  let storePosterTex = null;
  let pokerPosterTex = null;
  try { storePosterTex = tex("./assets/textures/storefront.png"); } catch {}
  try { pokerPosterTex = tex("./assets/textures/pokerroom.png"); } catch {}

  // ---------- ROOM ----------
  const roomW = 30, roomD = 30, roomH = 7.0;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.name = "Floor";
  group.add(floor);

  function wall(x, z, ry, w, h) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.88, metalness: 0.0 })
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

  // Wall trim / inset frames
  function trimFrame(x, z, ry, w=7.0, h=2.8) {
    const g = new THREE.Group();
    g.position.set(x, 1.9, z);
    g.rotation.y = ry;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x0d0f16, roughness: 0.55, metalness: 0.2 })
    );
    g.add(frame);

    const inset = new THREE.Mesh(
      new THREE.PlaneGeometry(w-0.2, h-0.2),
      new THREE.MeshStandardMaterial({ color: 0x101422, roughness: 0.85, metalness: 0.05, emissive: 0x060810, emissiveIntensity: 0.25 })
    );
    inset.position.z = 0.06;
    g.add(inset);

    group.add(g);
    return g;
  }

  trimFrame(0, -roomD/2 + 0.05, 0, 10.0, 3.2);
  trimFrame(0,  roomD/2 - 0.05, Math.PI, 10.0, 3.2);
  trimFrame(-roomW/2 + 0.05, 0, Math.PI/2, 10.0, 3.2);
  trimFrame( roomW/2 - 0.05, 0, -Math.PI/2, 10.0, 3.2);

  // ---------- LIGHTS ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.45);
  scene.add(hemi);

  const ceil = new THREE.Group();
  group.add(ceil);

  function addCeilLight(x, z, color, intensity) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, roughness: 0.2 })
    );
    bulb.position.set(x, roomH - 0.45, z);
    ceil.add(bulb);

    const L = new THREE.PointLight(color, intensity, 16);
    L.position.copy(bulb.position);
    ceil.add(L);
  }

  addCeilLight(0, tableFocus.z, 0x7fe7ff, 0.95);
  addCeilLight(3.0, tableFocus.z - 1.8, 0xff2d7a, 0.75);
  addCeilLight(-3.0, tableFocus.z - 1.8, 0xff2d7a, 0.75);
  addCeilLight(0, tableFocus.z + 2.6, 0xffffff, 0.8);

  // Ceiling neon ring
  const neonRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.2, 0.04, 10, 200),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.75, roughness: 0.2 })
  );
  neonRing.position.set(0, roomH - 0.65, tableFocus.z);
  neonRing.rotation.x = Math.PI/2;
  group.add(neonRing);

  // ---------- TABLE ----------
  function feltTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0a3a2c";
    ctx.fillRect(0,0,1024,1024);

    for (let i = 0; i < 1300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
    }

    // Outer border
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(512, 512, 452, 332, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Neon pass line
    ctx.strokeStyle = "rgba(127,231,255,0.95)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(512, 512, 372, 272, 0, 0, Math.PI * 2);
    ctx.stroke();

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

  // 6-max oval vibe (slightly stretched top)
  const topGeo = new THREE.CylinderGeometry(2.05, 2.35, 0.18, 64);
  topGeo.scale(1.15, 1.0, 0.92);

  const tableTop = new THREE.Mesh(
    topGeo,
    new THREE.MeshStandardMaterial({ map: feltTexture(), roughness: 0.88, metalness: 0.05 })
  );
  tableTop.position.set(tableFocus.x, tableY, tableFocus.z);
  group.add(tableTop);

  // Trim ring
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(2.55, 0.09, 12, 120),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.5, metalness: 0.25, emissive: 0x07080c, emissiveIntensity: 0.35 })
  );
  trim.position.set(tableFocus.x, tableY + 0.01, tableFocus.z);
  trim.rotation.x = Math.PI/2;
  group.add(trim);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.60, 0.95, 1.2, 28),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.55, metalness: 0.22 })
  );
  tableBase.position.set(tableFocus.x, tableY - 0.70, tableFocus.z);
  group.add(tableBase);

  // ---------- RAIL ----------
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(4.05, 0.11, 12, 100),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.45, metalness: 0.25, emissive: 0x101020, emissiveIntensity: 0.25 })
  );
  rail.position.set(tableFocus.x, 0.95, tableFocus.z);
  rail.rotation.x = Math.PI / 2;
  group.add(rail);

  const railGlow = new THREE.Mesh(
    new THREE.TorusGeometry(4.05, 0.03, 10, 140),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.55, roughness: 0.2 })
  );
  railGlow.position.copy(rail.position);
  railGlow.rotation.copy(rail.rotation);
  group.add(railGlow);

  // ---------- PILLARS + PLANTS ----------
  function pillar(x, z) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.30, 4.2, 18),
      new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.55, metalness: 0.25 })
    );
    p.position.set(x, 2.1, z);
    group.add(p);
  }
  pillar(-roomW/2 + 2.2, tableFocus.z - 7);
  pillar(roomW/2 - 2.2, tableFocus.z - 7);
  pillar(-roomW/2 + 2.2, tableFocus.z + 7);
  pillar(roomW/2 - 2.2, tableFocus.z + 7);

  function plant(x, z) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.34, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.7, metalness: 0.05 })
    );
    pot.position.set(x, 0.17, z);
    group.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0x2f7a4e, roughness: 0.9, emissive: 0x102010, emissiveIntensity: 0.18 })
    );
    leaves.position.set(x, 0.78, z);
    group.add(leaves);
  }
  plant(-roomW/2 + 2.9, tableFocus.z);
  plant(roomW/2 - 2.9, tableFocus.z);

  // ---------- ARCH TELEPORTER (decor) ----------
  // Aesthetic arch (your “arched teleporter” vibe), safe and lightweight
  const arch = new THREE.Group();
  arch.position.set(0, 0, 1.8);

  const archRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.07, 12, 120),
    new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.45, metalness: 0.25, emissive: 0x7fe7ff, emissiveIntensity: 0.22 })
  );
  archRing.position.set(0, 1.55, 0);
  archRing.rotation.y = Math.PI/2;
  arch.add(archRing);

  const archGlow = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.03, 10, 160),
    new THREE.MeshStandardMaterial({ color: 0xb200ff, emissive: 0xb200ff, emissiveIntensity: 0.65, roughness: 0.2 })
  );
  archGlow.position.copy(archRing.position);
  archGlow.rotation.copy(archRing.rotation);
  arch.add(archGlow);

  group.add(arch);

  // ---------- CHAIRS + SEATS ----------
  const seats = [];
  function makeChair(angle, idx) {
    const chair = new THREE.Group();
    chair.name = "Chair_" + idx;

    const r = 2.85;
    chair.position.set(
      tableFocus.x + Math.cos(angle) * r,
      0,
      tableFocus.z + Math.sin(angle) * r
    );

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
    back.position.set(0, 0.80, 0.25);
    chair.add(back);

    const anchor = new THREE.Object3D();
    anchor.name = "SeatAnchor";
    anchor.position.set(0, 0.42, -0.12);
    chair.add(anchor);

    group.add(chair);
    seats[idx] = { anchor, yaw: chair.rotation.y };
  }

  [-0.2, 0.55, 1.35, 2.25, 3.05, 3.85].forEach((a, i) => makeChair(a, i + 1));
  function getSeats() { return seats; }

  // ---------- DOORS + PADS ----------
  const padsIndex = new Map();

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

    // Neon sign above
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

    padsIndex.set(pad.name, pad);
    group.add(door);
    return { door, pad };
  }

  makeDoor("STORE", -roomW / 2 + 0.25, tableFocus.z, Math.PI / 2);
  makeDoor("POKER",  roomW / 2 - 0.25, tableFocus.z, -Math.PI / 2);

  // ---------- STORE CUT-IN (a real “walk-in” feel) ----------
  const storeRoot = new THREE.Group();
  storeRoot.name = "StoreZone";
  storeRoot.position.set(-roomW/2 + 6.2, 0, tableFocus.z + 3.2);
  group.add(storeRoot);

  // Store floor inset
  const storeFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 6.2),
    new THREE.MeshStandardMaterial({ color: 0x0d0f16, roughness: 0.95, metalness: 0.05, emissive: 0x020306, emissiveIntensity: 0.15 })
  );
  storeFloor.rotation.x = -Math.PI/2;
  storeFloor.position.set(0, 0.01, 0);
  storeRoot.add(storeFloor);

  // Store roof/canopy
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(8.6, 0.22, 6.6),
    new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.55, metalness: 0.25 })
  );
  roof.position.set(0, 3.0, 0);
  storeRoot.add(roof);

  // Under-roof lights (make mannequins glow)
  function underLight(x,z,color,intensity){
    const L = new THREE.PointLight(color, intensity, 6.5);
    L.position.set(x, 2.4, z);
    storeRoot.add(L);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 10),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 })
    );
    bulb.position.copy(L.position);
    storeRoot.add(bulb);
  }
  underLight(-2.6, -1.8, 0x7fe7ff, 1.0);
  underLight( 2.6, -1.8, 0xff2d7a, 0.95);
  underLight(-2.6,  1.8, 0xffcc00, 0.85);
  underLight( 2.6,  1.8, 0x7fe7ff, 1.0);

  // Display rails (right wall + left side)
  function displayRail(x,z){
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.45, metalness: 0.25, emissive: 0xb200ff, emissiveIntensity: 0.35 })
    );
    rail.position.set(x, 1.05, z);
    storeRoot.add(rail);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.02, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.85, roughness: 0.2 })
    );
    glow.position.set(x, 1.09, z);
    storeRoot.add(glow);
  }
  displayRail(0.0, -2.7);
  displayRail(0.0,  2.7);

  // Posters on store wall (safe)
  function poster(texMap, x,y,z, ry) {
    const mat = texMap
      ? new THREE.MeshStandardMaterial({ map: texMap, roughness: 0.65, metalness: 0.05, emissive: 0x080810, emissiveIntensity: 0.25 })
      : new THREE.MeshStandardMaterial({ color: 0x101422, roughness: 0.85, metalness: 0.05, emissive: 0x080810, emissiveIntensity: 0.25 });

    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), mat);
    p.position.set(x,y,z);
    p.rotation.y = ry;
    storeRoot.add(p);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.35, 1.95, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0d0f16, roughness: 0.55, metalness: 0.2 })
    );
    frame.position.set(x,y,z - 0.05);
    frame.rotation.y = ry;
    storeRoot.add(frame);
  }
  poster(storePosterTex, 0, 1.85, -3.05, 0);

  // Store inside pad
  const storeInsidePad = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.52, 48),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.65, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  storeInsidePad.rotation.x = -Math.PI/2;
  storeInsidePad.position.set(-roomW/2 + 6.2, 0.02, tableFocus.z + 3.2);
  storeInsidePad.name = "PadStoreInside";
  group.add(storeInsidePad);
  padsIndex.set(storeInsidePad.name, storeInsidePad);

  // Poker poster
  if (pokerPosterTex) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.2),
      new THREE.MeshStandardMaterial({ map: pokerPosterTex, roughness: 0.65, metalness: 0.05, emissive: 0x080810, emissiveIntensity: 0.25 })
    );
    p.position.set(0, 2.1, roomD/2 - 0.06);
    p.rotation.y = Math.PI;
    group.add(p);
  }

  // ---------- SPAWN PAD (subtle, not a floating blue avatar) ----------
  const spawnPad = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 64),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.40, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  spawnPad.rotation.x = -Math.PI / 2;
  spawnPad.position.set(0, 0.02, 3.6);
  spawnPad.name = "SpawnPad";
  group.add(spawnPad);

  // ---------- BOTS ----------
  try {
    Bots.init({ THREE, scene, getSeats, tableFocus, metrics: { seatDrop: 0.07 } });
  } catch (e) {
    console.error(e);
    log?.("[world] bots init failed ❌ " + (e?.message || e));
  }

  // ---------- API ----------
  const api = {
    group,
    floor,
    tableFocus,
    tableY,

    spawn: new THREE.Vector3(0, 0, 3.6),
    spawnYaw: 0,

    destStore: new THREE.Vector3(-roomW/2 + 6.2, 0, tableFocus.z + 3.2),
    destPoker: new THREE.Vector3(0, 0, 3.6),

    findPadByName(name) { return padsIndex.get(name) || null; },

    connect({ playerRig, camera }) {
      api.playerRigRef = playerRig;
      api.cameraRef = camera;
    },

    tick(dt) {
      spawnPad.material.opacity = 0.35 + Math.sin(performance.now() * 0.004) * 0.10;
      railGlow.material.emissiveIntensity = 0.45 + Math.sin(performance.now() * 0.003) * 0.22;
      archGlow.material.emissiveIntensity = 0.55 + Math.sin(performance.now() * 0.003) * 0.20;
      try { Bots.update(dt); } catch {}
    }
  };

  log?.("[world] ready ✅");
  return api;
                                      }

// /js/world.js — Scarlett World v12.0 (STORE ALCOVE + POSTERS + OVAL TABLE + ACTION PADS + NO BLUE SPAWN)
// What this does:
// - Main casino room (not test box)
// - Store: recessed alcove w/ canopy roof + underlights + outer display rails + 4 mannequins
// - Poker: 6-max OVAL table w/ neon pass line + trim
// - Action pads: STORE / POKER teleport you inside (controller select)
// - Removes blue spawn ring (no visible spawn pad)
// - Safe texture loading (fallback if missing)

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  // ---------------------------------------------------------
  // CONFIG (update these filenames to match your uploads)
  // ---------------------------------------------------------
  const POSTER_STORE_URL = "./assets/textures/storefront_poster.png?v=" + v; // <-- CHANGE
  const POSTER_POKER_URL = "./assets/textures/pokerroom_poster.png?v=" + v; // <-- CHANGE

  const tableFocus = new THREE.Vector3(0, 0, -6.5);
  const tableY = 0.92;

  const roomW = 30, roomD = 30, roomH = 7.0;

  // Spawn: near front of casino, facing toward table
  const SPAWN = new THREE.Vector3(0, 0, 6.2);
  const SPAWN_YAW = 0;

  // Store alcove placement (left wall)
  const store = {
    wallX: -roomW / 2,
    z: -1.5,
    width: 8.2,
    depth: 5.6,
    height: 3.6,
    inset: 4.4,
  };

  // Poker “room” pad target (near table rail entry)
  const pokerTarget = new THREE.Vector3(0, 0, 2.9);

  // ---------------------------------------------------------
  // TEXTURES (safe loader)
  // ---------------------------------------------------------
  const loader = new THREE.TextureLoader();

  function safeTex(url, { repeatX = 1, repeatY = 1, wrap = true, srgb = true } = {}) {
    const tex = loader.load(
      url,
      () => {},
      undefined,
      () => {
        // fallback generated
        const c = document.createElement("canvas");
        c.width = 512; c.height = 512;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#1b1f2a";
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = "rgba(127,231,255,0.25)";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("MISSING", 256, 256);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); }
        return t;
      }
    );
    if (wrap) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    }
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const floorTex = safeTex("./assets/textures/scarlett_floor_tile_seamless.png?v=" + v, { repeatX: 7, repeatY: 7 });
  const wallTex = safeTex("./assets/textures/1767279790736.jpg?v=" + v, { repeatX: 6, repeatY: 2 });

  const doorTex = safeTex("./assets/textures/scarlett_door.png?v=" + v, { repeatX: 1, repeatY: 1 });

  // Posters (safe)
  const posterStoreTex = safeTex(POSTER_STORE_URL, { wrap: false });
  const posterPokerTex = safeTex(POSTER_POKER_URL, { wrap: false });

  // ---------------------------------------------------------
  // ROOM: FLOOR + WALLS
  // ---------------------------------------------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.0 })
  );
  floor.name = "Floor";
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  function wallPlane(x, z, ry, w = roomW, h = roomH) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.88, metalness: 0.0 })
    );
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
    return m;
  }

  // Main shell
  wallPlane(0, -roomD / 2, 0, roomW, roomH);
  wallPlane(0,  roomD / 2, Math.PI, roomW, roomH);
  wallPlane(-roomW / 2, 0, Math.PI / 2, roomD, roomH);
  wallPlane( roomW / 2, 0, -Math.PI / 2, roomD, roomH);

  // ---------------------------------------------------------
  // LIGHTS (global)
  // ---------------------------------------------------------
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

    const L = new THREE.PointLight(color, intensity, 18);
    L.position.copy(bulb.position);
    ceil.add(L);
  }

  addCeilLight(0, tableFocus.z, 0x7fe7ff, 0.9);
  addCeilLight(2.8, tableFocus.z - 1.5, 0xff2d7a, 0.65);
  addCeilLight(-2.8, tableFocus.z - 1.5, 0xff2d7a, 0.65);
  addCeilLight(0, tableFocus.z + 2.2, 0xffffff, 0.75);

  addCeilLight(roomW/2 - 2.5, roomD/2 - 2.5, 0x7fe7ff, 0.35);
  addCeilLight(-roomW/2 + 2.5, roomD/2 - 2.5, 0xff2d7a, 0.35);
  addCeilLight(roomW/2 - 2.5, -roomD/2 + 2.5, 0xff2d7a, 0.35);
  addCeilLight(-roomW/2 + 2.5, -roomD/2 + 2.5, 0x7fe7ff, 0.35);

  // ---------------------------------------------------------
  // DECOR: pillars + plants + extra interior shapes (not just a box)
  // ---------------------------------------------------------
  function pillar(x, z) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 4.2, 18),
      new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.55, metalness: 0.25 })
    );
    p.position.set(x, 2.1, z);
    group.add(p);
    return p;
  }

  // Corner pillars
  pillar(-roomW/2 + 1.8, tableFocus.z - 7);
  pillar(roomW/2 - 1.8, tableFocus.z - 7);
  pillar(-roomW/2 + 1.8, tableFocus.z + 7);
  pillar(roomW/2 - 1.8, tableFocus.z + 7);

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

  // Curved “interior arch trims” (simple beautification)
  function archTrim(x, z, ry) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.07, 12, 64, Math.PI),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d14,
        roughness: 0.45,
        metalness: 0.25,
        emissive: 0x111122,
        emissiveIntensity: 0.25
      })
    );
    t.position.set(x, 2.2, z);
    t.rotation.set(Math.PI / 2, ry, 0);
    group.add(t);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.018, 10, 96, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.6, roughness: 0.2 })
    );
    glow.position.copy(t.position);
    glow.rotation.copy(t.rotation);
    group.add(glow);
  }
  archTrim(0,  roomD/2 - 0.08, Math.PI);
  archTrim(0, -roomD/2 + 0.08, 0);

  // ---------------------------------------------------------
  // WALL POSTERS (store + poker room)
  // ---------------------------------------------------------
  function poster(tex, x, y, z, ry, w = 4.2, h = 2.6) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.6, metalness: 0.25 })
    );
    frame.position.set(x, y, z);
    frame.rotation.y = ry;
    group.add(frame);

    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 })
    );
    p.position.set(x, y, z + 0.05);
    p.rotation.y = ry;
    group.add(p);

    // subtle spotlight
    const s = new THREE.SpotLight(0xffffff, 0.55, 10, Math.PI / 5, 0.35, 1.2);
    s.position.set(x, y + 2.0, z + 1.4);
    s.target = p;
    group.add(s);
    group.add(s.target);
  }

  // Put posters on the far wall behind table area
  poster(posterPokerTex, 4.8, 3.2, -roomD/2 + 0.02, 0, 4.4, 2.8);
  poster(posterStoreTex, -4.8, 3.2, -roomD/2 + 0.02, 0, 4.4, 2.8);

  // ---------------------------------------------------------
  // POKER TABLE: 6-max OVAL + trim + neon pass line
  // ---------------------------------------------------------
  function feltTextureOval() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#083126";
    ctx.fillRect(0, 0, 1024, 1024);

    // subtle felt noise
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.018})`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }

    // Outer stitch ring
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(512, 512, 470, 310, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ✅ Neon pass line (embedded look)
    ctx.strokeStyle = "rgba(127,231,255,0.92)";
    ctx.lineWidth = 14;
    ctx.shadowColor = "rgba(127,231,255,0.55)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(512, 512, 395, 250, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.font = "bold 86px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCARLETT VR POKER", 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // Oval table top (scaled cylinder)
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.45, 0.18, 64),
    new THREE.MeshStandardMaterial({ map: feltTextureOval(), roughness: 0.9, metalness: 0.05 })
  );
  tableTop.name = "TableTop";
  tableTop.position.set(tableFocus.x, tableY, tableFocus.z);
  tableTop.scale.set(1.45, 1, 1.0); // ✅ makes it oval
  group.add(tableTop);

  // Trim rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.55, 0.12, 14, 90),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.4,
      metalness: 0.25,
      emissive: 0x101020,
      emissiveIntensity: 0.25
    })
  );
  rim.position.set(tableFocus.x, tableY + 0.05, tableFocus.z);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.25, 1, 0.90);
  group.add(rim);

  // Rim glow
  const rimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(3.55, 0.03, 10, 120),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.48, roughness: 0.2 })
  );
  rimGlow.position.copy(rim.position);
  rimGlow.rotation.copy(rim.rotation);
  rimGlow.scale.copy(rim.scale);
  group.add(rimGlow);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.05, 1.25, 28),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.name = "TableBase";
  tableBase.position.set(tableFocus.x, tableY - 0.72, tableFocus.z);
  group.add(tableBase);

  // Rail around seats
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(4.15, 0.10, 12, 90),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.45, metalness: 0.25, emissive: 0x101020, emissiveIntensity: 0.25 })
  );
  rail.name = "Rail";
  rail.position.set(tableFocus.x, 0.95, tableFocus.z);
  rail.rotation.x = Math.PI / 2;
  rail.scale.set(1.15, 1, 0.95);
  group.add(rail);

  const railGlow = new THREE.Mesh(
    new THREE.TorusGeometry(4.15, 0.03, 10, 120),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.52, roughness: 0.2 })
  );
  railGlow.position.copy(rail.position);
  railGlow.rotation.copy(rail.rotation);
  railGlow.scale.copy(rail.scale);
  group.add(railGlow);

  // ---------------------------------------------------------
  // CHAIRS + SEATS (6-max) - face table correctly
  // ---------------------------------------------------------
  const seats = [];
  function makeChair(angle, idx) {
    const chair = new THREE.Group();
    chair.name = "Chair_" + idx;

    // Oval radius: slightly different x/z
    const rx = 3.05;
    const rz = 2.65;

    chair.position.set(
      tableFocus.x + Math.cos(angle) * rx,
      0,
      tableFocus.z + Math.sin(angle) * rz
    );

    chair.lookAt(tableFocus.x, 0, tableFocus.z);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.10, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    seat.position.y = 0.48;
    chair.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.62, 0.10),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.65, metalness: 0.1 })
    );
    back.position.set(0, 0.80, 0.23);
    chair.add(back);

    // Seat anchor: butt on seat, feet on floor (bots.js must respect this)
    const anchor = new THREE.Object3D();
    anchor.name = "SeatAnchor";
    anchor.position.set(0, 0.42, -0.10);
    chair.add(anchor);

    group.add(chair);
    seats[idx] = { anchor, yaw: chair.rotation.y };
  }

  // 6 seats around oval
  const angles = [-0.15, 0.70, 1.60, 2.55, 3.45, 4.35];
  angles.forEach((a, i) => makeChair(a, i + 1));
  function getSeats() { return seats; }

  // ---------------------------------------------------------
  // GUARD HUMANOID (kept)
  // ---------------------------------------------------------
  function makeHumanoid(color = 0x1a1f2a, skin = 0xd2b48c) {
    const g = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.12 });
    const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 8, 16), suit);
    torso.position.y = 1.05;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skinM);
    head.position.y = 1.55;
    g.add(head);

    const armGeo = new THREE.CapsuleGeometry(0.05, 0.30, 8, 12);
    const armL = new THREE.Mesh(armGeo, suit);
    const armR = new THREE.Mesh(armGeo, suit);
    armL.position.set(-0.26, 1.15, 0);
    armR.position.set( 0.26, 1.15, 0);
    g.add(armL, armR);

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.40, 8, 12);
    const legL = new THREE.Mesh(legGeo, suit);
    const legR = new THREE.Mesh(legGeo, suit);
    legL.position.set(-0.10, 0.45, 0);
    legR.position.set( 0.10, 0.45, 0);
    g.add(legL, legR);

    return g;
  }

  const guard = makeHumanoid(0x121826, 0xd2b48c);
  guard.name = "GuardNPC";
  guard.position.set(tableFocus.x + 6.4, 0, tableFocus.z + 4.3);
  guard.lookAt(tableFocus.x, 1.0, tableFocus.z);
  group.add(guard);

  // ---------------------------------------------------------
  // DOORS + ACTION PADS (teleport)
  // ---------------------------------------------------------
  const actionPads = new Map(); // name -> { padMesh, targetPos, targetYaw }

  function makeDoor(signText, x, z, yaw, padName, targetPos, targetYaw) {
    const door = new THREE.Group();
    door.name = "Door_" + signText;
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

    // pad
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.52, 48),
      new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        emissive: 0xff2d7a,
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.02, 1.25);
    pad.name = padName;
    door.add(pad);

    group.add(door);

    actionPads.set(padName, { padMesh: pad, targetPos, targetYaw });
    return { door, pad };
  }

  // Store pad target inside store
  const storeTarget = new THREE.Vector3(store.wallX + store.inset - 2.2, 0, store.z);

  // Doors on left and right like before
  makeDoor("STORE", -roomW / 2 + 0.25, tableFocus.z, Math.PI / 2, "PadStore", storeTarget, Math.PI / 2);
  makeDoor("POKER",  roomW / 2 - 0.25, tableFocus.z, -Math.PI / 2, "PadPoker", pokerTarget, 0);

  // ---------------------------------------------------------
  // STORE ALCOVE (recessed interior + canopy roof + rails + mannequins)
  // ---------------------------------------------------------
  const storeRoot = new THREE.Group();
  storeRoot.name = "StoreAlcove";
  group.add(storeRoot);

  // Floor (store)
  const storeFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(store.width, store.depth),
    new THREE.MeshStandardMaterial({
      color: 0x0a0d14,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x000000
    })
  );
  storeFloor.rotation.x = -Math.PI / 2;
  storeFloor.position.set(store.wallX + store.inset - store.width/2, 0.01, store.z);
  storeRoot.add(storeFloor);

  // Walls (store box inserted into wall)
  const storeWallMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.7, metalness: 0.15 });

  function storeWall(w, h, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), storeWallMat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    storeRoot.add(m);
    return m;
  }

  const sx0 = store.wallX + store.inset - store.width/2;
  const sz0 = store.z;

  // back wall
  storeWall(store.width, store.height, sx0, store.height/2, sz0 - store.depth/2, 0);
  // right inner wall
  storeWall(store.depth, store.height, sx0 + store.width/2, store.height/2, sz0, -Math.PI/2);
  // left inner wall
  storeWall(store.depth, store.height, sx0 - store.width/2, store.height/2, sz0, Math.PI/2);

  // Canopy roof (outside display roof)
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(store.width + 0.8, 0.18, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.55, metalness: 0.2, emissive: 0x05060a, emissiveIntensity: 0.2 })
  );
  canopy.position.set(sx0, store.height + 0.15, sz0 + store.depth/2 - 1.2);
  storeRoot.add(canopy);

  // Underlights (make mannequins glow nicely)
  function underLight(x, z, color, intensity) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.04, 0.12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.25 })
    );
    strip.position.set(x, store.height + 0.05, z);
    storeRoot.add(strip);

    const L = new THREE.SpotLight(color, intensity, 10, Math.PI/3.2, 0.45, 1.1);
    L.position.set(x, store.height + 0.08, z);
    L.target.position.set(x, 1.2, z);
    storeRoot.add(L);
    storeRoot.add(L.target);
  }

  underLight(sx0 - 2.2, sz0 + store.depth/2 - 2.0, 0x7fe7ff, 1.15);
  underLight(sx0 + 0.0, sz0 + store.depth/2 - 2.0, 0xff2d7a, 1.0);
  underLight(sx0 + 2.2, sz0 + store.depth/2 - 2.0, 0x7fe7ff, 1.15);

  // Outer display rails (glowing)
  function glowingRail(cx, cz) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.14, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.55, metalness: 0.25 })
    );
    base.position.set(cx, 0.12, cz);
    storeRoot.add(base);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.03, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.65, transparent: true, opacity: 0.85 })
    );
    glow.position.set(cx, 0.22, cz);
    storeRoot.add(glow);
  }

  const displayZ = sz0 + store.depth/2 - 1.05;
  glowingRail(sx0 - 2.3, displayZ);
  glowingRail(sx0 + 2.3, displayZ);

  // Mannequin low-poly (safe default, no textures required)
  function makeMannequin({ color = 0x121826, glow = 0x7fe7ff } = {}) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: glow,
      emissiveIntensity: 0.12
    });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 8, 12), mat);
    torso.position.y = 1.05; g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mat);
    head.position.y = 1.55; g.add(head);

    const armGeo = new THREE.CapsuleGeometry(0.05, 0.32, 8, 12);
    const armL = new THREE.Mesh(armGeo, mat);
    const armR = new THREE.Mesh(armGeo, mat);
    armL.position.set(-0.25, 1.15, 0); armR.position.set(0.25, 1.15, 0);
    g.add(armL, armR);

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.42, 8, 12);
    const legL = new THREE.Mesh(legGeo, mat);
    const legR = new THREE.Mesh(legGeo, mat);
    legL.position.set(-0.10, 0.45, 0); legR.position.set(0.10, 0.45, 0);
    g.add(legL, legR);

    g.userData.setGlow = (k) => { mat.emissiveIntensity = k; };
    return g;
  }

  // 4 mannequins outside store (you asked)
  const mannequins = [];
  const mZ = displayZ;
  const mx = [sx0 - 3.0, sx0 - 1.6, sx0 + 1.6, sx0 + 3.0];
  for (let i = 0; i < 4; i++) {
    const m = makeMannequin({ glow: (i % 2 === 0) ? 0x7fe7ff : 0xff2d7a });
    m.name = "StoreMannequin_" + (i + 1);
    m.position.set(mx[i], 0, mZ);
    m.lookAt(sx0, 1.2, mZ - 1.2);
    storeRoot.add(m);
    mannequins.push(m);
  }

  // ---------------------------------------------------------
  // BOTS INIT (seated)
  // NOTE: bots.js must handle “hands on table” / proper sitting pose.
  // We pass seatY and tableY; bots.js should use these.
  // ---------------------------------------------------------
  try {
    Bots.init({
      THREE,
      scene,
      getSeats,
      tableFocus,
      metrics: {
        tableY,
        seatY: 0.42,
        // helpful if bots.js supports:
        footY: 0.0,
        handTableY: tableY + 0.07
      },
      // requested: fewer wanderers
      config: { walkingBots: 0 } // if bots.js ignores, it’s safe.
    });
  } catch (e) {
    console.error(e);
    log?.("[world] bots init failed ❌ " + (e?.message || e));
  }

  // ---------------------------------------------------------
  // ACTION PAD TELEPORT (controller select)
  // ---------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();
  const tmpDir = new THREE.Vector3();

  function tryPadTeleport(fromObject, playerRig) {
    if (!fromObject || !playerRig) return false;

    tmpMat.identity().extractRotation(fromObject.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMat).normalize();

    const origin = new THREE.Vector3();
    fromObject.getWorldPosition(origin);

    raycaster.set(origin, tmpDir);
    raycaster.far = 12;

    const padMeshes = [];
    for (const v of actionPads.values()) padMeshes.push(v.padMesh);

    const hits = raycaster.intersectObjects(padMeshes, true);
    if (!hits.length) return false;

    const hit = hits[0].object;
    const entry = actionPads.get(hit.name);
    if (!entry) return false;

    playerRig.position.set(entry.targetPos.x, 0, entry.targetPos.z);
    playerRig.rotation.set(0, entry.targetYaw || 0, 0);
    return true;
  }

  // ---------------------------------------------------------
  // API
  // ---------------------------------------------------------
  log?.("[world] ready ✅");

  const api = {
    group,
    floor,
    tableFocus,
    tableY,
    spawn: SPAWN.clone(),
    spawnYaw: SPAWN_YAW,
    getSeats,

    connect({ playerRig, camera, controllers, renderer }) {
      api.playerRigRef = playerRig;
      api.cameraRef = camera;

      // Controller select -> pad teleport
      // Works immediately on Quest controllers.
      if (controllers?.length) {
        for (const c of controllers) {
          c.addEventListener?.("selectstart", () => {
            const ok = tryPadTeleport(c, playerRig);
            if (ok) log?.("[world] pad teleport ✅");
          });
        }
      }

      try { Bots.setPlayerRig(playerRig, camera); } catch {}
    },

    tick(dt) {
      // glow pulses
      const t = performance.now() * 0.001;
      railGlow.material.emissiveIntensity = 0.40 + Math.sin(t * 2.2) * 0.20;
      rimGlow.material.emissiveIntensity = 0.35 + Math.sin(t * 1.9) * 0.22;

      // mannequin glow (nice showroom effect)
      for (let i = 0; i < mannequins.length; i++) {
        const m = mannequins[i];
        const k = 0.10 + (Math.sin(t * 2.6 + i) * 0.06 + 0.06);
        m.userData.setGlow?.(k);
      }

      try { Bots.update(dt); } catch (e) { console.error(e); }
    }
  };

  return api;
                          }

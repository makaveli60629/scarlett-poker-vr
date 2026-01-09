// /js/world.js — Scarlett World v12.5 (FULL UPGRADE + STORE + OVAL TABLE + DISPLAYS)
// Goals hit:
// ✅ Full lobby/casino room (not just store)
// ✅ 6-max OVAL poker table w/ trim + improved lines + neon pass line
// ✅ Chairs face table + good SeatAnchor (bots sit correctly)
// ✅ Store embedded into wall (walk-in bay) + outside displays + 4 mannequins
// ✅ Roof/awning + underlights so mannequins glow
// ✅ Teleport pads: STORE -> inside store, POKER -> table spawn
// ✅ Safe texture loading + poster walls (fallback if images missing)
// ✅ No "blue spawn thing" created in world

import { Bots } from "./bots.js";

export async function initWorld({ THREE, scene, log, v } = {}) {
  const group = new THREE.Group();
  group.name = "WorldRoot";
  scene.add(group);

  const BOOT_V = v || Date.now().toString();

  // ---------------------------
  // WORLD CONSTANTS / LAYOUT
  // ---------------------------
  const roomW = 34;
  const roomD = 30;
  const roomH = 7.0;

  const tableFocus = new THREE.Vector3(0, 0, -6.5);
  const tableY = 0.92;

  // Store bay is recessed into right wall (positive X wall)
  const storeBay = {
    // wall at x = +roomW/2
    wallX: roomW / 2,
    bayDepth: 4.8,      // pushes inward (toward -X)
    bayWidth: 8.6,
    bayHeight: 4.2,
    // center of bay opening along Z
    centerZ: tableFocus.z + 2.5,
    floorY: 0,
  };

  // Player spawn locations (no blue mesh)
  const spawn = new THREE.Vector3(0, 0, 3.6);
  const spawnYaw = 0;

  const storeSpawn = new THREE.Vector3(storeBay.wallX - storeBay.bayDepth + 1.6, 0, storeBay.centerZ);
  const storeSpawnYaw = Math.PI; // face outward toward room

  // ---------------------------
  // TEXTURE LOADING (SAFE)
  // ---------------------------
  const loader = new THREE.TextureLoader();

  function safeLoadTexture(url, fallbackColor = 0x222233) {
    return new Promise((resolve) => {
      try {
        loader.load(
          url,
          (tex) => {
            try {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            } catch {}
            resolve({ tex, ok: true });
          },
          undefined,
          () => {
            resolve({ tex: null, ok: false, fallbackColor });
          }
        );
      } catch {
        resolve({ tex: null, ok: false, fallbackColor });
      }
    });
  }

  // Floor + walls textures you already used earlier
  const floorURL = `./assets/textures/scarlett_floor_tile_seamless.png?v=${BOOT_V}`;
  const wallURL  = `./assets/textures/1767279790736.jpg?v=${BOOT_V}`;

  // Door PNG you referenced earlier (safe if missing)
  const doorURL  = `./assets/textures/scarlett_door.png?v=${BOOT_V}`;

  // Optional posters you requested (put your actual filenames here if you have them)
  // If they don't exist, we draw neon posters instead.
  const posterStoreURL = `./assets/textures/storefront_poster.png?v=${BOOT_V}`;
  const posterPokerURL = `./assets/textures/pokerroom_poster.png?v=${BOOT_V}`;

  const [floorRes, wallRes, doorRes, storePosterRes, pokerPosterRes] = await Promise.all([
    safeLoadTexture(floorURL, 0x14151c),
    safeLoadTexture(wallURL, 0x14151c),
    safeLoadTexture(doorURL, 0x111318),
    safeLoadTexture(posterStoreURL, 0x111318),
    safeLoadTexture(posterPokerURL, 0x111318),
  ]);

  function makeStandardMat({ map, color = 0xffffff, roughness = 0.9, metalness = 0.0 } = {}) {
    return new THREE.MeshStandardMaterial({
      map: map || null,
      color: map ? 0xffffff : color,
      roughness,
      metalness
    });
  }

  // ---------------------------
  // FLOOR
  // ---------------------------
  const floorMat = floorRes.tex
    ? makeStandardMat({ map: floorRes.tex, roughness: 0.92, metalness: 0.0 })
    : makeStandardMat({ color: floorRes.fallbackColor, roughness: 0.95, metalness: 0.0 });

  if (floorRes.tex) {
    floorRes.tex.repeat.set(7, 7);
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
  floor.name = "Floor";
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  group.add(floor);

  // ---------------------------
  // WALLS (4)
  // ---------------------------
  const wallMat = wallRes.tex
    ? makeStandardMat({ map: wallRes.tex, roughness: 0.88, metalness: 0.0 })
    : makeStandardMat({ color: wallRes.fallbackColor, roughness: 0.92, metalness: 0.0 });

  if (wallRes.tex) {
    wallRes.tex.repeat.set(6, 2);
  }

  function addWallPlane(x, z, ry, w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    m.receiveShadow = false;
    group.add(m);
    return m;
  }

  // Back wall (negative Z), front wall (positive Z), left wall (negative X), right wall (positive X)
  addWallPlane(0, -roomD / 2, 0, roomW, roomH);
  addWallPlane(0,  roomD / 2, Math.PI, roomW, roomH);
  addWallPlane(-roomW / 2, 0, Math.PI / 2, roomD, roomH);
  addWallPlane( roomW / 2, 0, -Math.PI / 2, roomD, roomH);

  // ---------------------------
  // LIGHTS / AMBIENCE
  // ---------------------------
  const ceil = new THREE.Group();
  ceil.name = "CeilingLights";
  group.add(ceil);

  function addCeilLight(x, z, color, intensity) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, roughness: 0.2 })
    );
    bulb.position.set(x, roomH - 0.4, z);
    ceil.add(bulb);

    const L = new THREE.PointLight(color, intensity, 18);
    L.position.copy(bulb.position);
    ceil.add(L);
  }

  // Main table mood
  addCeilLight(0, tableFocus.z, 0x7fe7ff, 0.95);
  addCeilLight(2.9, tableFocus.z - 1.5, 0xff2d7a, 0.75);
  addCeilLight(-2.9, tableFocus.z - 1.5, 0xff2d7a, 0.75);
  addCeilLight(0, tableFocus.z + 2.3, 0xffffff, 0.85);

  // Corners
  addCeilLight(roomW/2 - 2.6, roomD/2 - 2.6, 0x7fe7ff, 0.35);
  addCeilLight(-roomW/2 + 2.6, roomD/2 - 2.6, 0xff2d7a, 0.35);
  addCeilLight(roomW/2 - 2.6, -roomD/2 + 2.6, 0xff2d7a, 0.35);
  addCeilLight(-roomW/2 + 2.6, -roomD/2 + 2.6, 0x7fe7ff, 0.35);

  // Store bay emphasis
  addCeilLight(storeBay.wallX - storeBay.bayDepth + 2.0, storeBay.centerZ, 0x7fe7ff, 0.55);

  // ---------------------------
  // DECOR: PILLARS + PLANTS + TRIM
  // ---------------------------
  function pillar(x, z) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 4.1, 18),
      new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.55, metalness: 0.25 })
    );
    p.position.set(x, 2.05, z);
    group.add(p);
    return p;
  }

  // 4 corners pillars
  pillar(-roomW/2 + 2.0, tableFocus.z - 7.0);
  pillar( roomW/2 - 2.0, tableFocus.z - 7.0);
  pillar(-roomW/2 + 2.0, tableFocus.z + 7.0);
  pillar( roomW/2 - 2.0, tableFocus.z + 7.0);

  // Extra pillar to match your "other side" request near store display zone
  pillar(storeBay.wallX - 5.4, storeBay.centerZ - 4.2);
  pillar(storeBay.wallX - 5.4, storeBay.centerZ + 4.2);

  function plant(x, z) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.34, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.7, metalness: 0.05 })
    );
    pot.position.set(x, 0.17, z);
    group.add(pot);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 18, 14),
      new THREE.MeshStandardMaterial({
        color: 0x2f7a4e, roughness: 0.9, metalness: 0.0,
        emissive: 0x102010, emissiveIntensity: 0.18
      })
    );
    leaves.position.set(x, 0.80, z);
    group.add(leaves);
  }
  plant(-roomW/2 + 3.0, tableFocus.z);
  plant(roomW/2 - 3.0, tableFocus.z);

  // ---------------------------
  // POSTERS ON WALL (store & poker)
  // ---------------------------
  function makeNeonPosterTexture(text, color = "#7fe7ff") {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);

    // background
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0,0,c.width,c.height);

    // neon border
    ctx.strokeStyle = color;
    ctx.lineWidth = 16;
    ctx.strokeRect(20, 20, c.width-40, c.height-40);

    ctx.font = "bold 110px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 28;
    ctx.fillText(text, c.width/2, c.height/2);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function addPoster({ x, z, ry, w=5.6, h=2.8, tex, label }) {
    const t = tex || makeNeonPosterTexture(label, "#ff2d7a");
    const m = new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x111111,
      emissiveIntensity: 0.25,
      transparent: true
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, 2.9, z);
    p.rotation.y = ry;
    group.add(p);
    return p;
  }

  // Put posters on back wall
  addPoster({
    x: -6.5,
    z: -roomD/2 + 0.06,
    ry: 0,
    tex: pokerPosterRes.ok ? pokerPosterRes.tex : null,
    label: "POKER ROOM"
  });
  addPoster({
    x: 6.5,
    z: -roomD/2 + 0.06,
    ry: 0,
    tex: storePosterRes.ok ? storePosterRes.tex : null,
    label: "SCARLETT STORE"
  });

  // ---------------------------
  // TELEPORT MACHINE (ARCH STYLE)
  // ---------------------------
  function makeTeleportArch(x, z) {
    const arch = new THREE.Group();
    arch.position.set(x, 0, z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.22, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.55, metalness: 0.22 })
    );
    base.position.y = 0.11;
    arch.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.07, 16, 64),
      new THREE.MeshStandardMaterial({
        color: 0x10131c,
        roughness: 0.35,
        metalness: 0.30,
        emissive: 0x7fe7ff,
        emissiveIntensity: 0.65
      })
    );
    ring.position.y = 1.35;
    ring.rotation.x = Math.PI / 2;
    arch.add(ring);

    const legsMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.55, metalness: 0.22 });
    const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.55, 12), legsMat);
    const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.55, 12), legsMat);
    legA.position.set(-0.55, 0.82, 0);
    legB.position.set( 0.55, 0.82, 0);
    arch.add(legA, legB);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.02, 12, 90),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.85 })
    );
    glow.position.copy(ring.position);
    glow.rotation.copy(ring.rotation);
    arch.add(glow);

    group.add(arch);
    return arch;
  }

  const teleArch = makeTeleportArch(0, 3.6);

  // ---------------------------
  // POKER TABLE (6-MAX OVAL)
  // ---------------------------
  function feltTextureOval() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#083627";
    ctx.fillRect(0,0,1024,1024);

    // cloth speckle
    for (let i=0;i<1600;i++){
      ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.02})`;
      ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
    }

    // outer line
    ctx.strokeStyle = "rgba(255,255,255,0.90)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(512, 520, 465, 300, 0, 0, Math.PI*2);
    ctx.stroke();

    // pass line neon aqua embedded
    ctx.strokeStyle = "rgba(127,231,255,0.92)";
    ctx.shadowColor = "rgba(127,231,255,0.85)";
    ctx.shadowBlur = 18;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(512, 520, 395, 250, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // inner guide
    ctx.strokeStyle = "rgba(255,45,122,0.25)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(512, 520, 325, 208, 0, 0, Math.PI*2);
    ctx.stroke();

    // title
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.font = "bold 92px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCARLETT VR POKER", 512, 520);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // Oval top using cylinder with scaling (simple, stable)
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.10, 2.35, 0.18, 72),
    new THREE.MeshStandardMaterial({ map: feltTextureOval(), roughness: 0.88, metalness: 0.05 })
  );
  tableTop.name = "TableTop";
  tableTop.position.set(tableFocus.x, tableY, tableFocus.z);
  tableTop.scale.set(1.35, 1.0, 1.00); // make it oval
  group.add(tableTop);

  // dark trim ring (edge)
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(2.32, 0.11, 14, 96),
    new THREE.MeshStandardMaterial({
      color: 0x090b10,
      roughness: 0.35,
      metalness: 0.25,
      emissive: 0x101020,
      emissiveIntensity: 0.22
    })
  );
  trim.name = "TableTrim";
  trim.position.set(tableFocus.x, tableY + 0.02, tableFocus.z);
  trim.rotation.x = Math.PI / 2;
  trim.scale.set(1.35, 1.0, 1.00);
  group.add(trim);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.05, 1.25, 28),
    new THREE.MeshStandardMaterial({ color: 0x121826, roughness: 0.6, metalness: 0.2 })
  );
  tableBase.name = "TableBase";
  tableBase.position.set(tableFocus.x, tableY - 0.72, tableFocus.z);
  group.add(tableBase);

  // Rail around table
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(4.00, 0.11, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 0.45,
      metalness: 0.25,
      emissive: 0x101020,
      emissiveIntensity: 0.25
    })
  );
  rail.name = "Rail";
  rail.position.set(tableFocus.x, 0.95, tableFocus.z);
  rail.rotation.x = Math.PI / 2;
  rail.scale.set(1.10, 1.0, 0.95); // slightly oval
  group.add(rail);

  const railGlow = new THREE.Mesh(
    new THREE.TorusGeometry(4.00, 0.03, 10, 120),
    new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.0 })
  );
  railGlow.position.copy(rail.position);
  railGlow.rotation.copy(rail.rotation);
  railGlow.scale.copy(rail.scale);
  group.add(railGlow);

  // ---------------------------
  // CHAIRS + SEAT ANCHORS (6)
  // ---------------------------
  const seats = [];
  function makeChair(angle, idx) {
    const chair = new THREE.Group();
    chair.name = "Chair_" + idx;

    // oval-ish chair ring around table
    const rX = 3.0;
    const rZ = 2.5;

    chair.position.set(
      tableFocus.x + Math.cos(angle) * rX,
      0,
      tableFocus.z + Math.sin(angle) * rZ
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
    back.position.set(0, 0.80, 0.24);
    chair.add(back);

    // Seat anchor: slight toward table
    const anchor = new THREE.Object3D();
    anchor.name = "SeatAnchor";
    anchor.position.set(0, 0.42, -0.12);
    chair.add(anchor);

    group.add(chair);
    seats[idx] = { anchor, yaw: chair.rotation.y };
  }

  // 6-max angles around oval
  const angles = [-0.25, 0.55, 1.45, 2.35, 3.15, 3.95];
  angles.forEach((a, i) => makeChair(a, i + 1));

  function getSeats() { return seats; }

  // ---------------------------
  // GUARD / NPC (simple humanoid)
  // ---------------------------
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
  guard.position.set(tableFocus.x - 2.8, 0, tableFocus.z + 5.0);
  guard.lookAt(tableFocus.x, 1.0, tableFocus.z);
  group.add(guard);

  // ---------------------------
  // STORE BAY (recessed into right wall)
  // ---------------------------
  const store = new THREE.Group();
  store.name = "StoreBay";
  group.add(store);

  const bayX0 = storeBay.wallX;                   // wall plane X
  const bayX1 = storeBay.wallX - storeBay.bayDepth; // inside bay back wall X
  const bayZ0 = storeBay.centerZ - storeBay.bayWidth/2;
  const bayZ1 = storeBay.centerZ + storeBay.bayWidth/2;

  const storeFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(storeBay.bayDepth, storeBay.bayWidth),
    new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.85, metalness: 0.15, emissive: 0x04040a, emissiveIntensity: 0.2 })
  );
  storeFloor.rotation.x = -Math.PI/2;
  storeFloor.position.set((bayX0+bayX1)/2, 0.01, storeBay.centerZ);
  store.add(storeFloor);

  // Store bay side walls
  function storeWall(w, h, x, z, ry) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.75, metalness: 0.22 })
    );
    m.position.set(x, h/2, z);
    m.rotation.y = ry;
    store.add(m);
    return m;
  }
  // back wall (inside)
  storeWall(storeBay.bayWidth, storeBay.bayHeight, bayX1 + 0.02, storeBay.centerZ, Math.PI/2);
  // left/right walls inside bay
  storeWall(storeBay.bayDepth, storeBay.bayHeight, (bayX0+bayX1)/2, bayZ0 + 0.02, Math.PI);
  storeWall(storeBay.bayDepth, storeBay.bayHeight, (bayX0+bayX1)/2, bayZ1 - 0.02, 0);

  // Store roof / awning
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(storeBay.bayDepth, 0.18, storeBay.bayWidth),
    new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 0.55, metalness: 0.25 })
  );
  roof.position.set((bayX0+bayX1)/2, storeBay.bayHeight + 0.10, storeBay.centerZ);
  store.add(roof);

  // Under-lights for mannequins/glow
  function underLight(z, color=0x7fe7ff) {
    const L = new THREE.PointLight(color, 0.55, 8.5);
    L.position.set(bayX0 - 1.2, 3.6, z);
    store.add(L);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 10),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0 })
    );
    bulb.position.copy(L.position);
    store.add(bulb);
  }
  underLight(storeBay.centerZ - 2.2, 0x7fe7ff);
  underLight(storeBay.centerZ + 2.2, 0xff2d7a);

  // ---------------------------
  // STORE DOOR PANEL (transparent PNG)
  // ---------------------------
  const doorTex = doorRes.ok ? doorRes.tex : null;

  function makeDoorPanel() {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 3.3, 0.20),
      new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.45, metalness: 0.25 })
    );

    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: doorTex || null,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x111111,
      emissiveIntensity: 0.25
    });

    if (!doorTex) {
      // fallback: simple emissive glass look
      panelMat.map = null;
      panelMat.color.setHex(0x141923);
      panelMat.emissive.setHex(0x7fe7ff);
      panelMat.emissiveIntensity = 0.25;
      panelMat.opacity = 0.9;
      panelMat.transparent = true;
    }

    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 3.05), panelMat);
    panel.position.set(0, 0, 0.11);

    const g = new THREE.Group();
    frame.position.set(0, 1.65, 0);
    panel.position.y = 1.60;
    g.add(frame);
    g.add(panel);
    return g;
  }

  // Store opening position on right wall
  const storeDoor = makeDoorPanel();
  storeDoor.name = "StoreDoor";
  storeDoor.position.set(storeBay.wallX - 0.10, 0, storeBay.centerZ);
  storeDoor.rotation.y = -Math.PI/2;
  group.add(storeDoor);

  // Poker door on left wall (kept for symmetry)
  const pokerDoor = makeDoorPanel();
  pokerDoor.name = "PokerDoor";
  pokerDoor.position.set(-roomW/2 + 0.10, 0, tableFocus.z);
  pokerDoor.rotation.y = Math.PI/2;
  group.add(pokerDoor);

  // ---------------------------
  // TELEPORT PADS (STORE / POKER)
  // ---------------------------
  function makePad(name, x, z, color) {
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.58, 52),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.70,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.02, z);
    pad.name = name;
    group.add(pad);

    // invisible click collider slightly taller
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.60, 0.60, 0.25, 18),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    col.position.set(x, 0.12, z);
    col.name = name + "_Collider";
    group.add(col);

    return { pad, collider: col };
  }

  // Outside store pad (teleports inside)
  const padStore = makePad("PadStore", storeBay.wallX - 1.3, storeBay.centerZ, 0xff2d7a);
  // Poker pad (teleports to main spawn near table)
  const padPoker = makePad("PadPoker", -roomW/2 + 1.3, tableFocus.z, 0x7fe7ff);

  // ---------------------------
  // STORE OUTSIDE DISPLAYS (2 rails + 4 mannequins)
  // ---------------------------
  function makeGlowRail(x, z, w=2.8, d=1.0) {
    const railG = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.10, d),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.55, metalness: 0.25 })
    );
    base.position.y = 0.75;
    railG.add(base);

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, d),
      new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 0.85, transparent: true, opacity: 0.70 })
    );
    glow.position.y = 0.83;
    railG.add(glow);

    const light = new THREE.PointLight(0x7fe7ff, 0.65, 6.5);
    light.position.set(0, 1.25, 0);
    railG.add(light);

    railG.position.set(x, 0, z);
    group.add(railG);
    return railG;
  }

  function makeMannequin(x, z, color=0x8aa0b8) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 8, 14), mat);
    torso.position.y = 1.00; g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), mat);
    head.position.y = 1.45; g.add(head);

    const armGeo = new THREE.CapsuleGeometry(0.05, 0.30, 8, 10);
    const armL = new THREE.Mesh(armGeo, mat);
    const armR = new THREE.Mesh(armGeo, mat);
    armL.position.set(-0.24, 1.10, 0); armR.position.set(0.24, 1.10, 0);
    g.add(armL, armR);

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.45, 8, 10);
    const legL = new THREE.Mesh(legGeo, mat);
    const legR = new THREE.Mesh(legGeo, mat);
    legL.position.set(-0.10, 0.38, 0);
    legR.position.set( 0.10, 0.38, 0);
    g.add(legL, legR);

    // small pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.10, 16),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.6, metalness: 0.2, emissive: 0x101020, emissiveIntensity: 0.22 })
    );
    ped.position.y = 0.05;
    g.add(ped);

    g.position.set(x, 0, z);
    group.add(g);
    return g;
  }

  // Two display rails outside store door, spaced along Z
  const displayA = makeGlowRail(storeBay.wallX - 3.8, storeBay.centerZ - 3.8, 3.2, 1.2);
  const displayB = makeGlowRail(storeBay.wallX - 3.8, storeBay.centerZ + 3.8, 3.2, 1.2);

  // Four mannequins (2 by each display)
  makeMannequin(storeBay.wallX - 3.8, storeBay.centerZ - 3.2, 0x8aa0b8);
  makeMannequin(storeBay.wallX - 3.8, storeBay.centerZ - 4.4, 0x8aa0b8);
  makeMannequin(storeBay.wallX - 3.8, storeBay.centerZ + 3.2, 0x8aa0b8);
  makeMannequin(storeBay.wallX - 3.8, storeBay.centerZ + 4.4, 0x8aa0b8);

  // ---------------------------
  // BOTS INIT (seats 1..6)
  // ---------------------------
  try {
    Bots.init({
      THREE,
      scene,
      getSeats,
      tableFocus,
      metrics: { seatDrop: 0.075 },
      v: BOOT_V,
      log
    });
  } catch (e) {
    console.error(e);
    log?.("[world] bots init failed ❌ " + (e?.message || e));
  }

  log?.("[world] ready ✅ v12.5");

  // ---------------------------
  // API for main.js / controls / teleport
  // ---------------------------
  const api = {
    group,
    floor,
    tableFocus,
    tableY,

    spawn: spawn.clone(),
    spawnYaw,

    storeSpawn: storeSpawn.clone(),
    storeSpawnYaw,

    getSeats,

    // Teleport targets keyed by pad name
    teleportTargets: {
      PadStore: { pos: storeSpawn.clone(), yaw: storeSpawnYaw },
      PadPoker: { pos: spawn.clone(), yaw: spawnYaw }
    },

    connect({ playerRig, camera }) {
      api.playerRigRef = playerRig;
      api.cameraRef = camera;
    },

    tick(dt) {
      // pulse glow
      const t = performance.now() * 0.004;
      railGlow.material.emissiveIntensity = 0.45 + Math.sin(t * 1.2) * 0.18;

      // pads pulse
      padStore.pad.material.opacity = 0.70 + Math.sin(t * 1.6) * 0.15;
      padPoker.pad.material.opacity = 0.70 + Math.sin(t * 1.4 + 1.0) * 0.15;

      // arch glow
      try {
        const ring = teleArch.children.find(x => x.geometry && x.geometry.type === "TorusGeometry");
        if (ring?.material) ring.material.emissiveIntensity = 0.55 + Math.sin(t * 1.8) * 0.22;
      } catch {}

      try { Bots.update(dt); } catch (e) { console.error(e); }
    }
  };

  return api;
      }

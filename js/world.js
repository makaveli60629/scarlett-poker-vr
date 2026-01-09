// /js/world.js — Scarlett VR Poker — MASTER WORLD ("Whirl")
// Includes:
// - Full lobby shell + lighting
// - Poker table + community cards always hover & face player + pot animation
// - Store with REAL doorway structure (not a solid box)
// - Outside display: twin pillars + rail + light strip + 4 cyber mannequins
// - 2 NPC bots: Guard (stands) + Walker (patrol) — FIXED height, feet on floor
// - Texture fallback if cyber_suit_atlas.png missing/broken

export function initWorld({ THREE, scene, log = console.log }) {
  const world = {
    THREE,
    scene,
    log,
    group: new THREE.Group(),
    colliders: [],
    floorY: 0,
    spawn: new THREE.Vector3(0, 0, 3.25), // safe spawn away from table center
    tablePos: new THREE.Vector3(0, 0, 0),
    storePos: new THREE.Vector3(8.5, 0, -2.5),
    npcs: [],
    mannequins: [],
    pokerTable: null,
    store: null,
    update(dt, camera) {
      if (world.pokerTable) world.pokerTable.update(dt, camera);
      for (const npc of world.npcs) npc.update(dt);
    },
  };

  scene.add(world.group);

  // ---------- Lighting ----------
  scene.background = new THREE.Color(0x05060a);

  const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x0b1020, 0.95);
  world.group.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(3, 7, 3);
  world.group.add(key);

  const rim = new THREE.PointLight(0x7fe7ff, 0.65, 26, 2);
  rim.position.set(-6, 2.4, -4);
  world.group.add(rim);

  const pink = new THREE.PointLight(0xff2d7a, 0.33, 22, 2);
  pink.position.set(6, 2.2, 3);
  world.group.add(pink);

  // ---------- Floor ----------
  const floorGeo = new THREE.PlaneGeometry(70, 70);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f14,
    roughness: 1.0,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = world.floorY;
  world.group.add(floor);
  world.floor = floor;

  // ---------- Lobby walls (simple colliders) ----------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x111624,
    roughness: 0.95,
    metalness: 0.02,
  });

  function addColliderBox(w, h, d, x, y, z, mat = wallMat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    world.group.add(m);
    world.colliders.push(m);
    return m;
  }

  const H = 3.2;
  const T = 0.35;
  addColliderBox(70, H, T, 0, H / 2, -35);
  addColliderBox(70, H, T, 0, H / 2, 35);
  addColliderBox(T, H, 70, -35, H / 2, 0);
  addColliderBox(T, H, 70, 35, H / 2, 0);

  // ---------- Table Area rail ----------
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.065, 16, 96),
    new THREE.MeshStandardMaterial({
      color: 0x0c1622,
      roughness: 0.55,
      metalness: 0.25,
      emissive: new THREE.Color(0x081624),
      emissiveIntensity: 0.25,
    })
  );
  rail.rotation.x = -Math.PI / 2;
  rail.position.set(0, 0.05, 0);
  world.group.add(rail);

  // ---------- Poker stage ----------
  world.pokerTable = new PokerTable({ THREE, scene: world.group, log });
  world.pokerTable.group.position.copy(world.tablePos);

  // ---------- Store + outside display ----------
  world.store = buildStoreAndDisplayMaster({ THREE, log });
  world.store.group.position.copy(world.storePos);
  world.group.add(world.store.group);

  world.mannequins = world.store.mannequins;

  // ---------- NPCs (height fixed) ----------
  // Guard stands near entrance
  const guard = new NPCBot({
    THREE,
    name: "Guard",
    color: 0x7fe7ff,
    emissive: 0x142638,
    height: 1.64,      // FIX: not too tall
    radius: 0.18,
    speed: 0.0,
    start: world.store.guardSpot.clone(),
    path: [world.store.guardSpot.clone()],
    idle: true,
  });
  world.group.add(guard.group);
  world.npcs.push(guard);

  // Walker patrols around display / entrance
  const walker = new NPCBot({
    THREE,
    name: "Walker",
    color: 0xff2d7a,
    emissive: 0x2a0a16,
    height: 1.60,      // FIX: not too tall
    radius: 0.175,
    speed: 0.75,
    start: world.store.walkPath[0].clone(),
    path: world.store.walkPath.map(v => v.clone()),
    idle: false,
  });
  world.group.add(walker.group);
  world.npcs.push(walker);

  log("[world] MASTER init ✅ (store doorway + cyber mannequins + 2 bots)");
  return world;
}

/* =========================
   Update 4.0 Cyber-Avatar
   ========================= */
export class CyberAvatar {
  constructor({ THREE, scene, camera, textureURL = "assets/textures/cyber_suit_atlas.png", log = console.log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.log = log;

    this.meshGroup = new THREE.Group();
    this.parts = { helmet: null, torso: null, leftHand: null, rightHand: null };
    this._euler = new THREE.Euler(0, 0, 0, "YXZ");
    this._textureURL = textureURL;
    this._forceHandsOn = true;

    this.init();
  }

  init() {
    const THREE = this.THREE;

    const mat = createCyberMaterialWithFallback({
      THREE,
      url: this._textureURL,
      log: this.log,
      emissiveIntensity: 2.5,
      fallbackColor: 0x1a2332
    });

    // Helmet
    this.parts.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), mat);
    this.parts.helmet.frustumCulled = false;

    // Torso proxy
    this.parts.torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.75, 0.25), mat);
    this.parts.torso.frustumCulled = false;

    // Gloves
    const gloveGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.45, 16);
    this.parts.leftHand = new THREE.Mesh(gloveGeo, mat);
    this.parts.rightHand = new THREE.Mesh(gloveGeo, mat);
    this.parts.leftHand.rotation.x = Math.PI / 2;
    this.parts.rightHand.rotation.x = Math.PI / 2;
    this.parts.leftHand.visible = false;
    this.parts.rightHand.visible = false;

    this.meshGroup.add(this.parts.helmet, this.parts.torso, this.parts.leftHand, this.parts.rightHand);
    this.scene.add(this.meshGroup);

    this.log("✅ Update 4.0: CyberAvatar initialized.");
  }

  setHandsVisible(v) {
    this._forceHandsOn = !!v;
    if (!v) {
      this.parts.leftHand.visible = false;
      this.parts.rightHand.visible = false;
    }
  }

  update(frame, refSpace, camera = this.camera) {
    if (!frame || !refSpace || !camera) return;

    // Helmet sync
    this.parts.helmet.position.copy(camera.position);
    this.parts.helmet.quaternion.copy(camera.quaternion);

    // Torso yaw-locked
    this.parts.torso.position.copy(camera.position);
    this.parts.torso.position.y -= 0.55;

    this._euler.setFromQuaternion(camera.quaternion, "YXZ");
    this._euler.x = 0;
    this._euler.z = 0;
    this.parts.torso.quaternion.setFromEuler(this._euler);

    // Hands-only tracking
    let leftSeen = false, rightSeen = false;
    const session = frame.session;
    if (!session?.inputSources) return;

    for (const src of session.inputSources) {
      if (!src?.hand) continue;
      const wrist = src.hand.get("wrist");
      if (!wrist) continue;

      const pose = frame.getJointPose(wrist, refSpace);
      if (!pose) continue;

      const handMesh = (src.handedness === "left") ? this.parts.leftHand : this.parts.rightHand;

      handMesh.position.set(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );
      handMesh.quaternion.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );
      handMesh.visible = true;

      if (src.handedness === "left") leftSeen = true;
      if (src.handedness === "right") rightSeen = true;
    }

    if (!this._forceHandsOn) {
      if (!leftSeen) this.parts.leftHand.visible = false;
      if (!rightSeen) this.parts.rightHand.visible = false;
    }
  }
}

/* =========================
   Poker Table + Cards + Pot
   ========================= */
export class PokerTable {
  constructor({ THREE, scene, log = console.log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.log = log;

    this.group = new THREE.Group();
    this.community = [];
    this.pot = null;

    this._makeTable();
    this._makeCommunityCards();
    this._makePot();

    scene.add(this.group);
  }

  _makeTable() {
    const THREE = this.THREE;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.20, 48),
      new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.65, metalness: 0.2 })
    );
    base.position.y = 0.10;

    const felt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.06, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0f6b3b,
        roughness: 0.9,
        metalness: 0.0,
        emissive: new THREE.Color(0x04160d),
        emissiveIntensity: 0.35,
      })
    );
    felt.position.y = 0.18;

    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.06, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.5, metalness: 0.35 })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.21;

    this.group.add(base, felt, edge);
    this.tableTopY = 0.24;
  }

  _makeCommunityCards() {
    const THREE = this.THREE;

    const cardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(0x101010),
      emissiveIntensity: 0.15,
    });

    const backMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a44,
      roughness: 0.5,
      metalness: 0.1,
      emissive: new THREE.Color(0x050a12),
      emissiveIntensity: 0.25,
    });

    const geo = new THREE.BoxGeometry(0.065, 0.0018, 0.090);
    const mats = [cardMat, cardMat, cardMat, cardMat, cardMat, backMat];

    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(geo, mats);
      c.position.set((i - 2) * 0.08, this.tableTopY + 0.04, -0.18);
      c.rotation.x = -Math.PI / 2;
      this.group.add(c);
      this.community.push(c);
    }
  }

  _makePot() {
    const THREE = this.THREE;

    const chipMat = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.4,
      metalness: 0.25,
      emissive: new THREE.Color(0x0b0d14),
      emissiveIntensity: 0.35,
    });

    const g = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24);
    const stack = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const chip = new THREE.Mesh(g, chipMat);
      chip.position.y = i * 0.012;
      stack.add(chip);
    }
    stack.position.set(0, this.tableTopY + 0.02, 0.05);
    this.group.add(stack);
    this.pot = stack;
    this._potHome = stack.position.clone();
  }

  resetPot() {
    this.pot.position.copy(this._potHome);
  }

  movePotToWinner(winnerWorldPos) {
    const local = winnerWorldPos.clone();
    this.group.worldToLocal(local);
    local.y = this.tableTopY + 0.02;
    this._potTarget = local;
    this._potT = 0;
  }

  update(dt, camera) {
    // Community cards always hover + face player
    for (const c of this.community) {
      c.position.y = this.tableTopY + 0.04 + Math.sin(performance.now() * 0.002 + c.position.x * 10) * 0.004;
      c.lookAt(camera.position.x, c.position.y, camera.position.z);
      c.rotateY(Math.PI);
      c.rotation.x = -Math.PI / 2;
    }

    // Pot animation
    if (this._potTarget) {
      this._potT = Math.min(1, (this._potT || 0) + dt * 0.6);
      this.pot.position.lerp(this._potTarget, this._potT);
      if (this._potT >= 1) this._potTarget = null;
    }
  }
}

/* =========================
   STORE + DISPLAY (MASTER)
   - Real doorway structure
   - Outside display: twin pillars + rail + light strip
   - 4 mannequins with cyber atlas (fallback if PNG missing)
   ========================= */
function buildStoreAndDisplayMaster({ THREE, log }) {
  const group = new THREE.Group();
  const mannequins = [];

  // Materials
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.88, metalness: 0.12 });
  const trimMat  = new THREE.MeshStandardMaterial({
    color: 0x101a2a,
    roughness: 0.6,
    metalness: 0.25,
    emissive: new THREE.Color(0x081624),
    emissiveIntensity: 0.45
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7fe7ff,
    transparent: true,
    opacity: 0.13,
    roughness: 0.15,
    metalness: 0.05,
    emissive: new THREE.Color(0x07121c),
    emissiveIntensity: 0.35
  });

  // Store dimensions
  const storeW = 6.2, storeH = 2.9, storeD = 4.6;
  const wallT = 0.18;

  // Floor + roof
  const floor = new THREE.Mesh(new THREE.BoxGeometry(storeW, 0.10, storeD), shellMat);
  floor.position.set(0, 0.05, 0);
  group.add(floor);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(storeW, 0.12, storeD), shellMat);
  roof.position.set(0, storeH + 0.06, 0);
  group.add(roof);

  // Back wall
  const back = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, wallT), shellMat);
  back.position.set(0, storeH / 2 + 0.10, -storeD / 2);
  group.add(back);

  // Side walls
  const left = new THREE.Mesh(new THREE.BoxGeometry(wallT, storeH, storeD), shellMat);
  left.position.set(-storeW / 2, storeH / 2 + 0.10, 0);
  group.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(wallT, storeH, storeD), shellMat);
  right.position.set(storeW / 2, storeH / 2 + 0.10, 0);
  group.add(right);

  // Front wall pieces with doorway opening (REAL DOOR STRUCTURE)
  const doorW = 2.2;
  const doorH = 2.35;

  // Left front panel
  const frontL = new THREE.Mesh(new THREE.BoxGeometry((storeW - doorW) / 2, storeH, wallT), shellMat);
  frontL.position.set(-((doorW / 2) + (storeW - doorW) / 4), storeH / 2 + 0.10, storeD / 2);
  group.add(frontL);

  // Right front panel
  const frontR = new THREE.Mesh(new THREE.BoxGeometry((storeW - doorW) / 2, storeH, wallT), shellMat);
  frontR.position.set(((doorW / 2) + (storeW - doorW) / 4), storeH / 2 + 0.10, storeD / 2);
  group.add(frontR);

  // Top lintel over doorway
  const lintelH = storeH - doorH;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallT), shellMat);
  lintel.position.set(0, doorH + lintelH / 2 + 0.10, storeD / 2);
  group.add(lintel);

  // Door frame trim
  const frameSideL = new THREE.Mesh(new THREE.BoxGeometry(0.10, doorH, 0.10), trimMat);
  frameSideL.position.set(-doorW / 2, doorH / 2 + 0.10, storeD / 2 + 0.04);
  group.add(frameSideL);

  const frameSideR = frameSideL.clone();
  frameSideR.position.set(doorW / 2, doorH / 2 + 0.10, storeD / 2 + 0.04);
  group.add(frameSideR);

  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.10, 0.10, 0.10), trimMat);
  frameTop.position.set(0, doorH + 0.10, storeD / 2 + 0.04);
  group.add(frameTop);

  // Glass panels left/right of door (for storefront feel)
  const glassL = new THREE.Mesh(new THREE.BoxGeometry((storeW - doorW) / 2 - 0.15, 2.1, 0.05), glassMat);
  glassL.position.set(frontL.position.x, 1.25, storeD / 2 - 0.03);
  group.add(glassL);

  const glassR = glassL.clone();
  glassR.position.set(frontR.position.x, 1.25, storeD / 2 - 0.03);
  group.add(glassR);

  // Sign above door
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.48, 0.12), trimMat);
  sign.position.set(0, storeH + 0.40, storeD / 2 + 0.08);
  group.add(sign);

  // Interior set dressing: counter + two shelves
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.6), trimMat);
  counter.position.set(0, 0.55, -0.8);
  group.add(counter);

  const shelfA = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.0, 1.6), shellMat);
  shelfA.position.set(-2.25, 1.1, -0.3);
  group.add(shelfA);

  const shelfB = shelfA.clone();
  shelfB.position.set(2.25, 1.1, -0.3);
  group.add(shelfB);

  // Interior lighting
  const interior = new THREE.PointLight(0x7fe7ff, 0.8, 16, 2);
  interior.position.set(0, 2.2, 0.3);
  group.add(interior);

  // ---------- Outside Display (your request) ----------
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x0c1622,
    roughness: 0.55,
    metalness: 0.35,
    emissive: new THREE.Color(0x06121c),
    emissiveIntensity: 0.35
  });
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.75, metalness: 0.25 });

  const displayZ = storeD / 2 + 1.35;
  const pillarX = 2.55;

  const pillarA = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 18), pillarMat);
  pillarA.position.set(-pillarX, 1.1, displayZ);
  group.add(pillarA);

  const pillarB = pillarA.clone();
  pillarB.position.set(pillarX, 1.1, displayZ);
  group.add(pillarB);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(pillarX * 2.0, 0.08, 0.08), pillarMat);
  rail.position.set(0, 1.75, displayZ);
  group.add(rail);

  // Display pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 2.35), pedestalMat);
  pad.position.set(0, 0.04, displayZ - 0.38);
  group.add(pad);

  // Light strip + spill light (the “pop”)
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(pillarX * 2.1, 0.05, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x0a141f,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.4,
    })
  );
  strip.position.set(0, 1.92, displayZ);
  group.add(strip);

  const stripLight = new THREE.PointLight(0x7fe7ff, 1.0, 6.5, 2);
  stripLight.position.set(0, 1.82, displayZ - 0.15);
  group.add(stripLight);

  // 4 mannequins (cyber atlas, fallback safe)
  const slots = [
    new THREE.Vector3(-1.7, 0, displayZ - 0.95),
    new THREE.Vector3( 1.7, 0, displayZ - 0.95),
    new THREE.Vector3(-1.7, 0, displayZ - 0.30),
    new THREE.Vector3( 1.7, 0, displayZ - 0.30),
  ];

  for (let i = 0; i < slots.length; i++) {
    const m = makeCyberMannequin({ THREE, log });
    m.position.copy(slots[i]);
    m.position.y = 0;
    group.add(m);
    mannequins.push(m);
  }

  // NPC spots (store-local)
  const guardSpot = new THREE.Vector3(-2.9, 0, storeD / 2 + 0.85);
  const walkPath = [
    new THREE.Vector3(-3.3, 0, storeD / 2 + 2.25),
    new THREE.Vector3( 3.3, 0, storeD / 2 + 2.25),
    new THREE.Vector3( 3.3, 0, storeD / 2 + 0.70),
    new THREE.Vector3(-3.3, 0, storeD / 2 + 0.70),
  ];

  // tiny ground glow for doorway
  const doorGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.75, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.20 })
  );
  doorGlow.rotation.x = -Math.PI / 2;
  doorGlow.position.set(0, 0.012, storeD / 2 + 0.35);
  group.add(doorGlow);

  log("[store] doorway structure ✅ mannequins ✅");
  return { group, mannequins, guardSpot, walkPath };
}

/* =========================
   Cyber material w/ fallback
   - If PNG missing/broken, mannequins still render
   ========================= */
function createCyberMaterialWithFallback({ THREE, url, log, emissiveIntensity = 1.6, fallbackColor = 0x1b2230 }) {
  const fallback = new THREE.MeshStandardMaterial({
    color: fallbackColor,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 0.8,
    roughness: 0.35,
    metalness: 0.35
  });

  const loader = new THREE.TextureLoader();
  loader.load(
    url,
    (tex) => {
      try {
        tex.flipY = false;
        fallback.map = tex;
        fallback.emissiveMap = tex;
        fallback.emissive = new THREE.Color(0x00ffff);
        fallback.emissiveIntensity = emissiveIntensity;
        fallback.metalness = 0.78;
        fallback.roughness = 0.25;
        fallback.needsUpdate = true;
        log("✅ [texture] loaded: " + url);
      } catch (e) {
        log("⚠️ [texture] loaded but apply failed: " + url + " " + (e?.message || e));
      }
    },
    undefined,
    (err) => {
      log("⚠️ [texture] FAILED: " + url + " — using fallback material");
      // keep fallback
    }
  );

  return fallback;
}

function makeCyberMannequin({ THREE, log }) {
  const g = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.75, metalness: 0.25 });
  const cyberMat = createCyberMaterialWithFallback({
    THREE,
    url: "assets/textures/cyber_suit_atlas.png",
    log,
    emissiveIntensity: 1.6,
    fallbackColor: 0x141b27
  });

  // pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24), baseMat);
  ped.position.y = 0.06;
  g.add(ped);

  // body
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.48, 8, 18), cyberMat);
  torso.position.y = 0.98;
  g.add(torso);

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), cyberMat);
  head.position.y = 1.48;
  g.add(head);

  // hanger bar
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), baseMat);
  bar.position.y = 1.68;
  g.add(bar);

  return g;
}

/* =========================
   NPC Bot (simple, stable)
   - FIXED height, feet on floor
   - Walker patrols with no floating
   ========================= */
class NPCBot {
  constructor({ THREE, name, color, emissive, height = 1.6, radius = 0.175, speed = 0.7, start, path, idle = false }) {
    this.THREE = THREE;
    this.name = name;
    this.speed = speed;
    this.path = path || [start.clone()];
    this.idle = idle;

    this.group = new THREE.Group();
    this.group.position.copy(start || new THREE.Vector3(0, 0, 0));

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.22,
      emissive: new THREE.Color(emissive || 0x080a10),
      emissiveIntensity: 0.30,
    });

    // capsule body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.6, height - radius * 2), 10, 20), mat);
    body.position.y = height * 0.50;
    this.group.add(body);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 18, 18), mat);
    head.position.y = height + 0.03;
    this.group.add(head);

    // feet
    const footMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.95, metalness: 0.0 });
    const footL = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, 0.05, 12), footMat);
    const footR = footL.clone();
    footL.position.set(-radius * 0.45, 0.025, 0);
    footR.position.set( radius * 0.45, 0.025, 0);
    this.group.add(footL, footR);

    this._footL = footL;
    this._footR = footR;

    this._idx = 0;
    this._t = 0;
    this._walkPhase = 0;
  }

  update(dt) {
    // stay on floor baseline (no floating)
    this.group.position.y = 0;

    if (this.idle || this.speed <= 0 || this.path.length < 2) {
      // small idle yaw (subtle)
      this.group.rotation.y += dt * 0.18;
      return;
    }

    const from = this.path[this._idx];
    const to = this.path[(this._idx + 1) % this.path.length];

    const dist = Math.max(0.001, from.distanceTo(to));
    this._t += (this.speed * dt) / dist;

    if (this._t >= 1) {
      this._t = 0;
      this._idx = (this._idx + 1) % this.path.length;
    }

    const p = from.clone().lerp(to, this._t);
    this.group.position.x = p.x;
    this.group.position.z = p.z;

    // face direction
    const dir = to.clone().sub(from);
    const yaw = Math.atan2(dir.x, dir.z);
    this.group.rotation.y = yaw;

    // feet lift (tiny), keeps grounded look (NO body bob)
    this._walkPhase += dt * 6.0;
    const liftA = Math.max(0, Math.sin(this._walkPhase)) * 0.015;
    const liftB = Math.max(0, -Math.sin(this._walkPhase)) * 0.015;
    this._footL.position.y = 0.025 + liftA;
    this._footR.position.y = 0.025 + liftB;
  }
    }

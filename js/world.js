// /js/world.js — Scarlett VR Poker — FULL WORLD ("Whirl") + Store + Displays + NPCs + Table + Update 4.0 Avatar
// Uses index.html importmap: "three" + "three/addons/"

export function initWorld({ THREE, scene, log = console.log }) {
  const world = {
    THREE,
    scene,
    log,
    group: new THREE.Group(),
    colliders: [],
    floorY: 0,
    spawn: new THREE.Vector3(0, 0, 3.0), // safe spawn away from table
    tablePos: new THREE.Vector3(0, 0, 0),
    storePos: new THREE.Vector3(8.5, 0, -2.5), // store on right side
    npcs: [],
    mannequins: [],
    update(dt, camera) {
      // update table visuals
      if (world.pokerTable) world.pokerTable.update(dt, camera);

      // update NPCs
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

  const rim = new THREE.PointLight(0x7fe7ff, 0.65, 24, 2);
  rim.position.set(-6, 2.4, -4);
  world.group.add(rim);

  const pink = new THREE.PointLight(0xff2d7a, 0.35, 20, 2);
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

  // ---------- Lobby walls (colliders) ----------
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
  addColliderBox(70, H, T, 0, H / 2, -35); // back
  addColliderBox(70, H, T, 0, H / 2, 35);  // front
  addColliderBox(T, H, 70, -35, H / 2, 0); // left
  addColliderBox(T, H, 70, 35, H / 2, 0);  // right

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

  // ---------- Store + display area ----------
  const store = buildStoreAndDisplay({ THREE, log });
  store.group.position.copy(world.storePos);
  world.group.add(store.group);

  // mannequins references
  world.mannequins = store.mannequins;

  // ---------- NPCs (2 total): Guard (standing) + Walker (walking loop) ----------
  const guard = new NPCBot({
    THREE,
    name: "Guard",
    color: 0x7fe7ff,
    emissive: 0x142638,
    height: 1.72,
    radius: 0.19,
    speed: 0.0, // standing
    start: store.guardSpot.clone(),
    path: [store.guardSpot.clone()],
    idle: true,
  });
  world.group.add(guard.group);
  world.npcs.push(guard);

  // Walker bot: patrol around the store + display
  const p0 = store.walkPath[0].clone();
  const walker = new NPCBot({
    THREE,
    name: "Walker",
    color: 0xff2d7a,
    emissive: 0x2a0a16,
    height: 1.68,
    radius: 0.18,
    speed: 0.8,
    start: p0,
    path: store.walkPath.map(v => v.clone()),
    idle: false,
  });
  world.group.add(walker.group);
  world.npcs.push(walker);

  log("[world] FULL init ✅ store+display+2npc+table");
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
    const loader = new THREE.TextureLoader();
    const atlas = loader.load(
      this._textureURL,
      () => this.log("✅ [avatar] cyber atlas loaded: " + this._textureURL),
      undefined,
      (e) => this.log("⚠️ [avatar] atlas load failed: " + this._textureURL + " " + (e?.message || e))
    );
    atlas.flipY = false;

    const mat = new THREE.MeshStandardMaterial({
      map: atlas,
      emissiveMap: atlas,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 2.5,
      metalness: 0.8,
      roughness: 0.2,
    });

    this.parts.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), mat);
    this.parts.helmet.frustumCulled = false;

    this.parts.torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.75, 0.25), mat);
    this.parts.torso.frustumCulled = false;

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

    this.parts.helmet.position.copy(camera.position);
    this.parts.helmet.quaternion.copy(camera.quaternion);

    this.parts.torso.position.copy(camera.position);
    this.parts.torso.position.y -= 0.55;

    this._euler.setFromQuaternion(camera.quaternion, "YXZ");
    this._euler.x = 0;
    this._euler.z = 0;
    this.parts.torso.quaternion.setFromEuler(this._euler);

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
    for (const c of this.community) {
      c.position.y = this.tableTopY + 0.04 + Math.sin(performance.now() * 0.002 + c.position.x * 10) * 0.004;
      c.lookAt(camera.position.x, c.position.y, camera.position.z);
      c.rotateY(Math.PI);
      c.rotation.x = -Math.PI / 2;
    }

    if (this._potTarget) {
      this._potT = Math.min(1, (this._potT || 0) + dt * 0.6);
      this.pot.position.lerp(this._potTarget, this._potT);
      if (this._potT >= 1) this._potTarget = null;
    }
  }
}

/* =========================
   Store + Display Build
   ========================= */
function buildStoreAndDisplay({ THREE, log }) {
  const group = new THREE.Group();
  const mannequins = [];

  // Store shell
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.85, metalness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.15, roughness: 0.2, metalness: 0.0 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x101a2a, roughness: 0.6, metalness: 0.25, emissive: new THREE.Color(0x081624), emissiveIntensity: 0.4 });

  const storeW = 6.0, storeH = 2.8, storeD = 4.2;

  const shell = new THREE.Mesh(new THREE.BoxGeometry(storeW, storeH, storeD), shellMat);
  shell.position.set(0, storeH/2, 0);
  group.add(shell);

  // Hollow-ish entrance cut illusion: just add a doorway frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 0.18), accentMat);
  frame.position.set(0, 1.15, storeD/2 + 0.09);
  group.add(frame);

  // Front glass panel (just outside frame)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(storeW - 0.2, 2.2, 0.05), glassMat);
  glass.position.set(0, 1.2, storeD/2 - 0.02);
  group.add(glass);

  // Store sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.12), accentMat);
  sign.position.set(0, 2.45, storeD/2 + 0.22);
  group.add(sign);

  // Interior light
  const storeLight = new THREE.PointLight(0x7fe7ff, 0.7, 14, 2);
  storeLight.position.set(0, 2.1, 0);
  group.add(storeLight);

  // ---------- Outside Display (your request) ----------
  // “pillar” + mirrored pillar + rail between them so outfits can be displayed
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0c1622, roughness: 0.55, metalness: 0.35, emissive: new THREE.Color(0x06121c), emissiveIntensity: 0.35 });
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.7, metalness: 0.25 });

  const displayZ = storeD/2 + 1.25; // outside the store
  const pillarX = 2.4;

  const pillarA = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 18), pillarMat);
  pillarA.position.set(-pillarX, 1.1, displayZ);
  group.add(pillarA);

  const pillarB = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 18), pillarMat);
  pillarB.position.set(pillarX, 1.1, displayZ);
  group.add(pillarB);

  // rail bar between pillars
  const rail = new THREE.Mesh(new THREE.BoxGeometry(pillarX * 2, 0.08, 0.08), pillarMat);
  rail.position.set(0, 1.75, displayZ);
  group.add(rail);

  // display floor pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 2.2), pedestalMat);
  pad.position.set(0, 0.04, displayZ - 0.35);
  group.add(pad);

  // 4 mannequins outside store (two rows of two)
  const slots = [
    new THREE.Vector3(-1.6, 0, displayZ - 0.85),
    new THREE.Vector3( 1.6, 0, displayZ - 0.85),
    new THREE.Vector3(-1.6, 0, displayZ - 0.25),
    new THREE.Vector3( 1.6, 0, displayZ - 0.25),
  ];

  for (let i = 0; i < slots.length; i++) {
    const m = makeMannequin({ THREE, styleIndex: i });
    m.position.copy(slots[i]);
    m.position.y = 0; // feet on floor
    group.add(m);
    mannequins.push(m);
  }

  // Spots for NPCs relative to store local space
  const guardSpot = new THREE.Vector3(-2.8, 0, storeD/2 + 0.85); // near entrance, outside
  const walkPath = [
    new THREE.Vector3(-3.2, 0, storeD/2 + 2.2),
    new THREE.Vector3( 3.2, 0, storeD/2 + 2.2),
    new THREE.Vector3( 3.2, 0, storeD/2 + 0.6),
    new THREE.Vector3(-3.2, 0, storeD/2 + 0.6),
  ];

  return { group, mannequins, guardSpot, walkPath };
}

function makeMannequin({ THREE, styleIndex = 0 }) {
  const g = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.7, metalness: 0.2 });
  const bodyColors = [0x7fe7ff, 0xff2d7a, 0xffcc00, 0x4cd964];
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColors[styleIndex % bodyColors.length],
    roughness: 0.35,
    metalness: 0.25,
    emissive: new THREE.Color(0x05070a),
    emissiveIntensity: 0.2,
  });

  // pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 24), baseMat);
  ped.position.y = 0.06;
  g.add(ped);

  // body
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.45, 8, 18), bodyMat);
  torso.position.y = 0.95;
  g.add(torso);

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), bodyMat);
  head.position.y = 1.45;
  g.add(head);

  // “hanger” bar (hint clothing display)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), baseMat);
  bar.position.y = 1.65;
  g.add(bar);

  return g;
}

/* =========================
   NPC Bot (simple, reliable)
   - Guard: idle near store
   - Walker: patrol loop
   ========================= */
class NPCBot {
  constructor({ THREE, name, color, emissive, height = 1.7, radius = 0.18, speed = 0.8, start, path, idle = false }) {
    this.THREE = THREE;
    this.name = name;
    this.speed = speed;
    this.path = path || [start.clone()];
    this.idle = idle;

    this.group = new THREE.Group();
    this.group.position.copy(start || new THREE.Vector3(0, 0, 0));

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.25,
      emissive: new THREE.Color(emissive || 0x080a10),
      emissiveIntensity: 0.35,
    });

    // body capsule
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(radius, height - radius * 2, 10, 20), mat);
    body.position.y = height * 0.5;
    this.group.add(body);

    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 18, 18), mat);
    head.position.y = height + 0.05;
    this.group.add(head);

    // feet markers (to avoid floating look)
    const footMat = new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.9, metalness: 0.0 });
    const footL = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, 0.05, 12), footMat);
    const footR = footL.clone();
    footL.position.set(-radius * 0.45, 0.025, 0);
    footR.position.set( radius * 0.45, 0.025, 0);
    this.group.add(footL, footR);

    this._footL = footL;
    this._footR = footR;

    // movement state
    this._idx = 0;
    this._t = 0;
    this._from = this.path[0].clone();
    this._to = this.path[1] ? this.path[1].clone() : this.path[0].clone();
    this._walkPhase = 0;
  }

  update(dt) {
    // Keep on floor
    this.group.position.y = 0;

    if (this.idle || this.speed <= 0 || this.path.length < 2) {
      // subtle idle sway
      this.group.rotation.y += dt * 0.2;
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

    // face movement direction
    const dir = to.clone().sub(from);
    const yaw = Math.atan2(dir.x, dir.z);
    this.group.rotation.y = yaw;

    // footstep bob (visual only)
    this._walkPhase += dt * 6.5;
    const bob = Math.abs(Math.sin(this._walkPhase)) * 0.02;
    this.group.position.y = bob;

    // tiny alternating feet lift to kill “floating” vibe
    const lift = Math.max(0, Math.sin(this._walkPhase)) * 0.02;
    this._footL.position.y = 0.025 + lift;
    this._footR.position.y = 0.025 + Math.max(0, -Math.sin(this._walkPhase)) * 0.02;
  }
}
function getCyberMannequinMaterial(THREE) {
  const tex = new THREE.TextureLoader().load(
    "assets/textures/cyber_suit_atlas.png"
  );
  tex.flipY = false;

  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 1.6, // slightly lower than player avatar
    metalness: 0.75,
    roughness: 0.28,
  });
}

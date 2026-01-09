// /js/world.js — Scarlett VR Poker — Permanent World + Update 4.0 Avatar + Poker Stage
// Works with your index.html importmap ("three" + "three/addons/").

// Exports:
//  - initWorld({ THREE, scene, log })
//  - CyberAvatar (hands-only, no controller models)
//  - PokerTable (visual table + community cards that always hover and face player)

export function initWorld({ THREE, scene, log = console.log }) {
  const world = {
    group: new THREE.Group(),
    floorY: 0,
    colliders: [],
    spawn: new THREE.Vector3(0, 0, 2.4),
    tablePos: new THREE.Vector3(0, 0, 0),
  };

  scene.add(world.group);

  // ---------- Lighting ----------
  scene.background = new THREE.Color(0x05060a);

  const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x0b1020, 0.95);
  world.group.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(3, 7, 3);
  world.group.add(key);

  const rim = new THREE.PointLight(0x7fe7ff, 0.65, 18, 2);
  rim.position.set(-3, 2.2, -2);
  world.group.add(rim);

  const pink = new THREE.PointLight(0xff2d7a, 0.35, 14, 2);
  pink.position.set(3, 1.7, 2);
  world.group.add(pink);

  // ---------- Floor ----------
  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f14,
    roughness: 1.0,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = world.floorY;
  floor.receiveShadow = false;
  world.group.add(floor);
  world.floor = floor;

  // ---------- Lobby "room" walls (simple colliders) ----------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x111624,
    roughness: 0.95,
    metalness: 0.02,
  });

  function addWall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z);
    world.group.add(m);
    world.colliders.push(m);
    return m;
  }

  // 4 walls around origin (open ceiling)
  const H = 3.0;
  const T = 0.35; // thickness
  addWall(60, H, T, 0, H / 2, -30); // back
  addWall(60, H, T, 0, H / 2, 30);  // front
  addWall(T, H, 60, -30, H / 2, 0); // left
  addWall(T, H, 60, 30, H / 2, 0);  // right

  // ---------- Accent rails around table area ----------
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.06, 16, 80),
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

  // Simple “teleport marker target” plane reference
  world.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  log("[world] init ✅");
  return world;
}

/**
 * Update 4.0 Cyber-Avatar
 * - Helmet follows HMD pose
 * - Torso yaw-locked to head
 * - Gloves track XR Hand Tracking wrist joints
 * - Hands-only rendering (no controller models required)
 */
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

    // Helmet
    this.parts.helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), mat);
    this.parts.helmet.frustumCulled = false;

    // Torso proxy (box)
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
    // Only affects rendering toggle; tracking still updates poses.
    if (!v) {
      this.parts.leftHand.visible = false;
      this.parts.rightHand.visible = false;
    }
    this._forceHandsOn = !!v;
  }

  update(frame, refSpace, camera = this.camera) {
    if (!frame || !refSpace || !camera) return;

    // Helmet sync
    this.parts.helmet.position.copy(camera.position);
    this.parts.helmet.quaternion.copy(camera.quaternion);

    // Torso: below head + yaw-locked
    this.parts.torso.position.copy(camera.position);
    this.parts.torso.position.y -= 0.55;

    this._euler.setFromQuaternion(camera.quaternion, "YXZ");
    this._euler.x = 0;
    this._euler.z = 0;
    this.parts.torso.quaternion.setFromEuler(this._euler);

    // Hands via XR Hand Tracking
    let leftSeen = false, rightSeen = false;

    const session = frame.session;
    if (!session?.inputSources) {
      if (!this._forceHandsOn) {
        this.parts.leftHand.visible = false;
        this.parts.rightHand.visible = false;
      }
      return;
    }

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

/**
 * PokerTable: table mesh + community cards that always hover & face player.
 * Also includes a "pot" chip stack that moves to winner.
 */
export class PokerTable {
  constructor({ THREE, scene, log = console.log }) {
    this.THREE = THREE;
    this.scene = scene;
    this.log = log;

    this.group = new THREE.Group();

    this.community = []; // 5 card meshes
    this.pot = null;

    this._makeTable();
    this._makeCommunityCards();
    this._makePot();

    scene.add(this.group);
  }

  _makeTable() {
    const THREE = this.THREE;

    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.20, 48),
      new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.65, metalness: 0.2 })
    );
    base.position.y = 0.10;

    // Felt top
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

    // Edge ring
    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.06, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.5, metalness: 0.35 })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.21;

    this.group.add(base, felt, edge);

    // Table collider-ish (for teleport block zones later)
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

    // 5 cards line
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
    // winnerWorldPos: THREE.Vector3 in WORLD space
    // convert to table local:
    const local = winnerWorldPos.clone();
    this.group.worldToLocal(local);
    local.y = this.tableTopY + 0.02;
    this._potTarget = local;
    this._potT = 0;
  }

  update(dt, camera) {
    // Community cards must always hover and face player (camera)
    for (const c of this.community) {
      // Gentle hover
      c.position.y = this.tableTopY + 0.04 + Math.sin(performance.now() * 0.002 + c.position.x * 10) * 0.004;

      // Face camera (billboard-ish), but keep a stable upright orientation
      c.lookAt(camera.position.x, c.position.y, camera.position.z);
      c.rotateY(Math.PI); // flip to face player properly
      c.rotation.x = -Math.PI / 2; // keep flat-ish like a hovering card
    }

    // Animate pot movement when targeted
    if (this._potTarget) {
      this._potT = Math.min(1, (this._potT || 0) + dt * 0.6);
      this.pot.position.lerp(this._potTarget, this._potT);
      if (this._potT >= 1) {
        this._potTarget = null;
      }
    }
  }
      }

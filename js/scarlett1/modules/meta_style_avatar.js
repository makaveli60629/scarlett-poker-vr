// /js/scarlett1/modules/meta_style_avatar.js
// Meta-Style Avatar (Quest-like) — Hands-Only WebXR
// - Not the user's private Meta avatar. It's a stylized look-alike.
// - Head/torso/arms, with hands driven by WebXR hand joints.
// - Works in loading (camera-attached) and world (rig-follow).

export class MetaStyleAvatar {
  constructor({ THREE, scene, rig, camera, style = "questToon" } = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.rig = rig;
    this.camera = camera;

    this.style = style;

    this.root = null;
    this.body = null;
    this.head = null;

    this.leftArm = null;
    this.rightArm = null;

    this.leftHand = null;
    this.rightHand = null;

    this.leftHandAnchor = null;
    this.rightHandAnchor = null;

    this.mode = "loading"; // loading | world
    this.ready = false;

    this._handMod = null;

    // smoothing
    this._tmpV = new THREE.Vector3();
    this._tmpQ = new THREE.Quaternion();
    this._targetPos = new THREE.Vector3();
    this._targetYaw = 0;
  }

  async init({ world } = {}) {
    const THREE = this.THREE;

    this.root = new THREE.Group();
    this.root.name = "MetaStyleAvatarRoot";
    this.scene.add(this.root);

    const mats = this._makeMats();

    // --- BODY (Quest-like proportions) ---
    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.23, 0.62, 8, 16),
      mats.body
    );
    this.body.position.set(0, 1.32, 0);
    this.root.add(this.body);

    // --- HEAD ---
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 22, 22),
      mats.head
    );
    this.head.position.set(0, 1.74, 0.05);
    this.root.add(this.head);

    // --- NECK / COLLAR GLOW ---
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.03, 10, 32),
      mats.neon
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.56, 0.02);
    this.root.add(collar);

    // --- ARMS (simple cylinders) ---
    const armGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.45, 14);
    this.leftArm = new THREE.Mesh(armGeo, mats.limb);
    this.rightArm = new THREE.Mesh(armGeo, mats.limb);

    this.leftArm.position.set(-0.25, 1.33, 0.08);
    this.rightArm.position.set(0.25, 1.33, 0.08);

    this.leftArm.rotation.z = 0.9;
    this.rightArm.rotation.z = -0.9;

    this.root.add(this.leftArm, this.rightArm);

    // --- HAND ANCHORS (driven by joints) ---
    this.leftHandAnchor = new THREE.Group();
    this.rightHandAnchor = new THREE.Group();
    this.leftHandAnchor.position.set(-0.35, 1.18, 0.20);
    this.rightHandAnchor.position.set(0.35, 1.18, 0.20);
    this.root.add(this.leftHandAnchor, this.rightHandAnchor);

    // --- HAND “QUEST STYLE” (rounded mitten + glow nail) ---
    this.leftHand = this._makeQuestHand(mats.hand, mats.neon, "L");
    this.rightHand = this._makeQuestHand(mats.hand, mats.neon, "R");
    this.leftHandAnchor.add(this.leftHand);
    this.rightHandAnchor.add(this.rightHand);

    // --- OPTIONAL: shoulder pads for “Meta-ish” silhouette ---
    const padGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const lPad = new THREE.Mesh(padGeo, mats.body);
    const rPad = new THREE.Mesh(padGeo, mats.body);
    lPad.position.set(-0.22, 1.46, 0.02);
    rPad.position.set(0.22, 1.46, 0.02);
    this.root.add(lPad, rPad);

    // Find hand input module if present
    this._handMod = world?.bus?.mods?.find(m => m?.constructor?.name === "HandInput") || null;

    // Start in loading mode
    this.setMode("loading");

    this.ready = true;
  }

  setMode(mode) {
    this.mode = mode;

    if (!this.root) return;

    if (mode === "loading") {
      // attach avatar to camera so it stays in view like a mirror preview
      this.root.position.set(0, -0.25, -1.2);
      this.root.rotation.y = Math.PI;
      this.camera.add(this.root);
    } else {
      // world mode: detach from camera and follow rig
      this.camera.remove(this.root);
      this.scene.add(this.root);
      this.root.position.set(this.rig.position.x, 0, this.rig.position.z);
      this.root.rotation.y = this.rig.rotation.y;
    }
  }

  update({ dt, t }) {
    if (!this.ready) return;

    // Follow HMD yaw (so body faces same direction)
    // Don’t follow pitch/roll for comfort
    const camWorldPos = this.camera.getWorldPosition(this._tmpV);
    const camWorldDir = new this.THREE.Vector3();
    this.camera.getWorldDirection(camWorldDir);

    // target pos: in world mode, center under HMD
    if (this.mode === "world") {
      this._targetPos.set(camWorldPos.x, 0, camWorldPos.z);
      // yaw from camera forward
      this._targetYaw = Math.atan2(camWorldDir.x, camWorldDir.z);

      // smooth
      this.root.position.lerp(this._targetPos, 1 - Math.pow(0.001, dt));
      this.root.rotation.y += (this._wrapAngle(this._targetYaw - this.root.rotation.y)) * (1 - Math.pow(0.001, dt));
    }

    // subtle breathing / idle
    const tt = (t || performance.now()) * 0.001;
    this.body.scale.y = 1 + Math.sin(tt * 1.2) * 0.01;

    // bind hands to WebXR joints if available
    this._applyHandJoint(0, this.leftHandAnchor);
    this._applyHandJoint(1, this.rightHandAnchor);
  }

  // --- internals ---
  _makeMats() {
    const THREE = this.THREE;

    // Quest-ish: soft, slightly glossy, clean shading
    const body = new THREE.MeshStandardMaterial({
      color: 0x1b2230,
      roughness: 0.55,
      metalness: 0.18,
      emissive: 0x000810,
      emissiveIntensity: 0.25
    });

    const head = new THREE.MeshStandardMaterial({
      color: 0x222b3c,
      roughness: 0.62,
      metalness: 0.12,
      emissive: 0x000810,
      emissiveIntensity: 0.18
    });

    const limb = new THREE.MeshStandardMaterial({
      color: 0x151b27,
      roughness: 0.62,
      metalness: 0.14
    });

    const hand = new THREE.MeshStandardMaterial({
      color: 0x2a3448,
      roughness: 0.45,
      metalness: 0.25,
      emissive: 0x000814,
      emissiveIntensity: 0.15
    });

    const neon = new THREE.MeshStandardMaterial({
      color: 0x061a22,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.9,
      roughness: 0.6,
      metalness: 0.2
    });

    return { body, head, limb, hand, neon };
  }

  _makeQuestHand(handMat, neonMat, tag) {
    const THREE = this.THREE;
    const g = new THREE.Group();
    g.name = `QuestHand_${tag}`;

    // mitten palm
    const palm = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 18, 18),
      handMat
    );
    palm.scale.set(1.2, 0.9, 1.0);
    g.add(palm);

    // thumb nub
    const thumb = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 14, 14),
      handMat
    );
    thumb.position.set(0.05, -0.01, 0.02);
    g.add(thumb);

    // “index glow dot” like futuristic fingertip cue
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 12, 12),
      neonMat
    );
    tip.position.set(0.0, 0.02, -0.06);
    g.add(tip);

    return g;
  }

  _applyHandJoint(handIndex, anchor) {
    const hm = this._handMod;
    if (!hm?.hands?.length) return;

    const hand = hm.hands[handIndex];
    if (!hand?.joints?.["index-finger-tip"]) return;

    const jt = hand.joints["index-finger-tip"];

    const p = new this.THREE.Vector3();
    const q = new this.THREE.Quaternion();
    jt.getWorldPosition(p);
    jt.getWorldQuaternion(q);

    // convert world -> avatar local (when avatar is in world space)
    if (this.mode === "world") {
      this.root.worldToLocal(p);
      anchor.position.copy(p);
      anchor.quaternion.copy(q);
    } else {
      // loading mode: avatar is attached to camera; use camera space conversion
      const cam = this.camera;
      cam.worldToLocal(p);
      // anchor is under root which is under camera; convert further by root local
      this.root.worldToLocal(cam.localToWorld(p)); // safe-ish
      anchor.position.copy(p);
      anchor.quaternion.copy(q);
    }

    // arm direction can roughly point toward hand
    if (handIndex === 0 && this.leftArm) this._aimArm(this.leftArm, anchor.position, true);
    if (handIndex === 1 && this.rightArm) this._aimArm(this.rightArm, anchor.position, false);
  }

  _aimArm(armMesh, handLocalPos, isLeft) {
    // crude but effective: arm points from shoulder-ish to hand anchor
    const shoulder = isLeft
      ? new this.THREE.Vector3(-0.20, 1.42, 0.04)
      : new this.THREE.Vector3(0.20, 1.42, 0.04);

    const dir = handLocalPos.clone().sub(shoulder);
    const len = dir.length();
    if (len < 0.001) return;
    dir.normalize();

    // place arm mid-point between shoulder and hand
    const mid = shoulder.clone().add(handLocalPos).multiplyScalar(0.5);
    armMesh.position.copy(mid);

    // orient cylinder along dir: default cylinder points up Y, so rotate from Y to dir
    const q = new this.THREE.Quaternion().setFromUnitVectors(
      new this.THREE.Vector3(0, 1, 0),
      dir
    );
    armMesh.quaternion.copy(q);

    // keep thickness stable
    armMesh.scale.set(1, Math.max(0.6, len / 0.45), 1);
  }

  _wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
    }

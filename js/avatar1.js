// /js/avatar1.js — Scarlett Avatar Update 1 (SAFE ADD-ON)
// Goal: Add a "cyber suit" mannequin that follows player HMD + hand tracking,
// without touching world.js.
// - Helmet follows HMD
// - Torso/Hips yaw-lock to head
// - Hands follow WebXR hand-tracking (wrist joints)
// - Legs do simple walk swing when player moves
//
// Texture:
// - Uses cyber_suit_diffuse.png as diffuse
// - Auto-builds emissive from cyan lines inside the diffuse (no extra emissive needed)

export class AvatarUpdate1 {
  constructor({ THREE, scene, camera, playerRig, v, log = console.log } = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.playerRig = playerRig;
    this.v = v || Date.now().toString();
    this.log = log;

    this.root = new THREE.Group();
    this.root.name = "AvatarUpdate1";
    scene.add(this.root);

    this._tmp = {
      yawEuler: new THREE.Euler(0, 0, 0, "YXZ"),
      yawQ: new THREE.Quaternion(),
      v3a: new THREE.Vector3(),
      v3b: new THREE.Vector3(),
      lastCam: new THREE.Vector3(),
    };

    this.state = {
      speed: 0,
      enabled: true,
      showHands: true,
      showBody: true,
    };

    // Build materials + meshes
    this._build();
    this.log("[AvatarUpdate1] ready ✅");
  }

  setEnabled(on) {
    this.state.enabled = !!on;
    this.root.visible = this.state.enabled;
  }
  setShowHands(on) {
    this.state.showHands = !!on;
    this.parts.leftHand.visible = false;
    this.parts.rightHand.visible = false;
  }
  setShowBody(on) {
    this.state.showBody = !!on;
    this.parts.helmet.visible = on;
    this.parts.torso.visible = on;
    this.parts.hips.visible = on;
    this.parts.leftLeg.visible = on;
    this.parts.rightLeg.visible = on;
  }

  // Build emissive from cyan lines inside diffuse
  _makeEmissiveFromImage(img, boost = 2.2) {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const im = ctx.getImageData(0, 0, c.width, c.height);
    const d = im.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];

      // cyan detector: g+b high, r low
      const cyan = Math.max(0, Math.min(255, (g + b) - (r * 1.2)));
      const v = Math.min(255, cyan * boost);

      // emissive cyan
      d[i] = 0;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }

    ctx.putImageData(im, 0, 0);

    const tex = new this.THREE.CanvasTexture(c);
    tex.colorSpace = this.THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  _build() {
    const THREE = this.THREE;
    const loader = new THREE.TextureLoader();

    // Suit diffuse (required)
    const suitDiffuse = loader.load(`./assets/textures/cyber_suit_diffuse.png?v=${this.v}`);
    suitDiffuse.colorSpace = THREE.SRGBColorSpace;

    // Material placeholders (we attach emissive after image is ready)
    const suitMat = new THREE.MeshStandardMaterial({
      map: suitDiffuse,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 1.6,
      metalness: 0.35,
      roughness: 0.55,
    });

    // When the image is available, build emissive from it
    const applyEmissive = () => {
      const img = suitDiffuse.image;
      if (!img?.width) return;
      const emissive = this._makeEmissiveFromImage(img, 2.2);
      suitMat.emissiveMap = emissive;
      suitMat.needsUpdate = true;
    };

    // Some browsers load image async; keep trying briefly
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (suitDiffuse.image?.width) {
        applyEmissive();
        clearInterval(timer);
        this.log("[AvatarUpdate1] emissive built ✅");
      }
      if (tries > 80) clearInterval(timer);
    }, 50);

    // Helmet: simple sphere (we can swap to helmet texture later)
    const helmetMat = suitMat.clone();
    helmetMat.metalness = 0.6;
    helmetMat.roughness = 0.25;
    helmetMat.emissiveIntensity = 2.0;

    // Build segmented mannequin (Quest-friendly)
    this.parts = {
      helmet: new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), helmetMat),

      torso: new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.50, 6, 12), suitMat),
      hips: new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.25, 6, 12), suitMat),

      leftLeg: new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.55, 6, 10), suitMat),
      rightLeg: new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.55, 6, 10), suitMat),

      // hands: cylinders (we hide when not tracked)
      leftHand: new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.35, 12), suitMat),
      rightHand: new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.35, 12), suitMat),

      visorGlow: new THREE.PointLight(0x00ffff, 0.85, 1.2),
    };

    this.parts.helmet.name = "AU1_Helmet";
    this.parts.torso.name = "AU1_Torso";
    this.parts.hips.name = "AU1_Hips";
    this.parts.leftLeg.name = "AU1_LeftLeg";
    this.parts.rightLeg.name = "AU1_RightLeg";
    this.parts.leftHand.name = "AU1_LeftHand";
    this.parts.rightHand.name = "AU1_RightHand";

    // default offsets (relative to camera each frame)
    this.parts.torso.position.y = -0.55;
    this.parts.hips.position.y = -0.95;
    this.parts.leftLeg.position.set(-0.10, -1.45, 0);
    this.parts.rightLeg.position.set(0.10, -1.45, 0);

    this.parts.leftHand.rotation.x = Math.PI / 2;
    this.parts.rightHand.rotation.x = Math.PI / 2;
    this.parts.leftHand.visible = false;
    this.parts.rightHand.visible = false;

    this.parts.visorGlow.position.set(0, 0.02, 0.10);
    this.parts.helmet.add(this.parts.visorGlow);

    this.root.add(
      this.parts.helmet,
      this.parts.torso,
      this.parts.hips,
      this.parts.leftLeg,
      this.parts.rightLeg,
      this.parts.leftHand,
      this.parts.rightHand
    );
  }

  // Call in your render loop: avatar.update({ frame, refSpace, dt })
  update({ frame, refSpace, dt = 0.016 } = {}) {
    if (!this.state.enabled) return;

    const THREE = this.THREE;
    const cam = this.camera;
    const tmp = this._tmp;

    // Helmet follows HMD
    this.parts.helmet.position.copy(cam.position);
    this.parts.helmet.quaternion.copy(cam.quaternion);

    // Torso + hips yaw-lock to head (no pitch/roll)
    tmp.yawEuler.setFromQuaternion(cam.quaternion, "YXZ");
    tmp.yawEuler.x = 0;
    tmp.yawEuler.z = 0;
    tmp.yawQ.setFromEuler(tmp.yawEuler);

    this.parts.torso.position.copy(cam.position).add(tmp.v3a.set(0, -0.55, 0));
    this.parts.torso.quaternion.copy(tmp.yawQ);

    this.parts.hips.position.copy(cam.position).add(tmp.v3a.set(0, -0.95, 0));
    this.parts.hips.quaternion.copy(tmp.yawQ);

    // Simple leg swing based on camera movement speed
    const nowPos = tmp.v3b.copy(cam.position);
    const d = nowPos.distanceTo(tmp.lastCam);
    tmp.lastCam.copy(nowPos);

    const rawSpeed = d / Math.max(0.0001, dt); // meters/sec approx
    this.state.speed = this.state.speed * 0.85 + rawSpeed * 0.15;

    const t = performance.now() * 0.008;
    const swing = Math.min(0.35, this.state.speed * 0.08);
    this.parts.leftLeg.rotation.x = Math.sin(t) * swing;
    this.parts.rightLeg.rotation.x = Math.sin(t + Math.PI) * swing;

    // Hands-only: wrist joint tracking (if provided)
    if (!frame || !refSpace || !this.state.showHands) return;

    let leftSeen = false, rightSeen = false;

    for (const src of frame.session.inputSources) {
      if (!src?.hand) continue;
      const wrist = src.hand.get("wrist");
      const pose = frame.getJointPose(wrist, refSpace);
      if (!pose) continue;

      const m = (src.handedness === "left") ? this.parts.leftHand : this.parts.rightHand;

      m.position.set(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );
      m.quaternion.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );
      m.visible = true;

      if (src.handedness === "left") leftSeen = true;
      if (src.handedness === "right") rightSeen = true;
    }

    if (!leftSeen) this.parts.leftHand.visible = false;
    if (!rightSeen) this.parts.rightHand.visible = false;
  }
}

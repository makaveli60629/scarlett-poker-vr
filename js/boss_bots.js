// js/boss_bots.js — Boss Bots with Mathematical Body Dims + Shirt Fit
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const BOT_DIMS = {
  // All units in meters
  torso: { width: 0.46, height: 0.52, depth: 0.28, y: 0.78 },
  neck:  { radius: 0.075, height: 0.06, y: 1.05 },
  head:  { radius: 0.18, y: 1.18 },

  // Shirt fit tuning
  shirt: {
    textureUrl: "assets/textures/shirt_diffuse.png",
    fit: "normal", // "tight" | "normal" | "loose"
    thickness: 0.012, // wrapper thickness
    yOffset: 0.00,
    zOffset: 0.012
  }
};

function fitMul(fit) {
  if (fit === "tight") return 1.03;
  if (fit === "loose") return 1.12;
  return 1.07; // normal
}

function makeShirtMesh(dims, tex) {
  const mul = fitMul(dims.shirt.fit);

  const w = dims.torso.width * mul;
  const h = dims.torso.height * 1.02;
  const d = dims.torso.depth * mul;

  // Outer “shirt”
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    map: tex || null,
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: 1.0,
  });

  const shirt = new THREE.Mesh(geo, mat);
  shirt.name = "bot_shirt";
  shirt.position.set(0, dims.torso.y + dims.shirt.yOffset, dims.shirt.zOffset);

  // Inner “cutout” illusion (optional): a slightly smaller dark box to fake thickness
  const innerGeo = new THREE.BoxGeometry(
    Math.max(0.01, w - dims.shirt.thickness * 2),
    Math.max(0.01, h - dims.shirt.thickness * 2),
    Math.max(0.01, d - dims.shirt.thickness * 2)
  );
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x10131a,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.45
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.copy(shirt.position);
  inner.name = "bot_shirt_inner";

  const group = new THREE.Group();
  group.name = "shirt_group";
  group.add(shirt, inner);
  return group;
}

export const BossBots = {
  group: null,
  _t: 0,
  _shirtTex: null,

  _ensureTexture() {
    if (this._shirtTex) return;
    const loader = new THREE.TextureLoader();
    this._shirtTex = loader.load(BOT_DIMS.shirt.textureUrl);
    this._shirtTex.colorSpace = THREE.SRGBColorSpace;
    this._shirtTex.anisotropy = 4;
    this._shirtTex.wrapS = THREE.RepeatWrapping;
    this._shirtTex.wrapT = THREE.RepeatWrapping;
  },

  build(scene) {
    if (this.group) scene.remove(this.group);

    this._ensureTexture();

    this.group = new THREE.Group();
    this.group.name = "BossBots";

    const center = new THREE.Vector3(0, 0, -6.5);
    const radius = 4.9;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.85 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.7 });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;

      const bot = new THREE.Group();
      bot.name = `bot_${i}`;

      // === Torso (math dims) ===
      // CapsuleGeometry(radius, length) where length is the cylindrical part
      const torsoRadius = Math.min(BOT_DIMS.torso.width, BOT_DIMS.torso.depth) * 0.5;
      const torsoCylLen = Math.max(0.01, BOT_DIMS.torso.height - torsoRadius * 2);

      const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(torsoRadius, torsoCylLen, 6, 12),
        bodyMat
      );
      torso.position.y = BOT_DIMS.torso.y;
      torso.name = "torso";

      // Slightly scale capsule to reach target width/depth precisely
      torso.scale.x = BOT_DIMS.torso.width / (torsoRadius * 2);
      torso.scale.z = BOT_DIMS.torso.depth / (torsoRadius * 2);

      // === Neck ===
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(BOT_DIMS.neck.radius, BOT_DIMS.neck.radius, BOT_DIMS.neck.height, 12),
        bodyMat
      );
      neck.position.y = BOT_DIMS.neck.y;
      neck.name = "neck";

      // === Head ===
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(BOT_DIMS.head.radius, 18, 18),
        headMat
      );
      head.position.y = BOT_DIMS.head.y;
      head.name = "head";

      // === Shirt (math fit around torso) ===
      const shirtGroup = makeShirtMesh(BOT_DIMS, this._shirtTex);
      shirtGroup.name = "shirt_group";

      // === Glow ===
      const glow = new THREE.PointLight(0x00ffaa, 0.12, 4);
      glow.position.set(0, 1.1, 0);

      bot.add(torso, neck, head, shirtGroup, glow);

      bot.position.set(
        center.x + Math.cos(a) * radius,
        0,
        center.z + Math.sin(a) * radius
      );

      bot.lookAt(center.x, 0.9, center.z);
      bot.userData.baseAngle = a;

      this.group.add(bot);
    }

    scene.add(this.group);
    return this.group;
  },

  update(dt) {
    if (!this.group) return;
    this._t += dt;

    for (const bot of this.group.children) {
      const wob = Math.sin(this._t * 1.8 + bot.userData.baseAngle) * 0.03;
      bot.position.y = wob;
      bot.rotation.y += Math.sin(this._t * 0.6 + bot.userData.baseAngle) * 0.0008;
    }
  }
};

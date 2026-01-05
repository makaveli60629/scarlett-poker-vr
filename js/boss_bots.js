// js/boss_bots.js — Patch 6.8 FULL
// Boss Bodies v1 + Upright Name Tags (never tilt) + Simple roam + Boss table show-only
//
// Goals:
// - No more colored balls: low-poly humanoid bots.
// - Name tags stay upright no matter where you look (billboard yaw-only).
// - Bosses primarily hang near BossTable, occasionally roam a bit.
// - Works without textures; clean materials; GitHub-safe.
//
// Optional integration points:
// - Expose boss list for CrownSystem / PokerSimulation: BossBots.list()
// - Expose boss head anchors for CrownSystem to attach crown: BossBots.getHeads()

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }

function makeTextSpriteCanvas(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // neon border
  ctx.strokeStyle = "rgba(0,255,170,0.8)";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 108);

  // inner border
  ctx.strokeStyle = "rgba(255,60,120,0.65)";
  ctx.lineWidth = 5;
  ctx.strokeRect(18, 18, 476, 92);

  // text
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 48px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, tex };
}

function makeNameTag(text) {
  const { tex } = makeTextSpriteCanvas(text);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    opacity: 0.95,
    roughness: 0.9,
    emissive: 0x101018,
    emissiveIntensity: 0.7,
    depthTest: true,
    depthWrite: false
  });

  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), mat);
  plate.renderOrder = 999;

  // small glow back
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.60, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.3,
      transparent: true,
      opacity: 0.10,
      roughness: 0.35
    })
  );
  back.position.z = -0.01;
  back.renderOrder = 998;

  const g = new THREE.Group();
  g.name = "NameTag";
  g.add(back, plate);

  return { group: g, plate };
}

function makeBossBody(colorA, colorB) {
  const group = new THREE.Group();
  group.name = "BossBody";

  const matA = new THREE.MeshStandardMaterial({
    color: colorA,
    roughness: 0.85,
    metalness: 0.05
  });

  const matB = new THREE.MeshStandardMaterial({
    color: colorB,
    roughness: 0.75,
    metalness: 0.08
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 6, 14), matA);
  torso.position.y = 0.95;

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), matB);
  head.position.y = 1.32;

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.06, 0.28, 6, 12);
  const armL = new THREE.Mesh(armGeo, matA);
  const armR = new THREE.Mesh(armGeo, matA);
  armL.position.set(-0.26, 1.02, 0);
  armR.position.set(0.26, 1.02, 0);
  armL.rotation.z = Math.PI / 10;
  armR.rotation.z = -Math.PI / 10;

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.30, 6, 12);
  const legL = new THREE.Mesh(legGeo, matB);
  const legR = new THREE.Mesh(legGeo, matB);
  legL.position.set(-0.11, 0.48, 0);
  legR.position.set(0.11, 0.48, 0);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.22);
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.9 });
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.11, 0.18, 0.03);
  shoeR.position.set(0.11, 0.18, 0.03);

  // Root pivot at feet
  group.add(torso, head, armL, armR, legL, legR, shoeL, shoeR);

  // Head anchor for crown attachment
  const headAnchor = new THREE.Object3D();
  headAnchor.name = "HeadAnchor";
  headAnchor.position.set(0, 1.48, 0);
  group.add(headAnchor);

  return { group, head, torso, armL, armR, legL, legR, headAnchor };
}

export const BossBots = {
  scene: null,
  camera: null,

  bots: [],
  count: 5,

  // Boss table center (adjust if your BossTable is elsewhere)
  bossCenter: new THREE.Vector3(0, 0, -6.6),
  roamRadius: 2.8,

  // motion settings (comfortable)
  speed: 0.55,
  turnSpeed: 2.2,

  init(scene, camera, { count = 5 } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.count = count;

    // clear if re-init
    for (const b of this.bots) {
      try { this.scene.remove(b.root); } catch {}
    }
    this.bots = [];

    const roster = [
      { id: "boss_0", name: "Boss Alpha", c1: 0x2a2f3a, c2: 0x00ffaa },
      { id: "boss_1", name: "Boss Beta", c1: 0x2a2f3a, c2: 0xff3c78 },
      { id: "boss_2", name: "Boss Gamma", c1: 0x1f2430, c2: 0x6ef7ff },
      { id: "boss_3", name: "Boss Delta", c1: 0x2a2f3a, c2: 0xffd04a },
      { id: "boss_4", name: "Boss Omega", c1: 0x202433, c2: 0xb56bff }
    ].slice(0, count);

    for (let i = 0; i < roster.length; i++) {
      const r = roster[i];

      const root = new THREE.Group();
      root.name = `Boss_${r.id}`;

      const body = makeBossBody(r.c1, r.c2);
      root.add(body.group);

      // name tag above head, upright yaw-only
      const tag = makeNameTag(r.name);
      tag.group.position.set(0, 1.72, 0);
      root.add(tag.group);

      // spawn around boss table in a ring
      const a = (i / roster.length) * Math.PI * 2;
      root.position.set(
        this.bossCenter.x + Math.cos(a) * 1.7,
        0,
        this.bossCenter.z + Math.sin(a) * 1.7
      );
      root.rotation.y = Math.PI + a;

      // tiny floor shadow disc
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 16),
        new THREE.MeshStandardMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.22,
          roughness: 1.0
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.01;
      root.add(shadow);

      // state
      const bot = {
        id: r.id,
        name: r.name,
        root,
        body,
        tag: tag.group,

        // motion
        t: rand(0, 10),
        target: this._newTargetNearBoss(),
        state: "roam", // roam | pause
        pauseT: rand(0.8, 2.5),

        // animation
        walkPhase: rand(0, Math.PI * 2),
        armSwing: rand(0.6, 1.0),
        legSwing: rand(0.7, 1.1)
      };

      this.bots.push(bot);
      this.scene.add(root);
    }
  },

  list() {
    return this.bots.map(b => ({ id: b.id, name: b.name }));
  },

  getHeads() {
    // For CrownSystem: [{id, head:Object3D}]
    return this.bots.map(b => ({ id: b.id, head: b.body.headAnchor }));
  },

  _newTargetNearBoss() {
    const a = rand(0, Math.PI * 2);
    const r = rand(0.8, this.roamRadius);
    return new THREE.Vector3(
      this.bossCenter.x + Math.cos(a) * r,
      0,
      this.bossCenter.z + Math.sin(a) * r
    );
  },

  _updateNameTagUpright(bot) {
    if (!this.camera || !bot?.tag) return;

    // Keep the tag upright: only yaw to face camera, NO pitch/roll.
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    const tagPos = new THREE.Vector3();
    bot.tag.getWorldPosition(tagPos);

    const dx = camPos.x - tagPos.x;
    const dz = camPos.z - tagPos.z;
    const yaw = Math.atan2(dx, dz); // yaw only

    bot.tag.rotation.set(0, yaw, 0);
  },

  _animateBody(bot, dt, moving) {
    bot.walkPhase += dt * (moving ? 7.2 : 2.2);

    const armA = bot.body.armL;
    const armB = bot.body.armR;
    const legA = bot.body.legL;
    const legB = bot.body.legR;

    if (!armA || !armB || !legA || !legB) return;

    if (moving) {
      const s = Math.sin(bot.walkPhase);
      armA.rotation.x = s * 0.65 * bot.armSwing;
      armB.rotation.x = -s * 0.65 * bot.armSwing;
      legA.rotation.x = -s * 0.75 * bot.legSwing;
      legB.rotation.x = s * 0.75 * bot.legSwing;
    } else {
      // idle breathing
      const b = Math.sin(bot.walkPhase * 0.6) * 0.12;
      armA.rotation.x = b;
      armB.rotation.x = -b;
      legA.rotation.x = -b * 0.5;
      legB.rotation.x = b * 0.5;
    }
  },

  update(dt) {
    if (!this.scene) return;

    for (const bot of this.bots) {
      bot.t += dt;

      // Occasionally pause (looks like "thinking")
      if (bot.state === "pause") {
        bot.pauseT -= dt;
        this._animateBody(bot, dt, false);
        if (bot.pauseT <= 0) {
          bot.state = "roam";
          bot.target = this._newTargetNearBoss();
        }
        this._updateNameTagUpright(bot);
        continue;
      }

      // roam
      const pos = bot.root.position;
      const to = _tmpV3.copy(bot.target).sub(pos);
      const dist = to.length();

      if (dist < 0.25) {
        bot.state = "pause";
        bot.pauseT = rand(0.8, 2.8);
        this._animateBody(bot, dt, false);
        this._updateNameTagUpright(bot);
        continue;
      }

      // desired yaw
      to.normalize();
      const desiredYaw = Math.atan2(to.x, to.z);
      let yaw = bot.root.rotation.y;

      // shortest angle
      let dy = desiredYaw - yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;

      yaw += clamp(dy, -this.turnSpeed * dt, this.turnSpeed * dt);
      bot.root.rotation.y = yaw;

      // move forward
      const forward = _tmpV3b.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      pos.addScaledVector(forward, this.speed * dt);

      // soft keep around boss center (won't wander off)
      const off = pos.clone().sub(this.bossCenter);
      const d = off.length();
      if (d > this.roamRadius + 0.6) {
        off.normalize().multiplyScalar(this.roamRadius + 0.6);
        pos.copy(this.bossCenter).add(off);
        bot.target = this._newTargetNearBoss();
      }

      this._animateBody(bot, dt, true);
      this._updateNameTagUpright(bot);
    }
  }
};

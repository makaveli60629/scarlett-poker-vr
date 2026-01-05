// js/boss_bots.js
import * as THREE from "three";

function makeNameTag(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(0.7, 0.18);
  const plane = new THREE.Mesh(geo, mat);
  plane.renderOrder = 999;

  // Make it always upright: we will manually orient each frame to camera yaw only.
  plane.userData.isNameTag = true;
  return plane;
}

function makeBotMesh(color = 0x66aaff) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.35, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
  );
  body.position.y = 0.55;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  );
  head.position.y = 0.92;

  group.add(body);
  group.add(head);

  return group;
}

export const BossBots = {
  bots: [],
  scene: null,
  camera: null,

  // patrol points (set by main/world)
  spawnPoints: [
    new THREE.Vector3(0, 0, 6),
    new THREE.Vector3(2, 0, 6),
    new THREE.Vector3(-2, 0, 6),
  ],

  init(scene, camera, opts = {}) {
    this.scene = scene;
    this.camera = camera;

    const count = opts.count ?? 4;
    this.spawnPoints = opts.spawnPoints ?? this.spawnPoints;

    this.clear();

    for (let i = 0; i < count; i++) {
      const bot = this._spawnBot(i);
      this.bots.push(bot);
      scene.add(bot.group);
    }
  },

  clear() {
    for (const b of this.bots) {
      if (b.group?.parent) b.group.parent.remove(b.group);
    }
    this.bots = [];
  },

  _spawnBot(i) {
    const colors = [0xff7777, 0x77ff99, 0x77aaff, 0xffcc66, 0xcc77ff];
    const group = new THREE.Group();
    group.name = `BOT_${i}`;

    const mesh = makeBotMesh(colors[i % colors.length]);
    group.add(mesh);

    const tag = makeNameTag(`BOT ${i + 1}`);
    tag.position.set(0, 1.18, 0);
    group.add(tag);

    const p = this.spawnPoints[i % this.spawnPoints.length]?.clone() ?? new THREE.Vector3(0, 0, 6);
    group.position.copy(p);

    return {
      group,
      tag,
      target: p.clone(),
      t: Math.random() * 10
    };
  },

  update(dt) {
    if (!this.scene || !this.camera) return;

    // Camera yaw for name tags (upright)
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    const yaw = Math.atan2(camDir.x, camDir.z); // face camera direction
    for (const b of this.bots) {
      // simple wandering
      b.t += dt;

      if (b.t > 3.5) {
        b.t = 0;
        const sp = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        if (sp) b.target.copy(sp);
      }

      const pos = b.group.position;
      const dir = new THREE.Vector3().subVectors(b.target, pos);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 0.05) {
        dir.normalize();
        pos.addScaledVector(dir, dt * 0.45);
        b.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      // keep tag upright and facing camera
      if (b.tag) {
        b.tag.rotation.set(0, yaw + Math.PI, 0);
      }
    }
  }
};

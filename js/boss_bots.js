import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makeNameTag(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const geo = new THREE.PlaneGeometry(0.8, 0.2);

  const plane = new THREE.Mesh(geo, mat);
  plane.userData.isNameTag = true;
  return plane;
}

function makeBot(color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.38, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
  );
  body.position.y = 0.55;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
  );
  head.position.y = 0.93;

  group.add(body, head);
  return group;
}

export const BossBots = {
  bots: [],
  scene: null,
  camera: null,

  // A loop path away from spawn area
  path: [
    new THREE.Vector3(-5, 0, -5),
    new THREE.Vector3( 0, 0, -6),
    new THREE.Vector3( 5, 0, -5),
    new THREE.Vector3( 6, 0,  0),
    new THREE.Vector3( 5, 0,  5),
    new THREE.Vector3( 0, 0,  6),
    new THREE.Vector3(-5, 0,  5),
    new THREE.Vector3(-6, 0,  0),
  ],

  init(scene, camera, opts = {}) {
    this.scene = scene;
    this.camera = camera;
    this.clear();

    const count = opts.count ?? 5;
    const colors = [0xff7777, 0x77ff99, 0x77aaff, 0xffcc66, 0xcc77ff];

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      group.name = `BOSS_BOT_${i}`;

      const mesh = makeBot(colors[i % colors.length]);
      group.add(mesh);

      const tag = makeNameTag(`BOSS ${i + 1}`);
      tag.position.set(0, 1.25, 0);
      group.add(tag);

      // Start them at a far path point
      const start = this.path[(i * 2) % this.path.length].clone();
      group.position.copy(start);

      this.scene.add(group);

      this.bots.push({
        group,
        tag,
        waypointIndex: (i * 2) % this.path.length,
        speed: 0.55 + Math.random() * 0.2
      });
    }
  },

  clear() {
    for (const b of this.bots) {
      if (b.group?.parent) b.group.parent.remove(b.group);
    }
    this.bots = [];
  },

  update(dt) {
    if (!this.camera) return;

    // name tags: face camera but stay upright
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const yaw = Math.atan2(camDir.x, camDir.z);

    for (const b of this.bots) {
      // advance along path
      const target = this.path[b.waypointIndex];
      const pos = b.group.position;

      const dir = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
      const dist = dir.length();

      if (dist < 0.15) {
        b.waypointIndex = (b.waypointIndex + 1) % this.path.length;
      } else {
        dir.normalize();
        pos.addScaledVector(dir, dt * b.speed);
        b.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      if (b.tag) b.tag.rotation.set(0, yaw + Math.PI, 0);
    }
  }
};

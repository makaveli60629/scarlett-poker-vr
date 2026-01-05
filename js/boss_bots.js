// js/boss_bots.js — Boss Bots (seat at Boss Table)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makeNameTag(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,0.55)";
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

  bossCenter: new THREE.Vector3(0, 0, -6.5),
  seatRadius: 3.55,

  // roam targets (outside boss zone)
  roamPoints: [
    new THREE.Vector3(10, 0, 8),
    new THREE.Vector3(-10, 0, 8),
    new THREE.Vector3(10, 0, -10),
    new THREE.Vector3(-10, 0, -10),
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

      // Seat positions around boss table
      const a = (i / count) * Math.PI * 2;
      const seat = new THREE.Vector3(
        this.bossCenter.x + Math.sin(a) * this.seatRadius,
        0,
        this.bossCenter.z + Math.cos(a) * this.seatRadius
      );

      group.position.copy(seat);
      group.rotation.y = a + Math.PI; // face inward

      this.scene.add(group);

      this.bots.push({
        group,
        tag,
        home: seat.clone(),
        state: "SEATED", // SEATED -> ROAM -> RETURN
        roamTarget: null,
        speed: 0.7 + Math.random() * 0.2,
        roamTimer: 6 + Math.random() * 6
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

    // Keep name tags upright facing camera (no head-tilt)
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const yaw = Math.atan2(camDir.x, camDir.z);

    for (const b of this.bots) {
      if (b.tag) b.tag.rotation.set(0, yaw + Math.PI, 0);

      // roaming logic (rare, “every once in a while”)
      b.roamTimer -= dt;
      if (b.state === "SEATED" && b.roamTimer <= 0) {
        b.state = "ROAM";
        b.roamTarget = this.roamPoints[Math.floor(Math.random() * this.roamPoints.length)].clone();
      }

      if (b.state === "ROAM") {
        this._moveToward(b, b.roamTarget, dt);
        if (b.group.position.distanceTo(b.roamTarget) < 0.35) {
          b.state = "RETURN";
        }
      } else if (b.state === "RETURN") {
        this._moveToward(b, b.home, dt);
        if (b.group.position.distanceTo(b.home) < 0.25) {
          b.state = "SEATED";
          b.roamTarget = null;
          b.roamTimer = 10 + Math.random() * 10;
          // face inward again
          const dx = b.home.x - this.bossCenter.x;
          const dz = b.home.z - this.bossCenter.z;
          b.group.rotation.y = Math.atan2(dx, dz) + Math.PI;
        }
      }
    }
  },

  _moveToward(bot, target, dt) {
    const pos = bot.group.position;
    const dir = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
    const dist = dir.length();
    if (dist < 0.0001) return;

    dir.normalize();
    pos.addScaledVector(dir, dt * bot.speed);

    bot.group.rotation.y = Math.atan2(dir.x, dir.z);
  }
};

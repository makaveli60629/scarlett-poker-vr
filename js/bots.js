// js/bots.js — Simple Bot Ring + Chairs (8.0.5)
import * as THREE from "./three.js";

export const Bots = {
  bots: [],
  chairs: [],
  seats: [],

  build(scene, center, radius, opts = {}) {
    const seatCount = opts.seatCount ?? 6;
    const seatY = opts.seatY ?? 0;

    this.bots = [];
    this.chairs = [];
    this.seats = [];

    const group = new THREE.Group();
    group.name = "BotsGroup";
    scene.add(group);

    // Chair styling (safe colors; later we texture)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.95 });
    const botMat = new THREE.MeshStandardMaterial({
      color: 0x1a2233,
      roughness: 0.6,
      emissive: 0x001122,
      emissiveIntensity: 0.35,
    });

    for (let i = 0; i < seatCount; i++) {
      const t = (i / seatCount) * Math.PI * 2;

      const x = center.x + Math.cos(t) * radius;
      const z = center.z + Math.sin(t) * radius;

      // Seat position
      const seatPos = new THREE.Vector3(x, seatY, z);

      // Chair (simple but nice silhouette)
      const chair = new THREE.Group();
      chair.name = `Chair_${i}`;
      chair.position.copy(seatPos);

      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.08, 0.55),
        chairMat
      );
      seat.position.y = 0.45;

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.6, 0.08),
        chairMat
      );
      back.position.set(0, 0.78, -0.24);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.45, 14),
        new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.85 })
      );
      base.position.y = 0.22;

      chair.add(seat, back, base);

      // Bot (simple "head + body" for now)
      const bot = new THREE.Group();
      bot.name = `Bot_${i}`;
      bot.position.copy(seatPos);

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16, 0.35, 6, 12),
        botMat
      );
      body.position.y = 0.72;

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 18, 14),
        new THREE.MeshStandardMaterial({
          color: 0x2a3d66,
          roughness: 0.4,
          emissive: 0x001a44,
          emissiveIntensity: 0.45,
        })
      );
      head.position.y = 0.98;

      bot.add(body, head);

      // Face the table center
      chair.lookAt(center.x, chair.position.y, center.z);
      bot.lookAt(center.x, bot.position.y, center.z);

      group.add(chair);
      group.add(bot);

      this.chairs.push(chair);
      this.bots.push(bot);
      this.seats.push({
        index: i,
        position: seatPos.clone(),
        lookAt: center.clone(),
        bot,
        chair,
      });
    }

    return { seats: this.seats, bots: this.bots };
  },

  update(dt) {
    // light idle bob so they feel alive
    const t = performance.now() * 0.001;
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot) continue;
      bot.position.y = 0 + Math.sin(t * 1.2 + i) * 0.01;
    }
  },
};

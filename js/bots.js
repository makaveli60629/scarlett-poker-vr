// js/bots.js — Simple seated bot placeholders (8.0.3)
import * as THREE from "./three.js";

export const Bots = {
  group: null,
  seats: [],
  bots: [],

  build(scene, tableCenter = new THREE.Vector3(0, 0, -6.5), radius = 2.35) {
    this.group = new THREE.Group();
    this.group.name = "Bots";
    scene.add(this.group);

    // 6 seats around a circle
    this.seats = [];
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2;
      const x = tableCenter.x + Math.cos(t) * radius;
      const z = tableCenter.z + Math.sin(t) * radius;
      this.seats.push(new THREE.Vector3(x, 0, z));
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.85 });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.55, 16);
    const headGeo = new THREE.SphereGeometry(0.16, 18, 14);

    this.bots = [];
    for (let i = 0; i < this.seats.length; i++) {
      const p = this.seats[i];

      const bot = new THREE.Group();
      bot.name = `Bot_${i}`;

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.28;

      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.65;

      bot.add(body, head);

      // Face the table center
      bot.position.set(p.x, 0, p.z);
      bot.lookAt(tableCenter.x, 0.5, tableCenter.z);

      this.group.add(bot);
      this.bots.push(bot);
    }

    return { group: this.group, seats: this.seats, bots: this.bots };
  },

  update(dt) {
    // subtle idle motion
    if (!this.bots?.length) return;
    const t = performance.now() * 0.001;
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      b.rotation.y += Math.sin(t + i) * 0.0006;
    }
  },
};

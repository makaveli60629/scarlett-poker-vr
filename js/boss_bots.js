// /js/boss_bots.js — Simple Boss Bots (CLEAN)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const BossBots = {
  group: null,
  _t: 0,

  build(scene) {
    if (this.group) scene.remove(this.group);

    this.group = new THREE.Group();
    this.group.name = "BossBots";

    const center = new THREE.Vector3(0, 0, -6.5);
    const radius = 4.9;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, roughness: 0.85 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.7 });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;

      const bot = new THREE.Group();
      bot.name = `boss_bot_${i}`;

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.38, 6, 12), bodyMat);
      body.position.y = 0.75;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), headMat);
      head.position.y = 1.18;

      const glow = new THREE.PointLight(0x00ffaa, 0.12, 4);
      glow.position.set(0, 1.1, 0);

      bot.add(body, head, glow);

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

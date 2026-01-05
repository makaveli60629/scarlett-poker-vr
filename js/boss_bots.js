// js/boss_bots.js — VIP walkers (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const BossBots = {
  group: null,
  bots: [],

  build(scene) {
    this.group = new THREE.Group();
    this.group.name = "BossBots";
    scene.add(this.group);

    this.bots = [];
    const positions = [
      new THREE.Vector3(-4, 0, -2),
      new THREE.Vector3(4, 0, -2),
      new THREE.Vector3(-4, 0, 2),
      new THREE.Vector3(4, 0, 2),
    ];

    for (let i = 0; i < positions.length; i++) {
      const bot = this._makeBot(`Bot_${i + 1}`);
      bot.position.copy(positions[i]);
      bot.userData.phase = Math.random() * Math.PI * 2;
      bot.userData.base = positions[i].clone();
      this.group.add(bot);
      this.bots.push(bot);
    }
  },

  update(dt) {
    for (const bot of this.bots) {
      bot.userData.phase += dt * 0.9;
      const p = bot.userData.phase;

      // Simple back/forth pacing
      bot.position.x = bot.userData.base.x + Math.sin(p) * 1.4;
      bot.position.z = bot.userData.base.z + Math.cos(p) * 0.7;

      // face direction
      bot.rotation.y = Math.atan2(
        bot.position.x - bot.userData.base.x,
        bot.position.z - bot.userData.base.z
      );
    }
  },

  _makeBot(name) {
    const g = new THREE.Group();
    g.name = name;

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.5, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.9 })
    );
    body.position.y = 0.85;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0x404050, roughness: 0.75 })
    );
    head.position.y = 1.32;

    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.14),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.8
      })
    );
    tag.position.set(0, 1.55, 0);
    tag.rotation.y = Math.PI;

    g.add(body, head, tag);
    return g;
  }
};

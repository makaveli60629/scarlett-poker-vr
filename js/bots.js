// /js/bots.js — Crowd Bots Starter (init(context))
// Goal: make lobby feel alive even before full poker AI is wired.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export async function init({ scene }) {
  const bots = new THREE.Group();
  bots.name = "BotsCrowd";
  scene.add(bots);

  const seatedCount = 8;
  const roamCount = 8;

  const mkBot = (color=0x4aa3ff) => {
    const g = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.15 })
    );
    head.position.y = 1.62;

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.10, 0.30, 6, 12),
      new THREE.MeshStandardMaterial({ color: color ^ 0x222222, roughness: 0.7, metalness: 0.1 })
    );
    body.position.y = 1.25;

    g.add(head, body);
    return g;
  };

  // Seated ring around table
  const seatedR = 3.15;
  for (let i=0; i<seatedCount; i++) {
    const a = (i / seatedCount) * Math.PI * 2;
    const b = mkBot(0x00ffaa);
    b.position.set(Math.cos(a)*seatedR, 0, Math.sin(a)*seatedR);
    b.rotation.y = -a + Math.PI/2;
    bots.add(b);
  }

  // Roamers loop around perimeter
  const roamers = [];
  const roamR = 12.0;
  for (let i=0; i<roamCount; i++) {
    const a = (i / roamCount) * Math.PI * 2;
    const b = mkBot(0xff2bd6);
    b.userData.t = a;
    b.position.set(Math.cos(a)*roamR, 0, Math.sin(a)*roamR);
    bots.add(b);
    roamers.push(b);
  }

  // Simple animation loop hook: we attach to scene.userData so main loop can call if you want later.
  scene.userData._botsUpdate = (dt) => {
    for (const b of roamers) {
      b.userData.t += dt * 0.35; // speed
      const t = b.userData.t;

      const x = Math.cos(t) * roamR;
      const z = Math.sin(t) * roamR;
      const x2 = Math.cos(t + 0.02) * roamR;
      const z2 = Math.sin(t + 0.02) * roamR;

      b.position.set(x, 0, z);
      b.lookAt(x2, 1.4, z2);
    }
  };
      }

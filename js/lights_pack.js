// js/lights_pack.js — Ambient casino lighting accents
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const LightsPack = {
  build(scene) {
    // Core ambient so nothing is ever "black"
    const amb = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(amb);

    // Main table key light
    const key = new THREE.SpotLight(0xffffff, 1.1, 25, Math.PI / 5, 0.4, 1.0);
    key.position.set(0, 9.5, 2);
    key.target.position.set(0, 0.9, 0);
    scene.add(key);
    scene.add(key.target);

    // Boss table hero light
    const boss = new THREE.SpotLight(0x00ffaa, 0.75, 22, Math.PI / 6, 0.5, 1.0);
    boss.position.set(0, 9.0, -6.5);
    boss.target.position.set(0, 1.0, -6.5);
    scene.add(boss);
    scene.add(boss.target);

    // Perimeter “wall edge” lights (approx box)
    const edgeY = 2.1;
    const span = 16;

    const edge1 = new THREE.PointLight(0x00ffaa, 0.35, 18);
    edge1.position.set(span, edgeY, 0);
    scene.add(edge1);

    const edge2 = new THREE.PointLight(0xff3366, 0.28, 18);
    edge2.position.set(-span, edgeY, 0);
    scene.add(edge2);

    const edge3 = new THREE.PointLight(0x00ffaa, 0.28, 18);
    edge3.position.set(0, edgeY, span);
    scene.add(edge3);

    const edge4 = new THREE.PointLight(0xff3366, 0.24, 18);
    edge4.position.set(0, edgeY, -span);
    scene.add(edge4);

    // Picture frame glow anchors (generic positions)
    const frames = [
      new THREE.Vector3(6.5, 1.8, 2.2),
      new THREE.Vector3(-6.5, 1.8, 2.2),
      new THREE.Vector3(6.5, 1.8, -2.2),
      new THREE.Vector3(-6.5, 1.8, -2.2),
    ];

    for (let i = 0; i < frames.length; i++) {
      const p = frames[i];
      const glow = new THREE.PointLight(i % 2 === 0 ? 0x00ffaa : 0xff3366, 0.22, 6.5);
      glow.position.copy(p);
      scene.add(glow);
    }
  }
};

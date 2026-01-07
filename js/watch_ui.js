// /js/watch_ui.js — Minimal Watch UI placeholder (init(context))

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export async function init({ camera }) {
  // Tiny “watch” block attached to camera for now (easy to see in dev)
  const g = new THREE.Group();
  g.position.set(-0.12, -0.12, -0.35);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.6, metalness: 0.2, emissive: 0x002018, emissiveIntensity: 0.55 })
  );
  g.add(body);

  const glow = new THREE.PointLight(0x00ffaa, 0.4, 1.2);
  glow.position.set(0, 0, 0.05);
  g.add(glow);

  camera.add(g);
}

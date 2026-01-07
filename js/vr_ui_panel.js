// /js/vr_ui_panel.js — Minimal VR UI Panel (init(context))
// Shows a floating panel near the lobby pad that you can see while testing.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export async function init({ scene, worldData }) {
  // place near lobby pad
  const p = worldData?.padById?.lobby?.position || new THREE.Vector3(0, 0, 11.5);

  const panel = new THREE.Group();
  panel.position.set(p.x, 1.65, p.z - 2.4);

  // Backplate
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.75),
    new THREE.MeshStandardMaterial({
      color: 0x08120f,
      roughness: 0.55,
      metalness: 0.15,
      emissive: 0x002a1b,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.92,
    })
  );
  panel.add(back);

  // Title bar
  const bar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 0.7 })
  );
  bar.position.set(0, 0.315, 0.001);
  panel.add(bar);

  // Faux “buttons”
  const mkBtn = (x, y, w, h, c) => {
    const b = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2 })
    );
    b.position.set(x, y, 0.002);
    panel.add(b);
    return b;
  };

  mkBtn(-0.45, 0.05, 0.45, 0.18, 0x123a2a);
  mkBtn( 0.05, 0.05, 0.45, 0.18, 0x123a2a);
  mkBtn(-0.45,-0.20, 0.45, 0.18, 0x1b2430);
  mkBtn( 0.05,-0.20, 0.45, 0.18, 0x1b2430);

  // Light so it’s never “invisible”
  const pl = new THREE.PointLight(0xffffff, 0.7, 6);
  pl.position.set(0, 0.2, 0.5);
  panel.add(pl);

  scene.add(panel);
}

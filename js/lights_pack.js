// js/lights_pack.js — Bright + pretty lighting for Quest (8.0)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const LightsPack = {
  build(scene) {
    // Ambient fill
    const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x0a0b10, 0.95);
    scene.add(hemi);

    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(amb);

    // Key light
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(5, 9, 6);
    key.castShadow = false;
    scene.add(key);

    // VIP neon accents
    const cyan = new THREE.PointLight(0x00ffaa, 0.65, 18);
    cyan.position.set(0, 3.5, -6);
    scene.add(cyan);

    const mag = new THREE.PointLight(0xff3c78, 0.42, 16);
    mag.position.set(4, 2.8, 0);
    scene.add(mag);
  }
};

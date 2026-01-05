// js/store_kiosk.js — Store kiosk (visual now, interactable later)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TextureBank } from "./textures.js";
import { registerCollider } from "./state.js";

export const StoreKiosk = {
  group: null,

  build(scene, pos = { x: -6.5, y: 0, z: 5.5 }) {
    this.group = new THREE.Group();
    this.group.name = "StoreKiosk";
    this.group.position.set(pos.x, pos.y, pos.z);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85,
      metalness: 0.1
    });

    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f14,
      roughness: 0.35,
      metalness: 0.05,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.35
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.8), frameMat);
    base.position.y = 0.45;

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.45), frameMat);
    stand.position.y = 1.25;

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), screenMat);
    screen.position.set(0, 1.45, 0.41);

    // Optional kiosk panel texture (safe fallback)
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.18),
      TextureBank.matFromTexture("store_sign.png", 0x222222, { roughness: 0.7, emissive: 0x001a12, emissiveIntensity: 0.35 })
    );
    panel.position.set(0, 1.05, 0.41);

    // Glow strip
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.06, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.2,
        roughness: 0.35
      })
    );
    glow.position.set(0, 1.78, 0.32);

    this.group.add(base, stand, screen, panel, glow);
    scene.add(this.group);

    // Solid collider placeholders
    try { registerCollider(base); } catch {}
    try { registerCollider(stand); } catch {}

    return this.group;
  }
};

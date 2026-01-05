// js/chip.js — Event Chip pedestal display (safe image fallback)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { TextureBank } from "./textures.js";
import { registerCollider } from "./state.js";

export const EventChip = {
  group: null,

  build(scene, pos = { x: 6.5, y: 0, z: 5.5 }) {
    this.group = new THREE.Group();
    this.group.name = "EventChipDisplay";
    this.group.position.set(pos.x, pos.y, pos.z);

    // Pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.55, 20),
      new THREE.MeshStandardMaterial({
        color: 0x141414,
        roughness: 0.85,
        metalness: 0.1,
        emissive: 0x001015,
        emissiveIntensity: 0.35
      })
    );
    ped.position.y = 0.28;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.06, 10, 44),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 1.4,
        roughness: 0.35
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.58;

    // Chip (double-sided planes for PNG + alpha)
    const chipMat = TextureBank.matFromImage("assets/chips/event_chip.png", 0xd4af37, {
      roughness: 0.45,
      metalness: 0.25,
      transparent: true,
      alphaTest: 0.02,
      emissive: 0x001a12,
      emissiveIntensity: 0.25
    });

    const chipFront = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), chipMat);
    chipFront.position.y = 0.92;

    const chipBack = chipFront.clone();
    chipBack.rotation.y = Math.PI;

    // Edge (fallback “coin” body)
    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.06, 40),
      new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.55,
        metalness: 0.3
      })
    );
    edge.position.y = 0.92;
    edge.rotation.x = Math.PI / 2;

    const chip = new THREE.Group();
    chip.add(edge, chipFront, chipBack);
    chip.position.y = 0.0;
    chip.rotation.x = -Math.PI / 2;

    // Light
    const spot = new THREE.PointLight(0x00ffaa, 0.65, 8);
    spot.position.set(0, 2.0, 0);

    this.group.add(ped, ring, chip, spot);
    scene.add(this.group);

    try { registerCollider(ped); } catch {}

    return this.group;
  },

  update(dt) {
    if (!this.group) return;
    const chip = this.group.children.find(c => c.type === "Group");
    if (chip) chip.rotation.z += dt * 0.6;
  }
};

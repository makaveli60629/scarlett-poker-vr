// js/solid_walls.js — Patch 6.3
// Creates solid perimeter walls (visual + colliders). No textures required.
// You can later swap materials to TextureBank safely.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { registerCollider } from "./collision.js";

export const SolidWalls = {
  group: null,

  // bounds define the lobby "box"
  build(scene, opts = {}) {
    const {
      halfX = 14,       // left/right extent
      halfZ = 14,       // front/back extent
      height = 4.2,     // wall height
      thickness = 0.35, // wall thickness
      y = 0,            // floor level
      doorGap = 0,      // if you want an opening later (0 = no opening)
    } = opts;

    this.group = new THREE.Group();
    this.group.name = "SolidWalls";

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x12161c,
      roughness: 0.95,
      metalness: 0.05,
      emissive: 0x001015,
      emissiveIntensity: 0.28
    });

    // Four wall boxes
    const makeWall = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);

    // +Z wall (front)
    const front = makeWall(halfX * 2 + thickness, height, thickness);
    front.position.set(0, y + height / 2, halfZ);
    this.group.add(front);

    // -Z wall (back)
    const back = makeWall(halfX * 2 + thickness, height, thickness);
    back.position.set(0, y + height / 2, -halfZ);
    this.group.add(back);

    // +X wall (right)
    const right = makeWall(thickness, height, halfZ * 2 + thickness);
    right.position.set(halfX, y + height / 2, 0);
    this.group.add(right);

    // -X wall (left)
    const left = makeWall(thickness, height, halfZ * 2 + thickness);
    left.position.set(-halfX, y + height / 2, 0);
    this.group.add(left);

    // Optional: ceiling “edge glow” strip (visual only)
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 1.05,
      roughness: 0.35,
      transparent: true,
      opacity: 0.18
    });

    const led = new THREE.Mesh(
      new THREE.TorusGeometry(Math.min(halfX, halfZ) + 1.8, 0.08, 10, 90),
      glowMat
    );
    led.rotation.x = Math.PI / 2;
    led.position.y = y + height - 0.2;
    this.group.add(led);

    scene.add(this.group);

    // Register colliders (these are BIG and critical)
    registerCollider(front, { name: "wall_front", pad: 0.10 });
    registerCollider(back, { name: "wall_back", pad: 0.10 });
    registerCollider(left, { name: "wall_left", pad: 0.10 });
    registerCollider(right, { name: "wall_right", pad: 0.10 });

    return this.group;
  }
};

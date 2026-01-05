// js/vip_room.js — Patch 7.1 FULL
// VIP Poker Room build-out:
// - Fancy VIP table + velvet rug + gold trims
// - Rope barrier vibe + doorway arch
// - VIP spotlight + trophy wall moved here (optional via anchor hook)
// - Always solid feel (visual); physical collisions handled by your Collision module if used.
//
// Usage from main.js:
//   import { VIPRoom } from "./vip_room.js";
//   VIPRoom.build(RoomManager.getRoom("VIP Poker Room").group);

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makeMat(color, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.10,
    emissive,
    emissiveIntensity
  });
}

export const VIPRoom = {
  group: null,

  build(parentGroup) {
    if (!parentGroup) return;

    // remove previous
    const old = parentGroup.getObjectByName("VIPRoomBuild");
    if (old) parentGroup.remove(old);

    const g = new THREE.Group();
    g.name = "VIPRoomBuild";
    parentGroup.add(g);
    this.group = g;

    // --- Rug ---
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0x2a0f1a, // deep velvet
        roughness: 1.0,
        metalness: 0.0,
        transparent: true,
        opacity: 0.95
      })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.004, 0);
    g.add(rug);

    const rugRing = new THREE.Mesh(
      new THREE.RingGeometry(4.75, 5.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0xffd04a,
        emissive: 0xffd04a,
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.45,
        transparent: true,
        opacity: 0.55
      })
    );
    rugRing.rotation.x = -Math.PI / 2;
    rugRing.position.y = 0.006;
    g.add(rugRing);

    // --- VIP Table (fancy oval) ---
    const tableTop = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.85, 2.65, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0f6b49, // rich green felt
        roughness: 0.95,
        metalness: 0.0
      })

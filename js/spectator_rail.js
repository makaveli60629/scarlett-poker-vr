// js/spectator_rail.js — VIP rope + posts + rail around a circle
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const SpectatorRail = {
  group: null,

  build(scene, center, radius = 4.1, opts = {}) {
    const {
      postCount = 18,
      postHeight = 1.1,
      ropeHeight = 0.85,
      railHeight = 0.35,
    } = opts;

    this.group = new THREE.Group();
    this.group.name = "SpectatorRail";
    this.group.position.set(0, 0, 0);

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x101010,
      roughness: 0.75,
      metalness: 0.2,
      emissive: 0x001a12,
      emissiveIntensity: 0.25
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0xffd04a,
      roughness: 0.35,
      metalness: 0.35,
      emissive: 0x2a1a00,
      emissiveIntensity: 0.35
    });

    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0x7a001e,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0x220

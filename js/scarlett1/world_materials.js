import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { makeGridCarpetTexture } from "./world_helpers.js";

export function createMaterials(quality = "quest") {
  const carpetTex = makeGridCarpetTexture(512);

  const matCarpet = new THREE.MeshStandardMaterial({
    map: carpetTex, roughness: 0.95, metalness: 0.02
  });

  const matConcrete = new THREE.MeshStandardMaterial({
    color: 0x1b1f24, roughness: 0.98, metalness: 0.02
  });

  const matWall = new THREE.MeshStandardMaterial({
    color: 0x0f141a, roughness: 0.85, metalness: 0.08
  });

  const matTrim = new THREE.MeshStandardMaterial({
    color: 0x1a5cff,
    roughness: 0.25,
    metalness: 0.65,
    emissive: new THREE.Color(0x0c2a66),
    emissiveIntensity: 0.65
  });

  const matGold = new THREE.MeshStandardMaterial({
    color: 0xf3c969,
    roughness: 0.35,
    metalness: 0.85,
    emissive: new THREE.Color(0x120c02),
    emissiveIntensity: 0.25
  });

  const matNeonPink = new THREE.MeshStandardMaterial({
    color: 0xff2aa6,
    roughness: 0.25,
    metalness: 0.45,
    emissive: new THREE.Color(0x3a001a),
    emissiveIntensity: 0.85
  });

  const matNeonCyan = new THREE.MeshStandardMaterial({
    color: 0x2aa6ff,
    roughness: 0.25,
    metalness: 0.45,
    emissive: new THREE.Color(0x001b33),
    emissiveIntensity: 0.85
  });

  return {
    carpetTex,
    matCarpet, matConcrete, matWall,
    matTrim, matGold, matNeonPink, matNeonCyan
  };
}

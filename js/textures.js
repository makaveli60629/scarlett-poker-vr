// /js/textures.js — Skylark Poker VR
// GitHub Pages safe texture helper

import * as THREE from "./three.js";

const loader = new THREE.TextureLoader();

function load(path, repeatX = 1, repeatY = 1) {
  const tex = loader.load(
    path,
    t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.colorSpace = THREE.SRGBColorSpace;
    },
    undefined,
    () => {
      console.warn("⚠️ Missing texture:", path);
    }
  );
  return tex;
}

export const TextureBank = {
  /**
   * Standard PBR material with optional texture
   */
  standard({
    map = null,
    color = 0xffffff,
    roughness = 0.85,
    metalness = 0.05,
    repeatX = 1,
    repeatY = 1
  } = {}) {
    let tex = null;
    if (map) tex = load(map, repeatX, repeatY);

    return new THREE.MeshStandardMaterial({
      map: tex,
      color: tex ? 0xffffff : color,
      roughness,
      metalness
    });
  },

  /**
   * Simple colored fallback (never fails)
   */
  color(color = 0x888888) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0.05
    });
  }
};

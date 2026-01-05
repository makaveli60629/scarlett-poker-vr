// ===============================
// Skylark Poker VR — js/textures.js (TextureBank + Textures)
// ===============================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const loader = new THREE.TextureLoader();

function safeLoadTexture(url) {
  return new Promise((resolve) => {
    try {
      loader.load(
        url,
        (tex) => resolve(tex),
        undefined,
        () => resolve(null)
      );
    } catch {
      resolve(null);
    }
  });
}

function matFromTextureOrColor(tex, color = 0x888888, roughness = 0.9, metalness = 0.0) {
  if (tex) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness, metalness });
  }
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export const Textures = {
  // You can map your filenames here later:
  // wall: "assets/textures/brick.jpg",
  // floor: "assets/textures/carpet.jpg",
};

export const TextureBank = {
  _cache: new Map(),

  async getMaterial(keyOrUrl, fallbackColor = 0x777777, opts = {}) {
    const url = Textures[keyOrUrl] || keyOrUrl;
    const cacheKey = `${url}|${fallbackColor}`;

    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    // If url doesn't look like a path, treat it as "missing" -> fallback
    if (typeof url !== "string" || (!url.includes("/") && !url.includes("."))) {
      const m = matFromTextureOrColor(null, fallbackColor, opts.roughness ?? 0.9, opts.metalness ?? 0.0);
      this._cache.set(cacheKey, m);
      return m;
    }

    const tex = await safeLoadTexture(url);
    const mat = matFromTextureOrColor(tex, fallbackColor, opts.roughness ?? 0.9, opts.metalness ?? 0.0);
    this._cache.set(cacheKey, mat);
    return mat;
  },

  // Non-async quick fallback material
  getFallbackMaterial(color = 0x777777, roughness = 0.9, metalness = 0.0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
};

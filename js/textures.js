// js/textures.js — TextureBank (GitHub-safe, fallback colors)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const TextureBank = {
  loader: new THREE.TextureLoader(),
  cache: new Map(),

  /**
   * Returns a MeshStandardMaterial:
   * - tries to load texture from assets/textures/<file>
   * - if it fails, uses fallback color
   */
  matFromTexture(file, fallbackColor = 0x777777, opts = {}) {
    const key = `TEX:${file}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const {
      repeatX = 1,
      repeatY = 1,
      roughness = 0.9,
      metalness = 0.05,
      emissive = 0x000000,
      emissiveIntensity = 0.0
    } = opts;

    const mat = new THREE.MeshStandardMaterial({
      color: fallbackColor,
      roughness,
      metalness,
      emissive,
      emissiveIntensity
    });

    const path = `assets/textures/${file}`;

    try {
      const tex = this.loader.load(
        path,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(repeatX, repeatY);
          mat.map = t;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        () => {
          // Missing texture = stay fallback color
          console.warn("Missing texture:", path);
        }
      );
      // keep reference so GC doesn't drop it
      mat.userData._tex = tex;
    } catch (e) {
      console.warn("Texture load failed:", path, e);
    }

    this.cache.set(key, mat);
    return mat;
  },

  /**
   * Loads an image as a map from any path (like assets/chips/event_chip.png)
   */
  matFromImage(path, fallbackColor = 0xaaaaaa, opts = {}) {
    const key = `IMG:${path}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const {
      roughness = 0.55,
      metalness = 0.15,
      transparent = true,
      alphaTest = 0.02,
      emissive = 0x000000,
      emissiveIntensity = 0.0
    } = opts;

    const mat = new THREE.MeshStandardMaterial({
      color: fallbackColor,
      roughness,
      metalness,
      transparent,
      alphaTest,
      emissive,
      emissiveIntensity
    });

    try {
      const tex = this.loader.load(
        path,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          mat.map = t;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        () => {
          console.warn("Missing image:", path);
        }
      );
      mat.userData._tex = tex;
    } catch (e) {
      console.warn("Image load failed:", path, e);
    }

    this.cache.set(key, mat);
    return mat;
  }
};

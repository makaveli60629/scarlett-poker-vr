import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Chip sprites using chips.png atlas (if present).
 * This is a best-effort generic sprite slice; refine UVs later if desired.
 */
export function createChipSpriteFactory(chipsTex) {
  if (!chipsTex) return null;

  chipsTex.flipY = false;

  function makeSprite(u0, v0, u1, v1) {
    const t = chipsTex.clone();
    t.needsUpdate = true;
    t.repeat.set(u1-u0, v1-v0);
    t.offset.set(u0, v0);

    const mat = new THREE.SpriteMaterial({ map: t, transparent: true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.12, 0.12, 0.12);
    return spr;
  }

  function createGenericChip() {
    return makeSprite(0.25, 0.25, 0.75, 0.75);
  }

  return { createGenericChip };
}

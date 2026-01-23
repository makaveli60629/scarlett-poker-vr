import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Scorpion Room Variant:
 * Adds neon ring and swaps felt to table_atlas.jpg if available.
 */
export function applyScorpionVariant({ scene, pokerSystem, textureLoader, toast }) {
  if (!pokerSystem?.pokerSurface) return null;

  const scorpionTex = textureLoader.load('assets/textures/table_atlas.jpg', undefined, undefined, () => null);
  if (scorpionTex) {
    pokerSystem.pokerSurface.material.map = scorpionTex;
    pokerSystem.pokerSurface.material.needsUpdate = true;
  }

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(6.05, 0.06, 12, 96),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.5, roughness: 0.2 })
  );
  ring.rotation.x = Math.PI/2;
  ring.position.y = -0.02;
  ring.name = 'Scorpion_NeonRing';
  scene.add(ring);

  toast?.('Scorpion Room: ON');
  return () => { scene.remove(ring); toast?.('Scorpion Room: OFF'); };
}

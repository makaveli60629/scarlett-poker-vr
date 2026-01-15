// /js/scarlett1/world_decor.js
import { C } from "./world_constants.js";

export function buildDecor(THREE, group, mats, layout) {
  // Neon trim ring around lobby
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(C.LOBBY_R - 0.8, 0.18, 12, 64),
    mats.neonCyan
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.08;
  group.add(trim);

  // Center pit ring accent
  const pitRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.5, 0.22, 10, 60),
    mats.neonMagenta
  );
  pitRing.rotation.x = Math.PI / 2;
  pitRing.position.y = 0.09;
  group.add(pitRing);

  // Simple “rail” segments near pit (placeholder for your real table pit rail)
  const rails = new THREE.Group();
  const railMat = mats.wall;
  const segCount = 16;
  for (let i = 0; i < segCount; i++) {
    const a = (i / segCount) * Math.PI * 2;
    const x = Math.cos(a) * 8.2;
    const z = Math.sin(a) * 8.2;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.3), railMat);
    seg.position.set(x, 0.4, z);
    seg.rotation.y = -a;
    rails.add(seg);
  }
  group.add(rails);

  return {
    update(dt) {
      // tiny drift shimmer (safe)
      const t = (performance.now() || 0) * 0.001;
      pitRing.material.emissiveIntensity = 0.9 + Math.sin(t * 2.0) * 0.1;
      trim.material.emissiveIntensity = 0.9 + Math.sin(t * 1.6 + 1.0) * 0.1;
    }
  };
}

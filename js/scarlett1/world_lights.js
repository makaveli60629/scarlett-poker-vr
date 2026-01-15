// /js/scarlett1/world_lights.js
export function addLights(THREE, group, { quality = "quest" } = {}) {
  const low = (quality === "quest");

  const amb = new THREE.AmbientLight(0xffffff, low ? 0.55 : 0.4);
  group.add(amb);

  const key = new THREE.DirectionalLight(0xffffff, low ? 0.55 : 0.9);
  key.position.set(8, 18, 10);
  key.castShadow = false;
  group.add(key);

  const rim = new THREE.DirectionalLight(0x66aaff, low ? 0.35 : 0.6);
  rim.position.set(-12, 10, -14);
  group.add(rim);

  // Neon “ceiling” points (cheap, no shadows)
  const p1 = new THREE.PointLight(0x00e5ff, low ? 0.6 : 1.0, 60);
  p1.position.set(0, 5.2, 0);
  group.add(p1);

  const p2 = new THREE.PointLight(0xff2bd6, low ? 0.5 : 0.9, 60);
  p2.position.set(10, 4.6, -8);
  group.add(p2);

  const p3 = new THREE.PointLight(0x33ff66, low ? 0.45 : 0.8, 60);
  p3.position.set(-10, 4.6, 8);
  group.add(p3);

  return {
    update(dt) {
      // subtle pulse (safe)
      const t = (performance.now() || 0) * 0.001;
      p1.intensity = (low ? 0.6 : 1.0) * (0.92 + Math.sin(t * 1.2) * 0.08);
      p2.intensity = (low ? 0.5 : 0.9) * (0.92 + Math.sin(t * 1.05 + 1.7) * 0.08);
      p3.intensity = (low ? 0.45 : 0.8) * (0.92 + Math.sin(t * 0.95 + 3.1) * 0.08);
    }
  };
}

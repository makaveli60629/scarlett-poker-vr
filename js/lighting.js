// /js/lighting.js — Cinematic Lighting Pack v1.0
// ✅ Bright enough to avoid "dark shapes"
// ✅ Looks good on Quest

export function applyLighting({ THREE, scene, root }) {
  // Ambient / hemisphere
  const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x0b0f1a, 1.10);
  hemi.position.set(0, 70, 0);
  scene.add(hemi);

  // Sun
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(35, 70, 35);
  sun.castShadow = false;
  scene.add(sun);

  // Lobby glow
  const lobbyGlow = new THREE.PointLight(0x7fb2ff, 1.20, 110, 2);
  lobbyGlow.position.set(0, 9.0, 0);
  root.add(lobbyGlow);

  // Magenta accent
  const magenta = new THREE.PointLight(0xff6bd6, 0.75, 85, 2);
  magenta.position.set(0, 2.8, 0);
  root.add(magenta);

  // Pit spotlight
  const pitSpot = new THREE.SpotLight(0xffffff, 1.25, 55, Math.PI / 4, 0.40, 1);
  pitSpot.position.set(0, 10.0, 0);
  pitSpot.target.position.set(0, -2.2, 0);
  root.add(pitSpot);
  root.add(pitSpot.target);

  return { hemi, sun, lobbyGlow, magenta, pitSpot };
}

// /core/three_boot.js — Scarlett Three Boot (FULL)
// Creates scene, camera, PlayerRig, renderer, basic light, resize handling.

async function loadThree() {
  if (window.THREE && window.THREE.Scene) return window.THREE;
  const ver = "0.164.1";
  return await import(`https://unpkg.com/three@${ver}/build/three.module.js`);
}

export async function initThree({ log } = {}) {
  const THREE = await loadThree();
  if (log) log("[index] three init ✅");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    350
  );

  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 8);
  scene.add(player);

  player.add(camera);
  camera.position.set(0, 1.65, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Basic light so you never see full black if world fails
  scene.add(new THREE.HemisphereLight(0xffffff, 0x05060a, 0.95));

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Controls bucket expected by your index.js/world.js
  const controllers = { left: null, right: null };
  const lasers = { left: null, right: null };

  return { THREE, scene, camera, player, renderer, controllers, lasers };
}

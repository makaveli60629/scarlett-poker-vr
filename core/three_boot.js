// /core/three_boot.js
export async function initThree({ log, bg = 0x05060a } = {}) {
  const ver = "0.164.1";
  const THREE = (window.THREE && window.THREE.Scene)
    ? window.THREE
    : await import(`https://unpkg.com/three@${ver}/build/three.module.js`);

  log?.("[three] loaded ✅");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);

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

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // base light
  scene.add(new THREE.HemisphereLight(0xffffff, 0x05060a, 0.95));

  return { THREE, scene, camera, player, renderer };
}

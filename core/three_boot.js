// /core/three_boot.js — FULL THREE BOOT (stable)
export async function initThree({ log }) {
  const ver = "0.164.1";
  const THREE = await import(`https://unpkg.com/three@${ver}/build/three.module.js`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400);

  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 8);
  scene.add(player);

  player.add(camera);
  camera.position.set(0, 1.65, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // baseline lighting
  scene.add(new THREE.HemisphereLight(0xffffff, 0x05060a, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(8, 14, 8);
  scene.add(dir);

  log?.("[three] init ✅");

  return { THREE, scene, camera, player, renderer };
}

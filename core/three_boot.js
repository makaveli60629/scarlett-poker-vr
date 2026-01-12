// /core/three_boot.js — Three boot v2 (PlayerRig + XR enabled)
export async function initThree({ log } = {}) {
  const ver = "0.164.1";
  const THREE = await import(`https://unpkg.com/three@${ver}/build/three.module.js`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

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

  // bright baseline light so Android always sees something
  scene.add(new THREE.HemisphereLight(0xffffff, 0x080a12, 1.0));
  const d = new THREE.DirectionalLight(0xffffff, 0.75);
  d.position.set(10, 18, 6);
  scene.add(d);

  // controllers (attached to PlayerRig so they follow movement)
  const controllers = {
    left: renderer.xr.getController(0),
    right: renderer.xr.getController(1),
  };
  player.add(controllers.left);
  player.add(controllers.right);

  log?.("[three] init ✅");
  return { THREE, scene, renderer, camera, player, controllers };
}

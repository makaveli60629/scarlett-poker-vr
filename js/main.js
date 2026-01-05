import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

export async function boot(statusEl) {
  statusEl.innerHTML += "<br>main.js loaded ✅";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101018);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    100
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Player rig (FIXES CONTROLLER OFFSET ISSUE)
  const rig = new THREE.Group();
  scene.add(rig);

  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // LIGHTING (NO MORE DARK SCENE)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // FLOOR (SOLID + SPAWN SAFE)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // SPAWN POINT (NOT INSIDE TABLE)
  rig.position.set(0, 0, 6);

  // CONTROLLERS (LOCKED TO RIG)
  const c1 = renderer.xr.getController(0);
  const c2 = renderer.xr.getController(1);
  rig.add(c1);
  rig.add(c2);

  // Laser
  function makeLaser(color) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 5;
    return line;
  }

  c1.add(makeLaser(0x00ccff));
  c2.add(makeLaser(0xffaa00));

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  statusEl.innerHTML += "<br>Scene ready ✅";
}

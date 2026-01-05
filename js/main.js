import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { Controls } from "./controls.js";

export async function boot(statusEl) {
  // --- renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button (Quest)
  document.body.appendChild(VRButton.createButton(renderer));

  // --- scene ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b12);

  // --- rig + camera (THIS IS THE IMPORTANT PART) ---
  const rig = new THREE.Group();
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    120
  );
  camera.position.set(0, 1.65, 0); // head height
  rig.add(camera);

  // Spawn: safe, not inside table
  rig.position.set(0, 0, 6);

  // --- lights (no more dark room) ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.25));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(6, 10, 4);
  scene.add(key);

  const fill = new THREE.PointLight(0x88aaff, 0.55, 40);
  fill.position.set(-6, 6, -6);
  scene.add(fill);

  // --- floor (solid) ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // --- simple walls (so you don't feel "empty") ---
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x222235, roughness: 0.9 });
  const wallGeo = new THREE.BoxGeometry(40, 6, 0.5);

  const wallA = new THREE.Mesh(wallGeo, wallMat);
  wallA.position.set(0, 3, -18);
  scene.add(wallA);

  const wallB = new THREE.Mesh(wallGeo, wallMat);
  wallB.position.set(0, 3, 18);
  scene.add(wallB);

  const wallSideGeo = new THREE.BoxGeometry(0.5, 6, 40);
  const wallC = new THREE.Mesh(wallSideGeo, wallMat);
  wallC.position.set(-18, 3, 0);
  scene.add(wallC);

  const wallD = new THREE.Mesh(wallSideGeo, wallMat);
  wallD.position.set(18, 3, 0);
  scene.add(wallD);

  // --- “table zone” marker (so you know where the poker area will be) ---
  const tableZone = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f6b3a, roughness: 0.6, metalness: 0.15 })
  );
  tableZone.position.set(0, 0.04, 0);
  scene.add(tableZone);

  // --- lasers (attached to controllers on rig) ---
  function addLaser(ctrl, color = 0x00ccff) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 6;
    ctrl.add(line);
  }

  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);
  addLaser(c0, 0x00ccff);
  addLaser(c1, 0xffaa00);

  // --- init locomotion ---
  Controls.init({ rig, camera, renderer });

  // --- status ---
  if (statusEl) {
    statusEl.innerHTML += "<br>XR + locomotion ready ✅";
    statusEl.innerHTML += "<br>Left stick = move, Right stick = 45° turn ✅";
  }

  // --- render loop ---
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    Controls.update(dt);
    renderer.render(scene, camera);
  });

  // --- resize ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

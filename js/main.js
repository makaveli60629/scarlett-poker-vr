import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { Controls } from "./controls.js";

export async function boot(statusEl) {
  const setStatus = (t) => { if (statusEl) statusEl.innerHTML = String(t); };

  // renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VR button
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.position = "fixed";
  vrBtn.style.top = "12px";
  vrBtn.style.right = "12px";
  vrBtn.style.zIndex = "20";
  document.body.appendChild(vrBtn);

  // scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070d);

  // rig + camera
  const rig = new THREE.Group();
  scene.add(rig);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 150);
  camera.position.set(0, 1.65, 0);
  rig.add(camera);

  // SAFE spawn: away from center/table, not inside floor
  rig.position.set(0, 0, 7);
  rig.rotation.set(0, 0, 0);

  // lights (bright)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a40, 1.35));

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(8, 12, 6);
  scene.add(key);

  const rim = new THREE.PointLight(0x66aaff, 0.65, 60);
  rim.position.set(-10, 6, -10);
  scene.add(rim);

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // ceiling (so it’s NOT a black void)
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 1 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6.2;
  scene.add(ceil);

  // walls (very obvious)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2c, roughness: 0.95 });
  const wallH = 6.2;
  const thick = 0.5;

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(46, wallH, thick), wallMat);
  wallN.position.set(0, wallH / 2, -23);
  scene.add(wallN);

  const wallS = new THREE.Mesh(new THREE.BoxGeometry(46, wallH, thick), wallMat);
  wallS.position.set(0, wallH / 2, 23);
  scene.add(wallS);

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 46), wallMat);
  wallW.position.set(-23, wallH / 2, 0);
  scene.add(wallW);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(thick, wallH, 46), wallMat);
  wallE.position.set(23, wallH / 2, 0);
  scene.add(wallE);

  // “table zone” marker (center)
  const tableZone = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.1, 0.1, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f7a40, roughness: 0.6, metalness: 0.1 })
  );
  tableZone.position.set(0, 0.05, 0);
  scene.add(tableZone);

  // big “spawn marker” (so you can see where you start)
  const spawnMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.55, 48),
    new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  spawnMarker.rotation.x = -Math.PI / 2;
  spawnMarker.position.set(rig.position.x, 0.03, rig.position.z);
  scene.add(spawnMarker);

  // controllers + lasers (inside rig!)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  rig.add(c0);
  rig.add(c1);

  function addLaser(ctrl, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.scale.z = 7;
    ctrl.add(line);
  }
  addLaser(c0, 0x00ccff);
  addLaser(c1, 0xffaa00);

  // controls
  Controls.init({ rig, camera, renderer });

  setStatus(`Status: running ✅<br>
  Left stick = move ✅<br>
  Right stick = 45° snap turn ✅<br>
  Spawn: (0,0,7) ✅`);

  // loop
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    Controls.update(dt);
    renderer.render(scene, camera);
  });

  // resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

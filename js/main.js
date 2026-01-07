import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const logEl = document.getElementById("log");
const log = (m) => { if (logEl) logEl.textContent += "\n" + m; };

log("✅ main.js running…");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

try {
  document.body.appendChild(VRButton.createButton(renderer));
  log("✅ VRButton added (you should see ENTER VR)");
} catch (e) {
  log("❌ VRButton failed: " + e.message);
}

// bright lights (so it can’t be black)
scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 1.5);
dir.position.set(3, 6, 2);
scene.add(dir);

// obvious objects
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
);
cube.position.set(0, 1.5, -1.5);
scene.add(cube);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
});

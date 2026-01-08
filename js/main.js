// /js/main.js  (Boot file that MUST load)
import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

const logEl = document.getElementById("log");
const log = (m) => { if (logEl) logEl.textContent += "\n" + m; console.log(m); };

log("[main] loaded ✅");
log("[main] import.meta.url=" + import.meta.url);

// --- Three core
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 1, 50);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 250);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
try { renderer.xr.setReferenceSpaceType("local-floor"); } catch {}
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Player rig
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// Face toward table by default
player.position.set(0, 0, 3.6);
camera.position.set(0, 1.65, 0);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(7, 12, 6);
scene.add(dir);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Table
const tableFocus = new THREE.Vector3(0, 0, -6.5);
const table = new THREE.Group();
table.position.copy(tableFocus);
scene.add(table);

const felt = new THREE.Mesh(
  new THREE.CylinderGeometry(2.6, 2.6, 0.18, 64),
  new THREE.MeshStandardMaterial({ color: 0x0f5d3a, roughness: 0.92 })
);
felt.position.y = 0.92;
table.add(felt);

const rim = new THREE.Mesh(
  new THREE.TorusGeometry(2.6, 0.18, 18, 80),
  new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 0.85 })
);
rim.rotation.x = Math.PI / 2;
rim.position.y = 1.01;
table.add(rim);

camera.lookAt(tableFocus.x, 1.0, tableFocus.z);

log("[main] scene booted ✅");

// Resize
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Loop
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

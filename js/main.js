// Scarlett Poker VR — MAIN CORE (PERMANENT)
// GitHub Pages + Oculus Browser SAFE

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const log = (m) => overlay.innerHTML += `<br>✔ ${m}`;
const warn = (m) => overlay.innerHTML += `<br>⚠ ${m}`;

const overlay = document.getElementById("overlay");

// -------------------------
// SCENE / CAMERA / RENDERER
// -------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.75, 5); // YOU ARE TALLER

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

log("Renderer ready");

// -------------------------
// VR BUTTON — NEVER REMOVE
// -------------------------
const vrButton = VRButton.createButton(renderer);
vrButton.style.position = "fixed";
vrButton.style.bottom = "20px";
vrButton.style.right = "20px";
vrButton.style.zIndex = "9999";
vrButton.style.display = "block";
vrButton.style.opacity = "1";
document.body.appendChild(vrButton);
log("VRButton locked");

// Oculus user-gesture safety
document.body.addEventListener("click", () => {
  renderer.xr.enabled = true;
}, { once: true });

// -------------------------
// PLAYER RIG
// -------------------------
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// -------------------------
// LIGHTING (BRIGHT)
// -------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
scene.add(sun);

log("Lighting added");

// -------------------------
// SAFE MODULE LOADER
// -------------------------
async function load(name, path) {
  try {
    const m = await import(path);
    log(`Loaded ${name}`);
    return m;
  } catch (e) {
    warn(`Skipped ${name}`);
    return null;
  }
}

// -------------------------
// LOAD CORE MODULES
// -------------------------
const World = await load("world.js", "./world.js");
const Controls = await load("controls.js", "./controls.js");
const XRMove = await load("xr_locomotion.js", "./xr_locomotion.js");
const UI = await load("ui.js", "./ui.js");
await load("poker_simulation.js", "./poker_simulation.js");
await load("audio.js", "./audio.js");
await load("lights_pack.js", "./lights_pack.js");

// -------------------------
// BUILD WORLD
// -------------------------
let spawn = new THREE.Vector3(0, 0, 8);

if (World?.World) {
  const built = World.World.build(scene, player);
  if (built?.spawn) spawn.copy(built.spawn);
  log("World built");
}

// FORCE SPAWN ON TELEPORT PAD
player.position.copy(spawn);
player.position.y = 0;
log("Spawned on teleport pad");

// -------------------------
// CONTROLS
// -------------------------
Controls?.Controls?.init?.(renderer, camera, player);
XRMove?.XRLocomotion?.init?.(renderer, player, camera);
UI?.UI?.init?.();

log("Controls ready");

// -------------------------
// RESIZE
// -------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------
// LOOP
// -------------------------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

overlay.innerHTML += "<br><b>Boot complete. Enter VR.</b>";

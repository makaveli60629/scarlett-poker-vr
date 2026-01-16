// Scarlett Poker VR — Scarlett1 Runtime v4.2 (SAFE BASE)

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const o = document.getElementById("overlay");
const log = (...a)=> o && (o.textContent += "\n[LOG] " + a.join(" "));
const err = (...a)=> o && (o.textContent += "\n[ERR] " + a.join(" "));

log("Scarlett1 runtime starting…");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080d);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

document.getElementById("app").appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

log("Renderer + VRButton ready");

const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.2);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 5);
scene.add(dir);

// === WORLD INIT ===
let world;
try {
  world = new World({ THREE, scene });
  await world.init();
  log("World init OK ✅");
} catch (e) {
  err("World init FAILED ❌");
  err(e.message);
}

// === RENDER LOOP ===
renderer.setAnimationLoop(() => {
  if (world?.update) world.update();
  renderer.render(scene, camera);
});

log("Render loop started ✅");

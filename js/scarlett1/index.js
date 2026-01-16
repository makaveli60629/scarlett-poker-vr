// /js/scarlett1/index.js — MINIMAL PROBE (GUARANTEED LOAD)

console.log("✅ scarlett1/index.js loaded");

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

const app = document.getElementById("app") || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3);

scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1));

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

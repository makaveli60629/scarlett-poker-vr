// /js/index.js — Scarlett Runtime (Three + VR + World)
// ✅ NO bare imports like "three"
// ✅ Uses CDN so GitHub Pages + Android + Quest works

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./world.js";

const log = window.ScarlettLog?.push || console.log;
window.ScarlettLog?.setMode?.("init");

log("[index] runtime start ✅", "ok");

const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing");

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

log("[index] Renderer created ✅","ok");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 2000);
camera.position.set(0,1.6,3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.85));

log("[index] PlayerRig + Camera ✅","ok");

// VR button
try{
  const b = VRButton.createButton(renderer);
  document.getElementById("vrSlot")?.appendChild(b);
  log("[index] VRButton appended ✅","ok");
}catch(e){
  log("[index] VRButton failed: " + (e?.message||e), "warn");
}

// resize
window.addEventListener("resize", ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// controllers placeholder compatible with your world
const controllers = { left:null, right:null, lasers:[] };

// world init
(async ()=>{
  try{
    window.ScarlettLog?.setMode?.("loading world");
    log("[index] World.init …");
    await World.init({
      THREE, scene, renderer, camera, player, controllers,
      log: console.log,
      BUILD: Date.now()
    });
    log("[index] World init ✅","ok");
    window.ScarlettLog?.setMode?.("ready");
  }catch(e){
    log("[index] World init FAIL ❌","bad");
    log(String(e?.stack || e), "muted");
    window.ScarlettLog?.setMode?.("world fail");
  }
})();

// render loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(()=>{
  clock.getDelta();
  renderer.render(scene, camera);
});

log("[index] Animation loop running ✅","ok");

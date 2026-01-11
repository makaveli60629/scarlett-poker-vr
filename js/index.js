// /js/index.js — Runtime entry
// Can use either CDN imports OR bare "three" now because boot.js injects importmap.

import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { World } from ".js/world.js";

const L = window.ScarlettLog?.push || console.log;
window.ScarlettLog?.setMode?.("init");

L("[index] runtime start ✅", "ok");

const app = document.getElementById("app");
if (!app) throw new Error("FATAL: #app missing");

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 2000);
camera.position.set(0,1.6,3);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);
scene.add(player);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.85));

L("[index] renderer/camera/rig ✅","ok");

try{
  const b = VRButton.createButton(renderer);
  document.getElementById("vrSlot")?.appendChild(b);
  L("[index] VRButton appended ✅","ok");
}catch(e){
  L("[index] VRButton failed: " + (e?.message||e), "warn");
}

window.addEventListener("resize", ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

const controllers = { left:null, right:null, lasers:[] };

(async ()=>{
  try{
    window.ScarlettLog?.setMode?.("loading world");
    L("[index] World.init …");
    await World.init({
      THREE, scene, renderer, camera, player, controllers,
      log: console.log,
      BUILD: Date.now()
    });
    L("[index] World init ✅","ok");
    window.ScarlettLog?.setMode?.("ready");
  }catch(e){
    L("[index] World init FAIL ❌","bad");
    L(String(e?.stack||e),"muted");
    window.ScarlettLog?.setMode?.("world fail");
  }
})();

const clock = new THREE.Clock();
renderer.setAnimationLoop(()=>{
  clock.getDelta();
  renderer.render(scene, camera);
});

L("[index] animation loop running ✅","ok");

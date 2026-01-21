// app.mjs — Scarlett Avatar Lab Boot (CDN-safe)
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

const player = new THREE.Group();
player.add(camera);
scene.add(player);

const appRoot = document.getElementById("app");
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;
appRoot.appendChild(renderer.domElement);

// VR button (Quest)
try {
  document.body.appendChild(VRButton.createButton(renderer));
} catch (e) {
  // ok on some Android browsers
}

function log(msg){
  try{
    if (window.__scarlettLog) window.__scarlettLog(msg);
    else console.log(msg);
  }catch(_){}
}

// Basic resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

player.position.set(0, 0, 8);

let worldApi = null;
let lastNow = performance.now();

async function bootWorld(){
  const { World } = await import("./js/world.js");
  worldApi = await World.init({ THREE, scene, renderer, camera, player, log });
  log("[BOOT] World init OK.");
}
bootWorld();

// Hide HUD when VR starts (Quest usability)
renderer.xr.addEventListener("sessionstart", () => {
  player.rotation.y = Math.PI; // face table
  // If HUD exists, hide
  const hud = document.getElementById("hud");
  if (hud) hud.classList.add("off");
  document.body.classList.add("hudOff");
  log("[XR] sessionstart: HUD auto-hidden.");
});

// Hot reload modules (no full reload)
window.addEventListener("scarlett:reloadModules", async () => {
  try{
    log("[Modules] Reload requested…");
    // Re-import world (cache-bust)
    const url = "./js/world.js?v=" + Date.now();
    const mod = await import(url);
    if (mod?.World?.init){
      // re-init: clear scene root children (keep player/camera)
      for (let i = scene.children.length - 1; i >= 0; i--) {
        const obj = scene.children[i];
        if (obj !== player) scene.remove(obj);
      }
      scene.add(player);
      worldApi = await mod.World.init({ THREE, scene, renderer, camera, player, log });
      log("[Modules] Reload OK.");
    }else{
      log("[Modules] Reload failed: World.init missing.");
    }
  }catch(e){
    log("[Modules] Reload error: " + (e?.message || e));
  }
});

renderer.setAnimationLoop((t) => {
  const now = performance.now();
  const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
  lastNow = now;

  try{
    if (worldApi?.update) worldApi.update(dt, t / 1000);
  }catch(e){
    log("[Loop] world.update error: " + (e?.message || e));
  }

  renderer.render(scene, camera);
});

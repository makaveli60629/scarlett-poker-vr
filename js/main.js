// /js/main.js
// Build: SCARLETT_PERMA_DEMO_FIX_v1
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { buildWorld } from "./world.js";
import { installBasicControls } from "./modules/controls_basic.js";
import { installHud } from "./modules/hud_diag.js";
import { installXRHands } from "./modules/hand_tracking.js";
import { installAudioSystem } from "./modules/audio_system.js";

const BUILD = "SCARLETT_PERMA_DEMO_FIX_v6_QUEST_SEATS_HANDS_AUDIO_NEXT";

// ---- DIAG writer (global hook) ----
const logEl = document.getElementById("log");
function dwrite(line){
  try{
    const t = new Date();
    const ts = String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0")+"."+String(t.getMilliseconds()).padStart(3,"0");
    logEl.textContent += `[${ts}] ${line}\n`;
  }catch(_){}
}
window.__scarlettDiagWrite = dwrite;

// ---- env fingerprint ----
dwrite(`booting… BUILD=${BUILD}`);
dwrite(`href=${location.href}`);
dwrite(`secureContext=${String(window.isSecureContext)}`);
dwrite(`ua=${navigator.userAgent}`);
dwrite(`touch=${("ontouchstart" in window)} maxTouchPoints=${navigator.maxTouchPoints||0}`);
dwrite(`xr=${String(!!navigator.xr)}`);

window.SCARLETT = window.SCARLETT || {};
window.SCARLETT.BUILD = BUILD;
window.SCARLETT.engineAttached = true;
window.__scarlettAudioCues = audio.cues;
window.__scarlettEngineAttached = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

// Rig: move this for teleport / reset (camera is inside)
const rig = new THREE.Group();
rig.name = "playerRig";
scene.add(rig);

// Camera
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 2000);
camera.position.set(0, 1.65, 0);
rig.add(camera); // IMPORTANT: add camera to rig (and rig to scene)

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.15));
const key = new THREE.DirectionalLight(0xffffff, 0.55);
key.position.set(6, 10, 3);
scene.add(key);

// World
const world = buildWorld({ THREE, scene, rig, camera, renderer, dwrite });

// Controls (touch + WASD + simple 2-finger move)
const controls = installBasicControls({ THREE, renderer, rig, camera, dwrite });

// HUD + actions (Enter VR, Teleport, Reset, Hide, Diagnostics)
installHud({
  THREE, renderer, rig, camera, dwrite,
  getTeleportEnabled: () => controls.teleportEnabled,
  setTeleportEnabled: (v) => {
    controls.setTeleportEnabled(v);
    try{ world.teleportFX?.setEnabled?.(v); }catch(_){ }
  },
  resetToSpawn: () => controls.resetToSpawn(),
  requestTeleport: (pos) => controls.teleportTo(pos),
});

// Resize
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
renderer.setAnimationLoop(()=>{
  controls.update();
  xrHands.update?.();
  world.update?.();
  renderer.render(scene, camera);
});

dwrite("[main] ready ✅");

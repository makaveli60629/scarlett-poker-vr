import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const logBox = document.getElementById("log");
function log(...a) {
  const msg = a.join(" ");
  console.log(msg);
  logBox.textContent += msg + "\n";
  logBox.scrollTop = logBox.scrollHeight;
}

log("BOOT START");

log("UA:", navigator.userAgent);
log("SecureContext:", window.isSecureContext);
log("WebXR:", !!navigator.xr);

// Renderer
const app = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);
log("Renderer OK");

// Scene + Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth/window.innerHeight, 0.05, 2000
);

const player = new THREE.Group();
scene.add(player);
player.add(camera);
camera.position.set(0, 1.65, 3.5);

// XR Controllers
const controllers = {
  c0: renderer.xr.getController(0),
  c1: renderer.xr.getController(1)
};
player.add(controllers.c0, controllers.c1);
log("Controllers OK");

// VR Button (GUARDED)
if (navigator.xr && window.VRButton) {
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton OK");
  } catch (e) {
    log("VRButton FAILED:", e.message);
  }
} else {
  log("VRButton skipped (Android OK)");
}

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop (NEVER FAIL SILENTLY)
const clock = new THREE.Clock();
let worldAPI = null;

renderer.setAnimationLoop(() => {
  try {
    const dt = clock.getDelta();
    if (worldAPI?.update) worldAPI.update(dt);
    renderer.render(scene, camera);
  } catch (e) {
    log("RENDER ERROR:", e.message);
  }
});
log("Render loop running");

// Load world
(async () => {
  try {
    log("Loading world…");
    const mod = await import("./js/world.js");
    worldAPI = await mod.World.init({
      THREE, scene, renderer, camera, player, controllers, log
    });
    log("World INIT OK");
  } catch (e) {
    log("WORLD FAILED:", e.stack || e.message);
  }
})();

// HUD toggle
document.getElementById("btnHide").onclick = () => {
  document.getElementById("hud").style.display = "none";
};

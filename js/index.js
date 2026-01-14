// ===============================
// CDN IMPORTS (NO LOCAL PATHS)
// ===============================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

// ===============================
// DIAGNOSTICS HUD
// ===============================
const logBox = document.getElementById("log");
function log(...args) {
  const line = args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ");
  logBox.textContent += "\n" + line;
  logBox.scrollTop = logBox.scrollHeight;
  console.log(...args);
}

document.getElementById("toggleHUD").onclick = () => {
  const hud = document.getElementById("hud");
  hud.style.display = hud.style.display === "none" ? "block" : "none";
};

log("Diagnostics core loading…");

// ===============================
// BASIC ENV CHECKS
// ===============================
log("UserAgent:", navigator.userAgent);
log("HTTPS:", location.protocol === "https:" ? "YES" : "NO ❌");
log("navigator.xr:", !!navigator.xr);

// ===============================
// THREE CORE
// ===============================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);

log("Renderer OK");
log("XR enabled:", renderer.xr.enabled);

// ===============================
// LIGHTING
// ===============================
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 5);
scene.add(dir);
log("Lighting OK");

// ===============================
// FLOOR + TABLE (VISIBLE CONFIRM)
// ===============================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const table = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 1.2, 0.15, 32),
  new THREE.MeshStandardMaterial({ color: 0x113355 })
);
table.position.y = 0.75;
scene.add(table);

log("World geometry OK");

// ===============================
// ANDROID / DESKTOP INPUT (TOUCH + MOUSE)
// ===============================
window.addEventListener("pointerdown", () => {
  log("Pointer input detected");
});

// ===============================
// RENDER LOOP (MUST EXIST FIRST)
// ===============================
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

// ===============================
// XR SUPPORT CHECK (QUEST SAFE)
// ===============================
setTimeout(() => {
  if (!navigator.xr) {
    log("❌ navigator.xr missing");
    return;
  }

  navigator.xr.isSessionSupported("immersive-vr").then((supported) => {
    log("immersive-vr supported:", supported);

    if (supported) {
      document.body.appendChild(VRButton.createButton(renderer));
      log("✅ VRButton appended");
    } else {
      log("❌ immersive-vr NOT supported");
    }
  }).catch(err => {
    log("XR check error:", err);
  });
}, 500);

// ===============================
// RESIZE SAFETY
// ===============================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===============================
// FINAL BOOT CONFIRM
// ===============================
log("Boot sequence complete");

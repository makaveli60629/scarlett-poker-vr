// /js/main.js — Scarlett Poker VR — Manual VR Entry (Quest Safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// VRButton import sometimes fails on Quest. We will TRY it, but never depend on it.
let VRButton = null;
try {
  const m = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js");
  VRButton = m.VRButton;
} catch (e) {
  // ok — we'll rely on manual ENTER VR button
}

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");

const log = (s) => { overlay.textContent += `\n${s}`; console.log(s); };
const ok  = (s) => log(`✅ ${s}`);
const warn= (s) => log(`⚠️ ${s}`);
const fail= (s) => log(`❌ ${s}`);

overlay.textContent = "Scarlett Poker VR — booting…";

// --------------------
// Scene / Camera / Renderer
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101318);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.2;

document.body.appendChild(renderer.domElement);
ok("Renderer attached");

// reference space
try { renderer.xr.setReferenceSpaceType("local-floor"); ok("Reference space: local-floor"); }
catch { warn("Reference space set failed (ok)"); }

// --------------------
// LIGHTS (never black)
// --------------------
scene.add(new THREE.AmbientLight(0xffffff, 1.25));
scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 2.6));

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(8, 14, 6);
scene.add(key);

// Visible marker (so you always see something even if world fails)
const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x00ff66 })
);
marker.position.set(0, 1.2, -1.2);
scene.add(marker);
ok("Lights + marker ready");

// --------------------
// Try VRButton injection (optional)
// --------------------
if (VRButton) {
  try {
    const btn = VRButton.createButton(renderer);
    btn.style.position = "fixed";
    btn.style.right = "18px";
    btn.style.bottom = "80px"; // above manual button
    btn.style.zIndex = "2147483647";
    btn.style.display = "block";
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
    document.body.appendChild(btn);
    ok("VRButton injected");
  } catch (e) {
    warn("VRButton injection failed (manual button will work).");
  }
} else {
  warn("VRButton module blocked — using manual ENTER VR only.");
}

// --------------------
// Manual ENTER VR (this is the real fix)
// --------------------
async function manualEnterVR() {
  try {
    if (!navigator.xr) throw new Error("navigator.xr is missing (WebXR not available)");
    ok("navigator.xr detected");

    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) throw new Error("immersive-vr NOT supported");
    ok("immersive-vr supported");

    // Must be called from a user gesture (button click)
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
    });

    await renderer.xr.setSession(session);
    ok("XR session started");
  } catch (e) {
    fail(`ENTER VR failed: ${e?.message || e}`);
  }
}

enterVrBtn.addEventListener("click", () => {
  ok("ENTER VR clicked");
  manualEnterVR();
});

// Also allow trigger gesture chain (some browsers require first click anywhere)
document.body.addEventListener("click", () => {}, { once: true });

// --------------------
// Resize
// --------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --------------------
// Render loop
// --------------------
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

ok("Boot complete — press ENTER VR (green button).");

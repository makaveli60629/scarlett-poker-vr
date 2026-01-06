// /js/main.js — Scarlett Poker VR — FORCE VR ENTRY (Oculus Browser Safe)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js";

const overlay = document.getElementById("overlay");
const enterVrBtn = document.getElementById("enterVrBtn");
const println = (t) => { overlay.textContent += `\n${t}`; console.log(t); };
const ok = (t) => println(`✅ ${t}`);
const warn = (t) => println(`⚠️ ${t}`);
const fail = (t) => println(`❌ ${t}`);

overlay.textContent = "Scarlett Poker VR — booting…";
ok("Three.js loaded");

// -------------------------
// Scene / camera
// -------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2028);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 350);
camera.position.set(0, 1.6, 3);

// -------------------------
// Renderer
// -------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;

// Brightness
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.0;

document.body.appendChild(renderer.domElement);
ok("Renderer attached");

// Prefer local-floor (Quest)
try { renderer.xr.setReferenceSpaceType("local-floor"); ok("Reference space: local-floor"); } catch {}

// -------------------------
// LIGHTS (so you never see black)
// -------------------------
scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 2.4);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(8, 14, 6);
scene.add(key);

// simple visible marker so you ALWAYS see something
const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x00ff66 })
);
marker.position.set(0, 1.2, -1.2);
scene.add(marker);

// -------------------------
// FORCE VR BUTTON
// -------------------------
let vrDom = null;

function addVRButton() {
  try {
    vrDom = VRButton.createButton(renderer);
    vrDom.style.position = "fixed";
    vrDom.style.bottom = "18px";
    vrDom.style.right = "18px";
    vrDom.style.zIndex = "2147483647";
    vrDom.style.display = "block";
    vrDom.style.opacity = "1";
    vrDom.style.pointerEvents = "auto";
    document.body.appendChild(vrDom);
    ok("VRButton injected");
  } catch (e) {
    fail("VRButton create failed: " + (e?.message || e));
  }
}
addVRButton();

// Sometimes Oculus Browser delays WebXR permission; re-inject after a moment
setTimeout(() => {
  if (!vrDom || !document.body.contains(vrDom)) {
    warn("VRButton missing after delay — reinjecting");
    addVRButton();
  }
}, 1200);

// -------------------------
// FALLBACK ENTER VR BUTTON
// If VRButton UI doesn’t appear, you can still enter VR manually.
// -------------------------
async function enterVRManually() {
  try {
    if (!navigator.xr) throw new Error("navigator.xr not available");

    const okSupported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!okSupported) throw new Error("immersive-vr not supported");

    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    });

    renderer.xr.setSession(session);
    ok("Manual XR session started");
    enterVrBtn.style.display = "none";
  } catch (e) {
    fail("Manual ENTER VR failed: " + (e?.message || e));
  }
}

// Show fallback button if we’re on a headset browser
function maybeShowFallbackEnterVr() {
  // Oculus Browser often has navigator.userAgent containing "OculusBrowser"
  const ua = navigator.userAgent || "";
  const isOculus = /OculusBrowser/i.test(ua) || /Quest/i.test(ua) || /Oculus/i.test(ua);

  if (isOculus) {
    enterVrBtn.style.display = "block";
    ok("ENTER VR fallback button enabled");
  } else {
    warn("Non-headset browser detected — fallback button hidden");
  }
}
maybeShowFallbackEnterVr();

enterVrBtn.addEventListener("click", () => {
  ok("ENTER VR clicked");
  enterVRManually();
});

// Also allow any screen tap to qualify as a user gesture if needed
document.body.addEventListener("click", () => {
  // no-op, but preserves gesture chain
}, { once: true });

// -------------------------
// Resize
// -------------------------
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// -------------------------
// Loop
// -------------------------
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  clock.getDelta();
  renderer.render(scene, camera);
});

ok("Boot complete — use VRButton or ENTER VR");

// index.js — Quest-safe XR enter + Hands-only + Palm Menu + Render loop
import { scene, initStream, setStream, enableAudio, updateSpatialAudio, lobbyScreen, CHANNELS, makeButtonPlane } from "./world.js";

const statusEl = document.getElementById("status");
const enterVrBtn = document.getElementById("enterVrBtn");
const startAudioBtn = document.getElementById("startAudioBtn");

function setStatus(msg) {
  console.log("[ui]", msg);
  if (statusEl) statusEl.textContent = msg;
}

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

document.getElementById("canvas-container").appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Camera (non-XR view + XR base)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.65, 4);

// A simple player group (we can attach things later if needed)
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// --- IMPORTANT: Quest-safe session init ---
// Do NOT request risky features if you want to avoid "VR failed".
const sessionInit = {
  optionalFeatures: [
    "local-floor",
    "hand-tracking"
  ]
};

let xrStarting = false;

async function enterVR() {
  if (xrStarting) return;
  xrStarting = true;
  try {
    if (!navigator.xr) {
      setStatus("WebXR not available in this browser.");
      return;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      setStatus("immersive-vr not supported (Quest Browser should support this).");
      return;
    }

    setStatus("Requesting XR session…");

    // requestSession MUST happen from user gesture (button click)
    let session;
    try {
      session = await navigator.xr.requestSession("immersive-vr", sessionInit);
      console.log("[xr] requestSession ✅", session);
    } catch (err) {
      console.log("[xr] requestSession ❌", err?.name, err?.message, err);
      setStatus(`VR failed: ${err?.name || "Error"} — ${err?.message || ""}`);
      return;
    }

    session.addEventListener("end", () => setStatus("XR session ended."));
    renderer.xr.setSession(session);

    setStatus("Entered VR ✅. Tap Start Audio once, then use palm menu.");

  } finally {
    xrStarting = false;
  }
}

// --- Media start rules ---
// HLS + video.play() MUST happen from a user gesture at least once.
async function startAudioGesture() {
  try {
    // Initialize default stream if needed
    initStream(CHANNELS[0].url);

    await enableAudio();
    setStatus("Audio started ✅. Use palm menu to switch channels.");
  } catch (err) {
    console.log("[media] startAudio ❌", err?.name, err?.message, err);
    setStatus(`Audio blocked: ${err?.name || "Error"} (tap again)`);
  }
}

enterVrBtn.addEventListener("click", enterVR);
startAudioBtn.addEventListener("click", startAudioGesture);

// Also allow a generic click anywhere as a fallback to init stream (safe)
window.addEventListener("click", () => {
  // Don’t spam-init; if video already has a src/hls attached, it’s okay.
  initStream(CHANNELS[0].url);
}, { once: true });

// --- Hands-only setup ---
const hand1 = renderer.xr.getHand(0); // left
const hand2 = renderer.xr.getHand(1); // right
scene.add(hand1);
scene.add(hand2);

// Palm Menu attached to LEFT hand
const palmMenu = new THREE.Group();
palmMenu.visible = true;
hand1.add(palmMenu);

// Position and tilt toward player
palmMenu.position.set(0.0, 0.06, -0.10);
palmMenu.rotation.set(-0.6, 0, 0);

// Buttons
const buttons = [];
CHANNELS.forEach((ch, i) => {
  const btn = makeButtonPlane(0.26, 0.11, 0x151525);
  btn.position.set(0, -i * 0.13, 0);
  btn.userData.channel = ch;
  palmMenu.add(btn);
  buttons.push(btn);
});

// Visual highlight + selection handling
function highlightButton(activeBtn) {
  for (const b of buttons) {
    b.material.color.set(b === activeBtn ? 0x00aa66 : 0x151525);
  }
}

// Joint helpers
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();

function getJointWorldPos(hand, jointName, outVec3) {
  const j = hand.joints?.[jointName];
  if (!j) return false;
  j.getWorldPosition(outVec3);
  return true;
}

// Pinch to toggle menu (LEFT hand)
let menuCooldown = 0;
function leftPinchApprox() {
  if (!getJointWorldPos(hand1, "thumb-tip", a)) return false;
  if (!getJointWorldPos(hand1, "index-finger-tip", b)) return false;
  return a.distanceTo(b) < 0.02;
}

let lastSelectedId = null;

function checkPalmMenuInteraction(dt) {
  menuCooldown = Math.max(0, menuCooldown - dt);

  // Pinch toggle (debounced)
  if (menuCooldown === 0 && leftPinchApprox()) {
    palmMenu.visible = !palmMenu.visible;
    menuCooldown = 0.35;
    return;
  }

  if (!palmMenu.visible) return;

  // Right index tip for poke
  if (!getJointWorldPos(hand2, "index-finger-tip", tmp)) return;

  let hovered = null;
  let hoveredDist = 999;

  for (const btn of buttons) {
    btn.getWorldPosition(tmp2);
    const d = tmp.distanceTo(tmp2);
    if (d < hoveredDist) {
      hoveredDist = d;
      hovered = btn;
    }
  }

  // Hover
  if (hovered && hoveredDist < 0.055) {
    highlightButton(hovered);

    // Select on closer poke
    if (hoveredDist < 0.032) {
      const ch = hovered.userData.channel;
      if (ch?.id && ch.id !== lastSelectedId) {
        lastSelectedId = ch.id;
        setStream(ch.url);
        setStatus(`Channel: ${ch.name}`);
      }
    }
  } else {
    highlightButton(null);
  }
}

// Simple “hand near screen” feedback (from your manifest)
function checkHandInteraction() {
  // If joints exist, use an actual fingertip; else fallback to hand position
  const hasTip = getJointWorldPos(hand1, "index-finger-tip", tmp);
  const p = hasTip ? tmp : hand1.position;

  const dist = p.distanceTo(lobbyScreen.position);
  if (dist < 1.0) lobbyScreen.material.color.set(0x00ff00);
  else lobbyScreen.material.color.set(0xffffff);
}

// Animation loop
let lastT = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.max(0.001, (now - lastT) / 1000);
  lastT = now;

  // Spatial audio based on viewer position
  const xrCam = renderer.xr.getCamera(camera);
  updateSpatialAudio(xrCam.position);

  checkHandInteraction();
  checkPalmMenuInteraction(dt);

  renderer.render(scene, camera);
});

// Friendly boot log
console.log("[boot] Quest-safe 4.2 loaded");
setStatus("Ready. Tap Enter VR. If VR fails, open console and look for [xr] requestSession ❌.");

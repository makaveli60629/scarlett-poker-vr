// /js/index.js — Scarlett Hybrid 1.0 (FULL, Quest-safe)
// ✅ Works with /js/world.js exporting HybridWorld
// ✅ XR requestSession only from user click
// ✅ Builds world after XR starts (Quest stable)
// ✅ In-VR buttons are handled by VR panel inside world.js (pinch to click)

import { HybridWorld } from "./world.js";

const statusEl = document.getElementById("status");
const enterVrBtn = document.getElementById("enterVrBtn");
const rebuildBtn = document.getElementById("rebuildBtn");
const safeModeBtn = document.getElementById("safeModeBtn");
const hardResetBtn = document.getElementById("hardResetBtn");
const logEl = document.getElementById("log");

const opt_nonvrControls = document.getElementById("opt_nonvrControls");
const opt_allowTeleport = document.getElementById("opt_allowTeleport");
const opt_allowBots = document.getElementById("opt_allowBots");
const opt_allowPoker = document.getElementById("opt_allowPoker");
const opt_autobuild = document.getElementById("opt_autobuild");

function setStatus(html) {
  console.log("[ui]", html);
  if (statusEl) statusEl.innerHTML = html;
}

const LOGS = [];
function log(...a) {
  console.log(...a);
  const line = a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ");
  LOGS.push(line);
  if (logEl) {
    logEl.textContent = LOGS.slice(-300).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
}
function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }

function readOPTS() {
  return {
    autobuild: opt_autobuild ? !!opt_autobuild.checked : true,
    nonvrControls: opt_nonvrControls ? !!opt_nonvrControls.checked : true,
    allowTeleport: opt_allowTeleport ? !!opt_allowTeleport.checked : true,
    allowBots: opt_allowBots ? !!opt_allowBots.checked : true,
    allowPoker: opt_allowPoker ? !!opt_allowPoker.checked : true,
    safeMode: false
  };
}

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

const canvasHost = document.getElementById("canvas") || document.getElementById("canvas-container");
canvasHost.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Camera + rig
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(0, 1.65, 6);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);

// Hands / controllers (hands-only is primary)
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  handLeft: renderer.xr.getHand(0),
  handRight: renderer.xr.getHand(1)
};

// Quest-safe session init
const sessionInit = { optionalFeatures: ["local-floor", "hand-tracking"] };
let xrStarting = false;
let xrSession = null;

async function enterVR() {
  if (xrStarting) return;
  xrStarting = true;
  try {
    if (!navigator.xr) {
      setStatus("WebXR not available in this browser.");
      log("[xr] navigator.xr missing");
      return;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      setStatus("immersive-vr not supported.");
      log("[xr] immersive-vr not supported");
      return;
    }

    setStatus("Requesting XR session…");
    log("[xr] requestSession…", sessionInit);

    try {
      xrSession = await navigator.xr.requestSession("immersive-vr", sessionInit);
      log("[xr] requestSession ✅");
    } catch (err) {
      log("[xr] requestSession ❌", err?.name, err?.message);
      setStatus(`VR failed: <b>${err?.name || "Error"}</b> ${err?.message || ""}`);
      return;
    }

    xrSession.addEventListener("end", () => {
      log("[xr] sessionend ✅");
      setStatus("XR session ended.");
      xrSession = null;
    });

    renderer.xr.setSession(xrSession);

    const OPTS = readOPTS();

    if (OPTS.autobuild) {
      setStatus("Entered VR ✅ Building world… (Use VR panel: LEFT pinch toggle, RIGHT pinch click)");
      await HybridWorld.build({ THREE, renderer, camera, player, controllers, log, OPTS });
      setStatus("Ready ✅ (In VR: LEFT pinch toggles panel, RIGHT pinch clicks)");
    } else {
      setStatus("Entered VR ✅ (Auto-build OFF). Tap Rebuild World (outside VR) or use VR panel once built.");
    }

  } finally {
    xrStarting = false;
  }
}

async function rebuildWorld() {
  const OPTS = readOPTS();
  setStatus("Rebuilding world…");
  await HybridWorld.rebuild({ THREE, renderer, camera, player, controllers, log, OPTS });
  setStatus("Rebuilt ✅ (In VR: LEFT pinch toggle panel, RIGHT pinch click)");
}

function enableSafeMode() {
  // Safe mode happens in world options (and VR panel can set it too)
  if (opt_allowTeleport) opt_allowTeleport.checked = false;
  if (opt_allowBots) opt_allowBots.checked = false;
  if (opt_allowPoker) opt_allowPoker.checked = false;
  setStatus("Safe Mode armed ✅ (disabled bots/poker/teleport). Now Rebuild World.");
  log("[mode] safe mode armed (ui)");
}

function hardReset() {
  location.reload();
}

enterVrBtn?.addEventListener("click", enterVR);
rebuildBtn?.addEventListener("click", rebuildWorld);
safeModeBtn?.addEventListener("click", enableSafeMode);
hardResetBtn?.addEventListener("click", hardReset);

// Render loop
renderer.setAnimationLoop(() => {
  HybridWorld.frame({ renderer, camera });
});

// Boot status
log("[main] boot", "v=" + Date.now());
log("href=" + location.href);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + !!navigator.xr);
setStatus("Ready. Tap <b>Enter VR</b>.");

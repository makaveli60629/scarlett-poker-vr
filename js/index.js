// /js/index.js — Scarlett VR Poker Hybrid 1.0 (FULL, Quest-safe, /js/ path)
// ✅ ASSUMES: index.html loads this file with: <script type="module" src="./js/index.js"></script>
// ✅ Works with: /js/world.js exporting { HybridWorld }
// ✅ Quest click-safe: requestSession happens immediately inside user gesture handler
// ✅ Full HUD wiring: Enter/Exit VR, Build/Rebuild, Safe Mode, Hard Reset, Start Audio
// ✅ Full Logs: Copy/Download/Clear/Dump
// ✅ Full Diagnostics panel refresh
// ✅ Never-black failsafe: if world isn't built yet, renders a boot scene (glowing cube)

import { HybridWorld } from "./world.js";

const $ = (id) => document.getElementById(id);

// HUD
const statusEl = $("status");
const logEl = $("log");
const diagKv = $("diagKv");
const fatalEl = $("fatal"); // optional (only exists in failsafe html)

// Buttons
const enterVrBtn = $("enterVrBtn") || $("manualEnterVrBtn"); // supports either id
const manualEnterVrBtn = $("manualEnterVrBtn");             // optional
const exitVrBtn = $("exitVrBtn");
const rebuildBtn = $("rebuildBtn") || $("buildNowBtn");     // supports either id
const safeModeBtn = $("safeModeBtn");
const hardResetBtn = $("hardResetBtn");
const startAudioBtn = $("startAudioBtn");

// Log tools
const copyLogsBtn = $("copyLogsBtn");
const downloadLogsBtn = $("downloadLogsBtn");
const clearLogsBtn = $("clearLogsBtn");
const dumpStateBtn = $("dumpStateBtn");

// Options (optional; defaults provided)
const opt_autobuild = $("opt_autobuild");
const opt_nonvrControls = $("opt_nonvrControls");
const opt_allowTeleport = $("opt_allowTeleport");
const opt_allowBots = $("opt_allowBots");
const opt_allowPoker = $("opt_allowPoker");
const opt_allowStream = $("opt_allowStream");

// ---------- Logging ----------
const LOGS = [];
function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }
function stamp() { return new Date().toLocaleTimeString(); }

function setStatus(html) {
  console.log("[ui]", html);
  if (statusEl) statusEl.innerHTML = html;
}

function log(...a) {
  console.log(...a);
  const line = `[${stamp()}] ` + a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ");
  LOGS.push(line);
  if (logEl) {
    logEl.textContent = LOGS.slice(-500).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function fatal(msg, err) {
  const text = msg + (err ? `\n${err?.stack || err?.message || err}` : "");
  log("[FATAL]", text);
  if (fatalEl) {
    fatalEl.style.display = "block";
    fatalEl.textContent = text;
  }
  setStatus(`❌ <b>Boot error</b>. See logs.`);
}

// Global error hooks (so you *see* what's wrong)
window.addEventListener("error", (e) => fatal("Window error:", e?.error || e?.message || e));
window.addEventListener("unhandledrejection", (e) => fatal("Unhandled promise rejection:", e?.reason || e));

// ---------- Hard requirements ----------
if (typeof THREE === "undefined") {
  fatal("THREE is undefined. You must include Three.js in index.html (script tag).");
  throw new Error("THREE undefined");
}

// ---------- Read Options ----------
function readOPTS() {
  return {
    autobuild: opt_autobuild ? !!opt_autobuild.checked : true,
    nonvrControls: opt_nonvrControls ? !!opt_nonvrControls.checked : true,
    allowTeleport: opt_allowTeleport ? !!opt_allowTeleport.checked : true,
    allowBots: opt_allowBots ? !!opt_allowBots.checked : true,
    allowPoker: opt_allowPoker ? !!opt_allowPoker.checked : true,
    allowStream: opt_allowStream ? !!opt_allowStream.checked : true,
    safeMode: false
  };
}

// ---------- Renderer + Cameras ----------
log("[main] boot", "v=" + Date.now());
log("href=" + location.href);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + !!navigator.xr);

// Canvas host (#canvas in your html)
const canvasHost = $("canvas") || $("canvas-container");
if (!canvasHost) {
  fatal("Missing #canvas (or #canvas-container) in index.html. Cannot attach renderer.");
  throw new Error("No canvas host");
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
canvasHost.appendChild(renderer.domElement);

// Boot/fallback scene (so it never stays black)
const bootScene = new THREE.Scene();
bootScene.background = new THREE.Color(0x0a0b12);

const bootCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
bootCamera.position.set(0, 1.4, 3);

bootScene.add(new THREE.HemisphereLight(0x9fb3ff, 0x111122, 1.0));
const dl = new THREE.DirectionalLight(0xffffff, 0.8);
dl.position.set(3, 6, 2);
bootScene.add(dl);

const bootFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x101225, roughness: 0.95 })
);
bootFloor.rotation.x = -Math.PI / 2;
bootScene.add(bootFloor);

const bootCube = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25 })
);
bootCube.position.set(0, 1.2, 0);
bootScene.add(bootCube);

// Main camera + rig for HybridWorld
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(0, 1.65, 6);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);

// Hands/controllers (hands-only supported)
const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  handLeft: renderer.xr.getHand(0),
  handRight: renderer.xr.getHand(1),
};

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);

  bootCamera.aspect = window.innerWidth / window.innerHeight;
  bootCamera.updateProjectionMatrix();

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- Diagnostics ----------
function kvRow(k, v, cls = "") {
  return `<div class="k">${k}</div><div class="v ${cls}">${v}</div>`;
}

let xrSupportedCached = null;

async function refreshDiagnostics() {
  const hasXR = !!navigator.xr;
  const presenting = !!renderer.xr.isPresenting;

  if (hasXR && xrSupportedCached === null) {
    try { xrSupportedCached = await navigator.xr.isSessionSupported("immersive-vr"); }
    catch { xrSupportedCached = false; }
  }

  const supported = hasXR ? (xrSupportedCached ? "yes" : "no") : "missing";

  const xrCam = renderer.xr.getCamera(camera);
  const camPos = xrCam?.position
    ? `${xrCam.position.x.toFixed(2)}, ${xrCam.position.y.toFixed(2)}, ${xrCam.position.z.toFixed(2)}`
    : "n/a";

  const handJoints =
    (controllers.handLeft?.joints ? "yes" : "no") + " / " + (controllers.handRight?.joints ? "yes" : "no");

  const rows = [
    kvRow("WebXR", hasXR ? "available" : "missing", hasXR ? "good" : "bad"),
    kvRow("immersive-vr", supported, supported === "yes" ? "good" : "bad"),
    kvRow("XR presenting", presenting ? "true" : "false", presenting ? "good" : "warn"),
    kvRow("Hand joints", handJoints, "warn"),
    kvRow("URL", location.pathname, ""),
  ];
  if (diagKv) diagKv.innerHTML = rows.join("");
}

// ---------- Quest-safe XR ----------
const sessionInit = { optionalFeatures: ["local-floor", "hand-tracking"] };
let xrSession = null;
let xrStarting = false;
let worldBuilt = false;

function wireGesture(el, fn) {
  if (!el) return;
  // Use multiple events so Quest always triggers at least one
  el.addEventListener("click", fn, { passive: true });
  el.addEventListener("pointerdown", fn, { passive: true });
  el.addEventListener("touchstart", fn, { passive: true });
}

async function requestXR_DIRECT() {
  // IMPORTANT: must be called directly by user gesture
  if (xrStarting) return;
  xrStarting = true;

  try {
    if (!navigator.xr) {
      setStatus("WebXR not available in this browser.");
      log("[xr] navigator.xr missing");
      return;
    }

    setStatus("Requesting XR session…");
    log("[xr] requestSession direct…", sessionInit);

    try {
      xrSession = await navigator.xr.requestSession("immersive-vr", sessionInit);
      log("[xr] requestSession ✅");
    } catch (err) {
      log("[xr] requestSession ❌", err?.name, err?.message, err);
      setStatus(`VR failed: <b>${err?.name || "Error"}</b> ${err?.message || ""}`);
      return;
    }

    xrSession.addEventListener("end", () => {
      log("[xr] session end ✅");
      setStatus("XR session ended.");
      xrSession = null;
    });

    renderer.xr.setSession(xrSession);
    setStatus("Entered VR ✅");

    // Build automatically if option enabled
    const OPTS = readOPTS();
    if (OPTS.autobuild && !worldBuilt) {
      setStatus("Entered VR ✅ Building world…<br/>In VR: <b>LEFT pinch</b> toggles panel, <b>RIGHT pinch</b> clicks.");
      await buildOrRebuild(false);
    } else {
      setStatus("Entered VR ✅ (Tap Rebuild World if needed).");
    }
  } finally {
    xrStarting = false;
  }
}

async function exitVR() {
  try {
    const s = xrSession || renderer.xr.getSession();
    if (s) await s.end();
  } catch (err) {
    log("[xr] exit error", err?.message || err);
  }
}

async function buildOrRebuild(isRebuild = true) {
  const OPTS = readOPTS();
  try {
    if (!worldBuilt || !isRebuild) {
      log("[world] build…", OPTS);
      await HybridWorld.build({ THREE, renderer, camera, player, controllers, log, OPTS });
      worldBuilt = true;
      setStatus("World built ✅<br/>In VR: <b>LEFT pinch</b> toggles panel, <b>RIGHT pinch</b> clicks.");
    } else {
      log("[world] rebuild…", OPTS);
      await HybridWorld.rebuild({ THREE, renderer, camera, player, controllers, log, OPTS });
      setStatus("World rebuilt ✅");
    }
  } catch (err) {
    fatal("HybridWorld build/rebuild failed.", err);
  }
}

function enableSafeMode() {
  if (opt_allowTeleport) opt_allowTeleport.checked = false;
  if (opt_allowBots) opt_allowBots.checked = false;
  if (opt_allowPoker) opt_allowPoker.checked = false;
  if (opt_allowStream) opt_allowStream.checked = false;
  setStatus("Safe Mode armed ✅. Now press Rebuild World.");
  log("[mode] safe mode armed (ui)");
}

function hardReset() {
  log("[reset] reload");
  location.reload();
}

async function startAudioGesture() {
  try {
    if (typeof HybridWorld.startAudio !== "function") {
      setStatus("No streaming audio in this build (HybridWorld.startAudio missing).");
      return;
    }
    await HybridWorld.startAudio(); // MUST be a user gesture
    setStatus("Audio started ✅ (spatial volume active).");
  } catch (err) {
    log("[audio] startAudio ❌", err?.name, err?.message, err);
    setStatus(`Audio blocked: <b>${err?.name || "Error"}</b> (tap again)`);
  }
}

// ---------- Wire HUD buttons ----------
wireGesture(enterVrBtn, requestXR_DIRECT);
wireGesture(manualEnterVrBtn, requestXR_DIRECT);

exitVrBtn?.addEventListener("click", exitVR);
rebuildBtn?.addEventListener("click", () => buildOrRebuild(true));
safeModeBtn?.addEventListener("click", enableSafeMode);
hardResetBtn?.addEventListener("click", hardReset);
wireGesture(startAudioBtn, startAudioGesture);

// Log tools
clearLogsBtn?.addEventListener("click", () => {
  LOGS.length = 0;
  if (logEl) logEl.textContent = "";
  log("[log] cleared");
});
copyLogsBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(LOGS.join("\n"));
    setStatus("Logs copied ✅");
  } catch {
    setStatus("Copy failed (clipboard blocked). Use Download Logs.");
  }
});
downloadLogsBtn?.addEventListener("click", () => {
  const blob = new Blob([LOGS.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scarlett_logs_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);

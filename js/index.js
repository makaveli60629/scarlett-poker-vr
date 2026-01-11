// /js/index.js — Scarlett Hybrid 1.0 (FULL + Streaming + Quest-safe XR)
import { HybridWorld } from "./world.js";

const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const logEl = $("log");
const diagKv = $("diagKv");

const enterVrBtn = $("enterVrBtn");
const exitVrBtn = $("exitVrBtn");
const rebuildBtn = $("rebuildBtn");
const safeModeBtn = $("safeModeBtn");
const hardResetBtn = $("hardResetBtn");
const startAudioBtn = $("startAudioBtn");

const copyLogsBtn = $("copyLogsBtn");
const downloadLogsBtn = $("downloadLogsBtn");
const clearLogsBtn = $("clearLogsBtn");
const dumpStateBtn = $("dumpStateBtn");

const opt_autobuild = $("opt_autobuild");
const opt_nonvrControls = $("opt_nonvrControls");
const opt_allowTeleport = $("opt_allowTeleport");
const opt_allowBots = $("opt_allowBots");
const opt_allowPoker = $("opt_allowPoker");
const opt_allowStream = $("opt_allowStream");

function setStatus(html) {
  console.log("[ui]", html);
  if (statusEl) statusEl.innerHTML = html;
}

const LOGS = [];
function safeJson(x) { try { return JSON.stringify(x); } catch { return String(x); } }
function stamp() { return new Date().toLocaleTimeString(); }
function log(...a) {
  console.log(...a);
  const line = `[${stamp()}] ` + a.map(x => (typeof x === "string" ? x : safeJson(x))).join(" ");
  LOGS.push(line);
  if (logEl) {
    logEl.textContent = LOGS.slice(-400).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
}

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

function kvRow(k, v, cls = "") {
  return `<div class="k">${k}</div><div class="v ${cls}">${v}</div>`;
}

// Renderer + rig
log("[main] boot", "v=" + Date.now());
log("href=" + location.href);
log("ua=" + navigator.userAgent);
log("navigator.xr=", !!navigator.xr);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

$("canvas").appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(0, 1.65, 6);

const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);

const controllers = {
  left: renderer.xr.getController(0),
  right: renderer.xr.getController(1),
  handLeft: renderer.xr.getHand(0),
  handRight: renderer.xr.getHand(1),
};

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Diagnostics
async function refreshDiagnostics() {
  const hasXR = !!navigator.xr;
  const presenting = !!renderer.xr.isPresenting;

  let supported = "unknown";
  if (hasXR) {
    try { supported = (await navigator.xr.isSessionSupported("immersive-vr")) ? "yes" : "no"; }
    catch { supported = "error"; }
  }

  const xrCam = renderer.xr.getCamera(camera);
  const camPos = xrCam?.position
    ? `${xrCam.position.x.toFixed(2)}, ${xrCam.position.y.toFixed(2)}, ${xrCam.position.z.toFixed(2)}`
    : "n/a";

  const handJoints =
    (controllers.handLeft?.joints ? "yes" : "no") + " / " + (controllers.handRight?.joints ? "yes" : "no");

  const rows = [
    kvRow("WebXR", hasXR ? "available" : "missing", hasXR ? "good" : "bad"),
    kvRow("immersive-vr", supported, supported === "yes" ? "good" : (supported === "no" ? "bad" : "warn")),
    kvRow("XR presenting", presenting ? "true" : "false", presenting ? "good" : "warn"),
    kvRow("Hand joints", handJoints, "warn"),
    kvRow("Camera", camPos, ""),
    kvRow("URL", location.hostname || location.href, ""),
  ];
  if (diagKv) diagKv.innerHTML = rows.join("");
}
refreshDiagnostics();
setInterval(refreshDiagnostics, 800);

// Quest-safe XR
const sessionInit = { optionalFeatures: ["local-floor", "hand-tracking"] };
let xrSession = null;
let xrStarting = false;

async function enterVR() {
  if (xrStarting) return;
  xrStarting = true;

  try {
    if (!navigator.xr) {
      setStatus("WebXR not available in this browser.");
      log("[xr] navigator.xr missing");
      return;
    }

    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    if (!ok) {
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
      log("[xr] requestSession ❌", err?.name, err?.message, err);
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
      setStatus("Entered VR ✅ Building world…<br/>In VR: <b>LEFT pinch</b> toggles panel, <b>RIGHT pinch</b> clicks.");
      await HybridWorld.build({ THREE, renderer, camera, player, controllers, log, OPTS });
      setStatus("Ready ✅<br/>Tap <b>Start Audio</b> once if you want stream sound.");
    } else {
      setStatus("Entered VR ✅ (Auto-build OFF). Tap Rebuild World outside VR.");
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

async function rebuildWorld() {
  const OPTS = readOPTS();
  setStatus("Rebuilding world…");
  await HybridWorld.rebuild({ THREE, renderer, camera, player, controllers, log, OPTS });
  setStatus("Rebuilt ✅");
}

function enableSafeMode() {
  if (opt_allowTeleport) opt_allowTeleport.checked = false;
  if (opt_allowBots) opt_allowBots.checked = false;
  if (opt_allowPoker) opt_allowPoker.checked = false;
  if (opt_allowStream) opt_allowStream.checked = false;
  setStatus("Safe Mode armed ✅. Tap Rebuild World.");
  log("[mode] safe mode armed (ui)");
}

function hardReset() {
  log("[reset] reload");
  location.reload();
}

async function startAudioGesture() {
  try {
    await HybridWorld.startAudio(); // must be user gesture
    setStatus("Audio started ✅ (spatial volume active).");
  } catch (err) {
    log("[audio] startAudio ❌", err?.name, err?.message, err);
    setStatus(`Audio blocked: <b>${err?.name || "Error"}</b> (tap again)`);
  }
}

enterVrBtn?.addEventListener("click", enterVR);
exitVrBtn?.addEventListener("click", exitVR);
rebuildBtn?.addEventListener("click", rebuildWorld);
safeModeBtn?.addEventListener("click", enableSafeMode);
hardResetBtn?.addEventListener("click", hardReset);
startAudioBtn?.addEventListener("click", startAudioGesture);

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
  setStatus("Logs downloaded ✅");
});
dumpStateBtn?.addEventListener("click", () => {
  log("[dump] xrPresenting=", renderer.xr.isPresenting);
  log("[dump] session=", !!renderer.xr.getSession());
  log("[dump] opts=", readOPTS());
});

// Render loop
renderer.setAnimationLoop(() => {
  HybridWorld.frame({ renderer, camera });
});

setStatus("Ready. Tap <b>Enter VR</b>.");

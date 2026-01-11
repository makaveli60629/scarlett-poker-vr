import { HybridWorld } from "./world.js";

/* ---------- HUD elements ---------- */
const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const logEl = $("log");
const diagKv = $("diagKv");

const enterVrBtn = $("enterVrBtn");
const exitVrBtn = $("exitVrBtn");
const rebuildBtn = $("rebuildBtn");
const safeModeBtn = $("safeModeBtn");
const hardResetBtn = $("hardResetBtn");

const copyLogsBtn = $("copyLogsBtn");
const downloadLogsBtn = $("downloadLogsBtn");
const clearLogsBtn = $("clearLogsBtn");
const dumpStateBtn = $("dumpStateBtn");

const opt_autobuild = $("opt_autobuild");
const opt_nonvrControls = $("opt_nonvrControls");
const opt_allowTeleport = $("opt_allowTeleport");
const opt_allowBots = $("opt_allowBots");
const opt_allowPoker = $("opt_allowPoker");

/* ---------- logging ---------- */
const LOGS = [];
function nowStamp() {
  const d = new Date();
  return d.toLocaleTimeString();
}
function setStatus(msg) {
  if (statusEl) statusEl.innerHTML = msg;
}
function log(...a) {
  const line = `[${nowStamp()}] ` + a.map(x => typeof x === "string" ? x : safeJson(x)).join(" ");
  LOGS.push(line);
  console.log(...a);
  if (logEl) {
    logEl.textContent = LOGS.slice(-300).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
}
function safeJson(x) {
  try { return JSON.stringify(x); } catch { return String(x); }
}

/* ---------- options state (affects world loader only, not XR init) ---------- */
const OPTS = {
  autobuild: true,
  nonvrControls: true,
  allowTeleport: true,
  allowBots: true,
  allowPoker: true,
  safeMode: false,
};
function syncOptsFromUI() {
  OPTS.autobuild = !!opt_autobuild?.checked;
  OPTS.nonvrControls = !!opt_nonvrControls?.checked;
  OPTS.allowTeleport = !!opt_allowTeleport?.checked;
  OPTS.allowBots = !!opt_allowBots?.checked;
  OPTS.allowPoker = !!opt_allowPoker?.checked;
}

/* ---------- renderer + camera ---------- */
log("[main] boot v=" + Date.now());
log("href=" + location.href);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + !!navigator.xr);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
$("canvas").appendChild(renderer.domElement);

// Camera base (XR camera comes from renderer.xr.getCamera)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(0, 1.65, 6);

// Player rig
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);

// Controllers + hands (hands are primary)
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

/* ---------- Quest-safe XR init ---------- */
const sessionInit = {
  // DO NOT add dom-overlay / depth-sensing / anchors / plane-detection / mesh-detection here.
  // This is the #1 cause of "VR failed" / stuck loaders on Quest.
  optionalFeatures: ["local-floor", "hand-tracking"]
};

let xrStarting = false;
let xrSession = null;

/* ---------- diagnostics ---------- */
function kvRow(k, v, cls="") {
  return `<div class="k">${k}</div><div class="v ${cls}">${v}</div>`;
}
async function refreshDiagnostics() {
  const presenting = !!renderer.xr.isPresenting;
  const hasXR = !!navigator.xr;

  let supported = "unknown";
  if (hasXR) {
    try {
      supported = await navigator.xr.isSessionSupported("immersive-vr") ? "yes" : "no";
    } catch { supported = "error"; }
  }

  const handJoints =
    (controllers.handLeft?.joints ? "yes" : "no") + " / " + (controllers.handRight?.joints ? "yes" : "no");

  const xrCam = renderer.xr.getCamera(camera);
  const camPos = xrCam?.position ? `${xrCam.position.x.toFixed(2)}, ${xrCam.position.y.toFixed(2)}, ${xrCam.position.z.toFixed(2)}` : "n/a";

  const rows = [
    kvRow("WebXR", hasXR ? "available" : "missing", hasXR ? "good" : "bad"),
    kvRow("immersive-vr", supported, supported === "yes" ? "good" : (supported === "no" ? "bad" : "warn")),
    kvRow("XR presenting", presenting ? "true" : "false", presenting ? "good" : "warn"),
    kvRow("XR hands joints", handJoints, "warn"),
    kvRow("URL", location.hostname || location.href, ""),
    kvRow("Camera", camPos, ""),
  ];
  diagKv.innerHTML = rows.join("");
}

setInterval(refreshDiagnostics, 800);
refreshDiagnostics();

/* ---------- world build helpers ---------- */
async function buildWorld() {
  syncOptsFromUI();

  // Pass your options down. Your HybridWorld can read ctx.OPTS to skip systems safely.
  await HybridWorld.build({
    THREE,
    renderer,
    camera,
    player,
    controllers,
    log,
    OPTS
  });
}

async function rebuildWorld() {
  syncOptsFromUI();
  await HybridWorld.rebuild({
    THREE,
    renderer,
    camera,
    player,
    controllers,
    log,
    OPTS
  });
}

/* ---------- XR entry/exit ---------- */
async function enterVR() {
  if (xrStarting) return;
  xrStarting = true;

  try {
    syncOptsFromUI();

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
    log("[xr] requestSession…", safeJson(sessionInit));

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
    setStatus("Entered VR ✅");

    // Build world after XR begins = most stable on Quest
    if (OPTS.autobuild) {
      setStatus("Building world…");
      await buildWorld();
      setStatus("Ready ✅ (Hands-only).");
    } else {
      setStatus("Entered VR ✅ (Auto-build OFF). Tap Rebuild World.");
    }

  } finally {
    xrStarting = false;
  }
}

async function exitVR() {
  try {
    if (xrSession) {
      await xrSession.end();
    } else if (renderer.xr.getSession()) {
      await renderer.xr.getSession().end();
    }
  } catch (e) {
    log("[xr] exit error", e?.message || e);
  }
}

/* ---------- Safe Mode ---------- */
function enableSafeMode() {
  OPTS.safeMode = true;

  // Force-disable optional systems (prevents module crashes from breaking your session)
  opt_allowTeleport.checked = false;
  opt_allowBots.checked = false;
  opt_allowPoker.checked = false;

  setStatus("Safe Mode enabled. Optional systems disabled. Tap Rebuild World.");
  log("[mode] SAFE MODE enabled");
}

/* ---------- Hard reset ---------- */
function hardReset() {
  log("[reset] hard reset");
  // fastest reliable: reload page
  location.reload();
}

/* ---------- Button wiring (this is what you were missing) ---------- */
enterVrBtn.addEventListener("click", enterVR);
exitVrBtn.addEventListener("click", exitVR);
rebuildBtn.addEventListener("click", async () => {
  setStatus("Rebuilding world…");
  await rebuildWorld();
  setStatus("Rebuilt ✅");
});
safeModeBtn.addEventListener("click", enableSafeMode);
hardResetBtn.addEventListener("click", hardReset);

/* ---------- Log tools ---------- */
clearLogsBtn.addEventListener("click", () => {
  LOGS.length = 0;
  if (logEl) logEl.textContent = "";
  log("[log] cleared");
});
copyLogsBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(LOGS.join("\n"));
    setStatus("Logs copied ✅");
  } catch {
    setStatus("Copy failed (clipboard blocked). Use Download Logs.");
  }
});
downloadLogsBtn.addEventListener("click", () => {
  const blob = new Blob([LOGS.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scarlett_logs_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Logs downloaded ✅");
});
dumpStateBtn.addEventListener("click", () => {
  log("[dump] OPTS=", OPTS);
  log("[dump] XR presenting=", renderer.xr.isPresenting);
  log("[dump] session=", !!renderer.xr.getSession());
});

/* ---------- Start animation loop ---------- */
renderer.setAnimationLoop(() => {
  HybridWorld.frame({ renderer, camera });
});

// initial UI state
setStatus("Ready. Tap <b>Enter VR</b>.");

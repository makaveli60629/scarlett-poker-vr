// index.js — FAILSAFE BOOT + Manual Enter VR (Direct) + HybridWorld loader

let HybridWorld = null;

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const logEl = $("log");
const fatalEl = $("fatal");

function setStatus(html) {
  console.log("[ui]", html);
  if (statusEl) statusEl.innerHTML = html;
}
const LOGS = [];
function stamp(){ return new Date().toLocaleTimeString(); }
function log(...a) {
  console.log(...a);
  const line = `[${stamp()}] ` + a.map(x => typeof x === "string" ? x : safeJson(x)).join(" ");
  LOGS.push(line);
  if (logEl) {
    logEl.textContent = LOGS.slice(-500).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
}
function safeJson(x){ try { return JSON.stringify(x); } catch { return String(x); } }
function fatal(msg, err) {
  const text = msg + (err ? `\n${err?.stack || err?.message || err}` : "");
  log("[FATAL]", text);
  if (fatalEl) {
    fatalEl.style.display = "block";
    fatalEl.textContent = text;
  }
  setStatus(`❌ <b>Boot error</b>. See red box.`);
}

// --- global error hooks ---
window.addEventListener("error", (e) => {
  fatal("Window error:", e?.error || e?.message || e);
});
window.addEventListener("unhandledrejection", (e) => {
  fatal("Unhandled promise rejection:", e?.reason || e);
});

// --- Hard requirement ---
if (typeof THREE === "undefined") {
  fatal("THREE is undefined. Three.js script failed to load.\nCheck index.html has the Three.js <script> tag.");
  throw new Error("THREE undefined");
}

// --- Renderer + always-visible boot scene ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

const canvasHost = $("canvas");
canvasHost.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  bootCamera.aspect = window.innerWidth / window.innerHeight;
  bootCamera.updateProjectionMatrix();
});

// Boot scene (guaranteed visible)
const bootScene = new THREE.Scene();
bootScene.background = new THREE.Color(0x0a0b12);

const bootCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
bootCamera.position.set(0, 1.4, 3);

bootScene.add(new THREE.HemisphereLight(0x9fb3ff, 0x111122, 1.0));
const dl = new THREE.DirectionalLight(0xffffff, 0.8);
dl.position.set(3, 6, 2);
bootScene.add(dl);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x101225, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
bootScene.add(floor);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x7fe7ff, roughness: 0.35, metalness: 0.25 })
);
cube.position.set(0, 1.2, 0);
bootScene.add(cube);

setStatus("Boot scene loaded ✅ (You should see a glowing cube). Loading HybridWorld…");
log("[boot] started", "ua=" + navigator.userAgent, "xr=" + !!navigator.xr);

// XR session init (minimal = Quest safe)
const sessionInit = { optionalFeatures: ["local-floor", "hand-tracking"] };
let xrSession = null;
let xrStarting = false;

// Rig objects for HybridWorld (it expects these)
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

// Manual Enter VR (Direct) — Quest gesture safe
async function manualEnterVR_Direct() {
  if (xrStarting) return;
  xrStarting = true;
  try {
    if (!navigator.xr) {
      setStatus("WebXR not available in this browser.");
      log("[xr] navigator.xr missing");
      return;
    }

    // DO NOT await anything before requestSession (Quest gesture!)
    setStatus("Requesting XR session (Direct)…");
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
    setStatus("Entered VR ✅ (Now click Build World Now if it didn’t auto-build).");
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

function hardReset() {
  location.reload();
}

// Build world now (2D or VR)
async function buildWorldNow() {
  if (!HybridWorld) {
    setStatus("HybridWorld not loaded yet. Check red error box / logs.");
    return;
  }
  setStatus("Building HybridWorld…");
  try {
    await HybridWorld.build({
      THREE,
      renderer,
      camera,
      player,
      controllers,
      log,
      OPTS: {
        autobuild: false,
        nonvrControls: true,
        allowTeleport: true,
        allowBots: true,
        allowPoker: true,
        allowStream: true,
        safeMode: false
      }
    });
    setStatus("HybridWorld built ✅ (If in VR: use LEFT pinch menu).");
  } catch (err) {
    fatal("HybridWorld.build failed:", err);
  }
}

// Wire buttons (use pointerdown too)
const manualEnterVrBtn = $("manualEnterVrBtn");
const buildNowBtn = $("buildNowBtn");
const exitVrBtn = $("exitVrBtn");
const hardResetBtn = $("hardResetBtn");

function wireGesture(el, fn) {
  if (!el) return;
  el.addEventListener("click", fn, { passive: true });
  el.addEventListener("pointerdown", fn, { passive: true });
  el.addEventListener("touchstart", fn, { passive: true });
}
wireGesture(manualEnterVrBtn, manualEnterVR_Direct);
wireGesture(buildNowBtn, buildWorldNow);

exitVrBtn?.addEventListener("click", exitVR);
hardResetBtn?.addEventListener("click", hardReset);

// Try to import HybridWorld (but keep boot scene running no matter what)
(async () => {
  try {
    const mod = await import("./world.js");
    HybridWorld = mod?.HybridWorld || null;
    if (!HybridWorld) throw new Error("world.js loaded but did not export HybridWorld");
    log("[import] world.js ✅ HybridWorld found");
    setStatus("HybridWorld loaded ✅. You can now press <b>Manual Enter VR</b> or <b>Build World Now</b>.");
  } catch (err) {
    fatal("Failed to import ./world.js (wrong path or syntax error).", err);
  }
})();

// Animation loop: show boot scene until HybridWorld is built
renderer.setAnimationLoop(() => {
  const dt = 0.016;

  // Spin cube so you always know rendering works
  cube.rotation.y += dt * 0.9;
  cube.rotation.x += dt * 0.35;

  // If HybridWorld has a scene built, let it render.
  try {
    HybridWorld?.frame?.({ renderer, camera });
  } catch (e) {
    // if HybridWorld frame fails, keep boot scene alive
  }

  // If HybridWorld didn't render anything, you'll still see the boot cube
  // because we render it after (acts as fallback visual)
  renderer.autoClear = true;
  renderer.render(bootScene, bootCamera);
});

// /js/index.js — Scarlett VR Poker Boot + Android Controls + Full Diagnostics v4.0 (FULL)
// ✅ Works with FULL WORLD world.js (HybridWorld)
// ✅ Android movement: touch_controls.js (if present) + keyboard fallback
// ✅ Full diagnostics: console hijack + window.onerror + unhandledrejection + COPY LOG buffer
// ✅ Fixes “floating”: exposes RESPawn SAFE + SNAP DOWN (calls HybridWorld + hard fallback)
// ✅ Cache-bust friendly (set INDEX_VERSION)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

// ====== IMPORTANT: bump this number anytime you change files to defeat cache
const INDEX_VERSION = 4001;

// Load world with cache-bust
const { HybridWorld } = await import(`./world.js?v=${INDEX_VERSION}`);

const BUILD_STAMP = Date.now();
const overlay = document.getElementById("overlay");

// --------------------
// Log recorder (overlay + memory buffer)
// --------------------
const LOG = [];
const LOG_MAX = 2500;

function pushLog(line) {
  LOG.push(line);
  if (LOG.length > LOG_MAX) LOG.shift();
}

function writeOverlay(line, cls = "muted") {
  try {
    if (!overlay) return;
    const div = document.createElement("div");
    div.className = `row ${cls}`;
    div.textContent = line;
    overlay.appendChild(div);
    overlay.scrollTop = overlay.scrollHeight;
  } catch (e) {}
}

function logLine(line, cls = "muted") {
  const s = String(line);
  pushLog(s);
  writeOverlay(s, cls);
  try { console.log(s); } catch (e) {}
}

const ok   = (m) => logLine(`✅ ${m}`, "ok");
const warn = (m) => logLine(`⚠️ ${m}`, "warn");
const bad  = (m) => logLine(`❌ ${m}`, "bad");

// Hijack console so anything written to console becomes copyable
(function hijackConsole() {
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...a) => { orig.log(...a);  try { logLine(a.map(String).join(" "), "muted"); } catch(e){} };
  console.warn= (...a) => { orig.warn(...a); try { logLine(a.map(String).join(" "), "warn"); } catch(e){} };
  console.error=(...a) => { orig.error(...a);try { logLine(a.map(String).join(" "), "bad"); } catch(e){} };
})();

// Global error capture
window.addEventListener("error", (e) => {
  const msg = e?.message || "window.error";
  const src = e?.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno}` : "";
  bad(`WINDOW ERROR: ${msg}${src}`);
  if (e?.error?.stack) logLine(e.error.stack, "bad");
});

window.addEventListener("unhandledrejection", (e) => {
  bad("UNHANDLED PROMISE REJECTION:");
  const r = e?.reason;
  if (r?.message) bad(r.message);
  else bad(String(r));
  if (r?.stack) logLine(r.stack, "bad");
});

// --------------------
// Anti gesture (Android)
// --------------------
function lockTouchGestures() {
  try {
    document.documentElement.style.touchAction = "none";
    document.body.style.touchAction = "none";
    window.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });
    window.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
    window.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
    window.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });
  } catch (e) {}
}

// --------------------
// Clipboard helpers
// --------------------
async function copyLogToClipboard() {
  const text = LOG.join("\n");
  if (!text.trim()) { warn("Nothing to copy"); return { ok:false, reason:"empty" }; }
  try {
    await navigator.clipboard.writeText(text);
    ok("Copied log to clipboard ✅");
    return { ok:true };
  } catch (e) {
    // fallback: select overlay
    try {
      const range = document.createRange();
      range.selectNodeContents(overlay);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      warn("Clipboard blocked — selected text (use Copy)");
      return { ok:false, reason:"clipboard-blocked" };
    } catch (e2) {
      bad("Copy failed");
      return { ok:false, reason:"copy-failed" };
    }
  }
}

// --------------------
// THREE boot
// --------------------
function header() {
  logLine(`BUILD_STAMP: ${BUILD_STAMP}`);
  logLine(`TIME: ${new Date().toLocaleString()}`);
  logLine(`HREF: ${location.href}`);
  logLine(`UA: ${navigator.userAgent}`);
  logLine(`NAVIGATOR_XR: ${!!navigator.xr}`);
  logLine(`THREE: module ok`);
}

function createRenderer() {
  logLine("WEBGL_CANVAS: creating renderer…");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  ok("Renderer created");
  return renderer;
}

function makeRig() {
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 600);
  camera.position.set(0, 1.65, 0);
  camera.name = "MainCamera";
  player.add(camera);

  ok("PlayerRig + Camera created");
  return { player, camera };
}

function makeXRHands(renderer) {
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  handLeft.name = "HandLeft";
  handRight.name = "HandRight";
  ok("XR Hands placeholders ready");
  return { handLeft, handRight };
}

function attachVRButton(renderer) {
  try {
    const btn = VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    ok("VRButton appended");
  } catch (e) {
    warn("VRButton failed (non-fatal): " + (e?.message || e));
  }
}

// --------------------
// Optional: Touch controls module (Android joystick)
// --------------------
async function initTouchControls(ctx) {
  // If you already have /js/touch_controls.js in your project, this will run it.
  // It should export { TouchControls } or default.
  const mod = await (async () => {
    try {
      return await import(`./touch_controls.js?v=${INDEX_VERSION}`);
    } catch (e) {
      warn("[touch] touch_controls.js not found (ok) — using keyboard/mouse only");
      return null;
    }
  })();

  const api = mod?.TouchControls || mod?.default;
  if (!api?.init) return null;

  try {
    const controls = api.init({
      THREE,
      renderer: ctx.renderer,
      camera: ctx.camera,
      player: ctx.player,
      log: (m)=>logLine(String(m))
    });
    ok("[touch] init ✅");
    return controls;
  } catch (e) {
    warn("[touch] init FAIL: " + (e?.message || e));
    return null;
  }
}

// --------------------
// Global SCARLETT API for your index.html buttons
// --------------------
function installScarlettAPI(ctx) {
  const { renderer, player, camera } = ctx;

  window.SCARLETT = window.SCARLETT || {};

  window.SCARLETT.copyLog = copyLogToClipboard;

  window.SCARLETT.gotoTable = () => {
    try {
      player.position.set(0, player.position.y, 4.2);
      player.rotation.set(0, Math.PI, 0);
      ok("gotoTable()");
    } catch (e) {
      bad("gotoTable() failed: " + (e?.message || e));
    }
  };

  window.SCARLETT.respawnSafe = () => {
    try {
      // If HybridWorld provides a helper later, prefer it.
      if (HybridWorld?.respawnSafe) {
        HybridWorld.respawnSafe();
        ok("respawnSafe() via HybridWorld");
        return;
      }
    } catch (e) {}
    // fallback
    player.position.set(0, 0.02, 26);
    camera.position.set(0, 1.65, 0);
    ok("respawnSafe() fallback");
  };

  window.SCARLETT.snapDown = () => {
    // Hard snap down to lobby floor. (No raycasting needed)
    player.position.y = 0.02;
    camera.position.set(0, 1.65, 0);
    ok("snapDown() -> y=0.02");
  };

  window.SCARLETT.rebuild = async (opts = {}) => {
    ok("Rebuild requested…");
    try {
      await HybridWorld.build({
        THREE,
        renderer,
        camera,
        player,
        controllers: ctx.controllers,
        log: (...a)=>logLine(a.map(String).join(" "), "muted"),
        OPTS: {
          nonvrControls: true,
          allowTeleport: true,
          allowBots: true,
          allowPoker: true,
          safeMode: !!opts.safeMode
        }
      });
      ok("Rebuild done ✅");
    } catch (e) {
      bad("Rebuild failed: " + (e?.message || e));
      if (e?.stack) logLine(e.stack, "bad");
    }
  };

  window.SCARLETT.setSafeMode = async (v = true) => {
    await window.SCARLETT.rebuild({ safeMode: !!v });
  };
}

// --------------------
// Boot
// --------------------
async function boot() {
  lockTouchGestures();
  overlay && (overlay.innerHTML = "");
  LOG.length = 0;

  header();

  const renderer = createRenderer();
  const { player, camera } = makeRig();
  const controllers = makeXRHands(renderer);

  attachVRButton(renderer);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const ctx = { renderer, player, camera, controllers };
  installScarlettAPI(ctx);

  // Touch controls (if file exists)
  let touch = null;
  touch = await initTouchControls(ctx);

  // Build world
  try {
    await HybridWorld.build({
      THREE,
      renderer,
      camera,
      player,
      controllers,
      log: (...a)=>logLine(a.map(String).join(" "), "muted"),
      OPTS: {
        nonvrControls: true,
        allowTeleport: true,
        allowBots: true,
        allowPoker: true,
        safeMode: false
      }
    });
    ok("HybridWorld.build ✅");
  } catch (e) {
    bad("HybridWorld.build FAILED: " + (e?.message || e));
    if (e?.stack) logLine(e.stack, "bad");
  }

  // Animation loop
  renderer.setAnimationLoop(() => {
    try {
      const dt = 1/60;

      // update touch controls if present
      try { touch?.update?.(dt); } catch(e) {}

      HybridWorld.frame({ renderer, camera });
    } catch (e) {
      bad("frame crash: " + (e?.message || e));
      if (e?.stack) logLine(e.stack, "bad");
      renderer.setAnimationLoop(null);
    }
  });

  ok("Animation loop running");
}

boot().catch((e) => {
  bad("BOOT fatal: " + (e?.message || e));
  if (e?.stack) logLine(e.stack, "bad");
});

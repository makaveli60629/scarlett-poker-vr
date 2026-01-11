// /js/index.js — Scarlett VR Poker Boot + Diagnostic Recorder v3.0 (FULL)
// ✅ Captures ALL errors: console + window.onerror + unhandledrejection
// ✅ Writes into #overlay + keeps a memory buffer (for copy)
// ✅ Exposes window.SCARLETT.copyLog(), respawnSafe(), gotoTable()
// ✅ Boots HybridWorld
// ✅ Prints spawn telemetry each second (player/camera heights)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { HybridWorld } from "./world.js";

const BUILD_STAMP = Date.now();
const overlay = document.getElementById("overlay");

// --- log buffer (for copy)
const LOG = [];
const LOG_MAX = 2000;

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
  } catch(e){}
}

function logLine(line, cls="muted") {
  const s = String(line);
  pushLog(s);
  writeOverlay(s, cls);
  // still mirror to real console
  try { console.log(s); } catch(e){}
}

const ok   = (m)=>logLine(`✅ ${m}`, "ok");
const warn = (m)=>logLine(`⚠️ ${m}`, "warn");
const bad  = (m)=>logLine(`❌ ${m}`, "bad");

// --- Capture console output too (so module loaders that use console get recorded)
(function hijackConsole(){
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
  console.log = (...a) => { orig.log(...a);  logLine(a.map(String).join(" "), "muted"); };
  console.warn= (...a) => { orig.warn(...a); logLine(a.map(String).join(" "), "warn"); };
  console.error=(...a) => { orig.error(...a);logLine(a.map(String).join(" "), "bad"); };
})();

// --- Global error capture (this is what you were missing)
window.addEventListener("error", (e) => {
  const msg = e?.message || "window.error";
  const src = e?.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno}` : "";
  bad(`WINDOW ERROR: ${msg}${src}`);
  if (e?.error?.stack) logLine(e.error.stack, "bad");
});

window.addEventListener("unhandledrejection", (e) => {
  const r = e?.reason;
  bad("UNHANDLED PROMISE REJECTION:");
  if (r?.message) bad(r.message);
  else bad(String(r));
  if (r?.stack) logLine(r.stack, "bad");
});

// --- Anti-gesture
function lockTouchGestures() {
  try {
    document.documentElement.style.touchAction = "none";
    document.body.style.touchAction = "none";
    window.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });
  } catch(e){}
}

// --- Copy
async function copyLog() {
  const text = LOG.join("\n");
  if (!text.trim()) return { ok:false, reason:"empty" };
  try {
    await navigator.clipboard.writeText(text);
    ok("Copied log to clipboard ✅");
    return { ok:true };
  } catch(e) {
    warn("Clipboard blocked — selecting log text instead");
    try {
      const range = document.createRange();
      range.selectNodeContents(overlay);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return { ok:false, reason:"clipboard-blocked" };
    } catch(e2) {
      bad("Copy failed");
      return { ok:false, reason:"copy-failed" };
    }
  }
}

// --- Boot header
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

// --- Spawn telemetry + snap-down helper (fix “floating”)
function installSpawnTelemetry({ renderer, player, camera }) {
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const ray = new THREE.Raycaster();

  function snapDown(reason="snap") {
    // raycast from camera down; align rig base to floor hit
    try {
      const cam = renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
      cam.getWorldPosition(tmpV);

      ray.set(tmpV.clone().add(new THREE.Vector3(0, 5, 0)), new THREE.Vector3(0, -1, 0));
      const scene = HybridWorld?.__debugScene?.() || null; // optional hook (if you add later)
      const hits = scene ? ray.intersectObjects(scene.children, true) : [];
      const hit = hits.find(h => (h.object?.name || "").toLowerCase().includes("floor")) || hits[0];

      if (hit) {
        // put player rig base on floor
        const floorY = hit.point.y;
        player.position.y = floorY;
        ok(`[spawn] SNAP DOWN ✅ (${reason}) floorY=${floorY.toFixed(2)}`);
      } else {
        warn("[spawn] SNAP DOWN: no floor hit (scene hook missing) — leaving Y as-is");
      }
    } catch(e) {
      warn("[spawn] SNAP DOWN failed: " + (e?.message || e));
    }
  }

  // expose buttons to UI
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.copyLog = copyLog;
  window.SCARLETT.snapDown = () => snapDown("button");

  // print telemetry every second in 2D
  let t = 0;
  return {
    update(dt) {
      t += dt;
      if (t < 1.0) return;
      t = 0;

      try {
        player.getWorldPosition(tmpV);
        camera.getWorldPosition(tmpV2);
        logLine(`[pos] rig y=${tmpV.y.toFixed(2)} cam y=${tmpV2.y.toFixed(2)} x=${tmpV.x.toFixed(2)} z=${tmpV.z.toFixed(2)}`, "muted");

        // if floating too high, auto attempt snapDown (2D only)
        if (!renderer.xr.isPresenting && tmpV2.y > 6) snapDown("auto-floating");
      } catch(e){}
    }
  };
}

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

  // expose helpers for your top UI
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.gotoTable = () => { player.position.set(0, player.position.y, 4.2); player.rotation.set(0, Math.PI, 0); ok("gotoTable()"); };
  window.SCARLETT.respawnSafe = () => { player.position.set(0, 0, 26); camera.position.set(0, 1.65, 0); ok("respawnSafe() fallback"); };

  // telemetry
  const telemetry = installSpawnTelemetry({ renderer, player, camera });

  // build world
  try {
    await HybridWorld.build({
      THREE,
      renderer,
      camera,
      player,
      controllers,
      log: (...a) => logLine(a.map(String).join(" "), "muted"),
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

  renderer.setAnimationLoop(() => {
    try {
      const dt = 1 / 60;
      telemetry.update(dt);
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

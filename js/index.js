// /js/index.js — Scarlett VR Poker Boot v2.0 (FULL)
// ✅ Works with the new index.html top dock + debug drawer + COPY LOG
// ✅ Writes logs into #overlay (the diagnostics panel)
// ✅ Creates renderer + PlayerRig + Camera
// ✅ Adds VRButton (Quest + WebXR)
// ✅ Imports and runs HybridWorld from /js/world.js
// ✅ Exposes window.SCARLETT actions for UI buttons:
//    - gotoTable(), respawnSafe(), rebuild(), setSafeMode(true/false), copyLog()
// ✅ Android-safe: disables touch gestures stealing input

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { HybridWorld } from "./world.js";

const BUILD_STAMP = Date.now();
const overlay = document.getElementById("overlay");

// --------------------
// Logging utilities
// --------------------
function logLine(msg, cls = "muted") {
  try {
    if (overlay) {
      const div = document.createElement("div");
      div.className = `row ${cls}`;
      div.textContent = msg;
      overlay.appendChild(div);
      overlay.scrollTop = overlay.scrollHeight;
    }
  } catch (e) {}
  console.log(msg);
}
const ok = (m) => logLine(`✅ ${m}`, "ok");
const warn = (m) => logLine(`⚠️ ${m}`, "warn");
const bad = (m) => logLine(`❌ ${m}`, "bad");

function bootHeader() {
  logLine(`BUILD_STAMP: ${BUILD_STAMP}`);
  logLine(`TIME: ${new Date().toLocaleString()}`);
  logLine(`HREF: ${location.href}`);
  logLine(`UA: ${navigator.userAgent}`);
  logLine(`NAVIGATOR_XR: ${!!navigator.xr}`);
  logLine(`THREE: module ok`);
}

// --------------------
// Anti-gesture (Android)
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
// THREE boot
// --------------------
function createRenderer() {
  logLine("WEBGL_CANVAS: creating renderer…");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    // camera aspect updated below in boot() where camera exists
  });

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
    btn.id = btn.id || "VRButton";
    document.body.appendChild(btn);
    ok("VRButton appended");
  } catch (e) {
    warn("VRButton failed (non-fatal): " + (e?.message || e));
  }
}

// --------------------
// Clipboard helpers
// --------------------
async function copyLogToClipboard() {
  const text = overlay?.innerText || "";
  if (!text.trim()) {
    warn("Nothing to copy");
    return { ok: false, reason: "empty" };
  }
  try {
    await navigator.clipboard.writeText(text);
    ok("Copied log to clipboard");
    return { ok: true };
  } catch (e) {
    // Fallback: select the log so user can manually copy
    try {
      const range = document.createRange();
      range.selectNodeContents(overlay);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      warn("Clipboard blocked — selected text (use Copy)");
      return { ok: false, reason: "clipboard-blocked" };
    } catch (e2) {
      bad("Copy failed");
      return { ok: false, reason: "copy-failed" };
    }
  }
}

// --------------------
// Global controls for UI buttons
// --------------------
function installGlobalScarlettAPI(ctx) {
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

  // Prefer world.js safe spawn if present; fallback to hard lobby
  window.SCARLETT.respawnSafe = () => {
    try {
      // If HybridWorld exposes respawnSafe in your build later, call it.
      if (typeof HybridWorld?.respawnSafe === "function") {
        HybridWorld.respawnSafe();
        ok("respawnSafe() via HybridWorld");
        return;
      }
    } catch (e) {}

    try {
      player.position.set(0, 0, 26);
      camera.position.set(0, 1.65, 0);
      ok("respawnSafe() fallback to lobby");
    } catch (e) {
      bad("respawnSafe() failed: " + (e?.message || e));
    }
  };

  window.SCARLETT.setSafeMode = async (v = true) => {
    try {
      ok(`SAFE MODE requested: ${!!v}`);
      // If your HybridWorld reads OPTS.safeMode, rebuild with it:
      await window.SCARLETT.rebuild({ safeMode: !!v });
    } catch (e) {
      bad("setSafeMode failed: " + (e?.message || e));
    }
  };

  window.SCARLETT.rebuild = async (opts = {}) => {
    try {
      ok("Rebuild requested…");
      await HybridWorld.build({
        THREE,
        renderer,
        camera,
        player,
        controllers: ctx.controllers,
        log: (m) => logLine(String(m)),
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
      console.error(e);
    }
  };
}

// --------------------
// Boot sequence
// --------------------
async function boot() {
  lockTouchGestures();
  overlay && (overlay.innerHTML = "");
  bootHeader();

  const renderer = createRenderer();
  const { player, camera } = makeRig();
  const controllers = makeXRHands(renderer);

  attachVRButton(renderer);

  // Keep camera aspect in sync
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  const ctx = { renderer, player, camera, controllers };
  installGlobalScarlettAPI(ctx);

  // Build world
  try {
    await HybridWorld.build({
      THREE,
      renderer,
      camera,
      player,
      controllers,
      log: (m) => logLine(String(m)),
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
    console.error(e);
  }

  // Animation loop
  renderer.setAnimationLoop(() => {
    try {
      HybridWorld.frame({ renderer, camera });
    } catch (e) {
      bad("frame crash: " + (e?.message || e));
      console.error(e);
      renderer.setAnimationLoop(null);
    }
  });

  ok("Animation loop running");
}

// Go
boot().catch((e) => {
  bad("BOOT fatal: " + (e?.message || e));
  console.error(e);
});

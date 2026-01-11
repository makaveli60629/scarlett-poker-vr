// /js/index.js — Scarlett VR Poker Boot v1.0 (FULL, Quest + Android safe)
// Loads Three.js as a module (never "THREE undefined") and boots HybridWorld.

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

// Your world (you created this)
import { HybridWorld } from "./world.js";

const BUILD_STAMP = Date.now();
const overlay = document.getElementById("overlay");

function logLine(msg, cls="muted") {
  const div = document.createElement("div");
  div.className = "row " + cls;
  div.textContent = msg;
  overlay?.appendChild(div);
  if (overlay) overlay.scrollTop = overlay.scrollHeight;
  console.log(msg);
}

function ok(msg){ logLine("✅ " + msg, "ok"); }
function warn(msg){ logLine("⚠️ " + msg, "warn"); }
function bad(msg){ logLine("❌ " + msg, "bad"); }

function qs(s){ return document.querySelector(s); }

function showBootHeader() {
  logLine(`BUILD_STAMP: ${BUILD_STAMP}`);
  logLine(`HREF: ${location.href}`);
  logLine(`UA: ${navigator.userAgent}`);
  logLine(`NAVIGATOR_XR: ${!!navigator.xr}`);
  logLine(`THREE: ${THREE ? "module ok" : "missing"}`);
}

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
  });

  ok("Renderer created");
  return renderer;
}

function makeRig() {
  const player = new THREE.Group();
  player.name = "PlayerRig";

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);
  camera.position.set(0, 1.65, 0);
  camera.name = "MainCamera";
  player.add(camera);

  ok("PlayerRig + Camera created");
  return { player, camera };
}

function makeControllers(renderer) {
  // Hands-only on Quest is fine, but keep these placeholders so world.js can parent them
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  handLeft.name = "HandLeft";
  handRight.name = "HandRight";
  ok("XR Hands placeholders ready");
  return { handLeft, handRight };
}

async function boot() {
  overlay.innerHTML = "";
  showBootHeader();

  // Quick sanity check: index path correctness
  // (this prevents the old bug where it tried loading from https://makaveli60629.github.io/js/...)
  if (!location.pathname.includes("scarlett-poker-vr")) {
    warn("Path note: If files 404, confirm this is the /scarlett-poker-vr/ GitHub Pages URL.");
  }

  const renderer = createRenderer();
  const { player, camera } = makeRig();
  const controllers = makeControllers(renderer);

  // VRButton
  try {
    document.body.appendChild(VRButton.createButton(renderer));
    ok("VRButton appended");
  } catch (e) {
    warn("VRButton failed (non-fatal): " + (e?.message || e));
  }

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
        allowStream: false // default off for offline Android dev
      }
    });
    ok("HybridWorld.build ✅");
  } catch (e) {
    bad("HybridWorld.build FAILED: " + (e?.message || e));
    console.error(e);
  }

  // Render loop
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

boot().catch(e => bad("BOOT fatal: " + (e?.message || e)));

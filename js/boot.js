// /js/boot.js — Scarlett VR Poker Boot (FULL, Quest-safe, HybridWorld 1.0 compatible)
// ✅ Never blind: renders test scene until HybridWorld.build succeeds
// ✅ VRButton (Quest compatible)
// ✅ Hands support (renderer.xr.getHand)
// ✅ Calls HybridWorld.build(...) then HybridWorld.frame(...) each loop
// ✅ No HybridWorld.init anywhere

import * as THREE from "three";
window.THREE = THREE;

// ---------- overlay logger ----------
const overlay = document.getElementById("overlay");
const safeJson = (x) => { try { return JSON.stringify(x); } catch { return String(x); } };
function log(...a) {
  try {
    console.log(...a);
    if (!overlay) return;
    const s = a.map(v => (typeof v === "string" ? v : safeJson(v))).join(" ");
    overlay.textContent += (overlay.textContent ? "\n" : "") + s;
  } catch (e) {
    console.log("[overlay-log-failed]", e);
  }
}

// global error taps
window.addEventListener("error", (e) => log("❌ window.error:", e?.message || String(e)));
window.addEventListener("unhandledrejection", (e) => {
  const r = e?.reason;
  log("❌ unhandledrejection:", r?.message || String(r || e));
});

// ---------- boot header ----------
const BOOT_SIG = "BOOT.JS ✅ " + Date.now() + " r" + Math.random().toString(16).slice(2);
log("boot…");
log(BOOT_SIG);
log("href=" + location.href);
log("THREE=" + THREE.REVISION);
log("ua=" + navigator.userAgent);
log("navigator.xr=" + (!!navigator.xr));

// URLs relative to this file
const here = (rel) => new URL(rel, import.meta.url).toString();

// ---------- renderer ----------
const app = document.getElementById("app") || document.body;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);
log("renderer created ✅");

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- camera + player rig ----------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 500);
camera.position.set(0, 1.6, 2);

// Player group holds camera + hands
const player = new THREE.Group();
player.name = "PlayerRig";
player.add(camera);

// ---------- TEST SCENE (until world loads) ----------
const testScene = new THREE.Scene();
testScene.background = new THREE.Color(0x101020);

const testRoot = new THREE.Group();
testScene.add(testRoot);

testRoot.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 2);
testRoot.add(dir);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
testRoot.add(floor);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff2d7a })
);
cube.position.set(0, 1.5, -2);
testRoot.add(cube);

testScene.add(player);

// ---------- VRButton ----------
(async () => {
  try {
    const { VRButton } = await import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js");
    document.body.appendChild(VRButton.createButton(renderer));
    log("VRButton added ✅");
  } catch (e) {
    log("❌ VRButton failed:", e?.message || String(e));
  }
})();

// ---------- safe import ----------
async function safeImport(rel) {
  const url = here(rel);
  try {
    const mod = await import(url);
    log("import ok:", rel);
    return mod;
  } catch (e) {
    log("❌ import failed:", rel);
    log(String(e?.stack || e));
    throw e;
  }
}

// ---------- controllers / hands ----------
function makeControllers() {
  // Hands (Quest hand tracking). These are Object3Ds updated by WebXR.
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  handLeft.name = "handLeft";
  handRight.name = "handRight";

  // Attach hands to player so your world can parent them safely if desired
  player.add(handLeft);
  player.add(handRight);

  // Your world expects controllers.handLeft / controllers.handRight (see VRPanel code)
  return {
    left: null,
    right: null,
    hands: [handLeft, handRight],
    handLeft,
    handRight
  };
}

const controllers = makeControllers();

// ---------- HybridWorld boot ----------
let HW = null;
let worldActive = false;

(async () => {
  try {
    const worldMod = await safeImport("./world.js");
    log("world module keys:", Object.keys(worldMod));

    HW = worldMod?.HybridWorld ?? worldMod?.default ?? null;
    if (!HW) {
      log("❌ No HybridWorld export found");
      return;
    }

    log("HybridWorld typeof:", typeof HW);
    log("HybridWorld keys:", (typeof HW === "object" ? Object.keys(HW) : "(not object)"));

    if (typeof HW !== "object" || typeof HW.build !== "function" || typeof HW.frame !== "function") {
      log("❌ HybridWorld is not the expected object with build() + frame()");
      return;
    }

    log("▶ HybridWorld.build START");

    await HW.build({
      THREE,
      renderer,
      camera,
      player,
      controllers,
      log,
      OPTS: {
        autobuild: true,
        nonvrControls: true,
        allowTeleport: true,
        allowBots: true,
        allowPoker: true,
        allowStream: true,
        safeMode: false
      }
    });

    worldActive = true;
    log("✅ HybridWorld.build DONE");
    log("🌍 HybridWorld ACTIVE ✅");

  } catch (e) {
    log("❌ HybridWorld.build FAILED:");
    log(e?.message || String(e));
    log(e?.stack || "");
    worldActive = false;
  }
})();

// ---------- main loop ----------
renderer.setAnimationLoop(() => {
  if (worldActive && HW) {
    // IMPORTANT: Your HybridWorld.frame does the renderer.render internally
    HW.frame({ renderer, camera });
    return;
  }

  // fallback test render
  cube.rotation.y += 0.01;
  cube.rotation.x += 0.004;
  renderer.render(testScene, camera);
});
log("render loop running ✅ (test mode until world builds)");

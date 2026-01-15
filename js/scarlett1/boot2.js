// /js/boot2.js — Scarlett BOOT2 v2.3 (FULL) — World + XR Hands + Controls Tick
// ✅ Imports THREE + VRButton + XRHandModelFactory
// ✅ Imports world.js and requires world.initWorld()
// ✅ Imports /js/core/controls.js and REQUIRES it to be initialized + ticked each frame
// ✅ Imports spine_android.js (optional; can stay as-is)
// ✅ setAnimationLoop renders and calls CONTROLS.update(dt) + WORLD.update(dt)
//
// IMPORTANT:
// - Your index.html should include this boot via <script type="module" src="./js/boot2.js"></script>
// - Paths assume GitHub Pages base: /scarlett-poker-vr/

const BUILD = "BOOT2_v2_3_FULL";

const log = (...a) => console.log("[boot2]", ...a);
const err = (...a) => console.error("[boot2]", ...a);

function diagStart() {
  const href = location.href;
  const path = location.pathname;
  const base = `/${path.split("/").filter(Boolean)[0] || ""}/`.replace("//", "/");
  log("diag start ✅");
  log("build=", BUILD);
  log("href=" + href);
  log("path=" + path);
  log("base=" + base);
  log("secureContext=" + String(window.isSecureContext));
  log("ua=" + navigator.userAgent);
  log("navigator.xr=" + String(!!navigator.xr));
  return { href, path, base };
}

function makeCanvasHost() {
  let host = document.getElementById("app");
  if (!host) {
    host = document.createElement("div");
    host.id = "app";
    host.style.position = "fixed";
    host.style.left = "0";
    host.style.top = "0";
    host.style.width = "100%";
    host.style.height = "100%";
    host.style.margin = "0";
    host.style.padding = "0";
    host.style.overflow = "hidden";
    document.body.appendChild(host);
  }
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  return host;
}

async function safeImport(url, label) {
  log("import", url);
  try {
    const mod = await import(url);
    log("ok ✅", label || url);
    return mod;
  } catch (e) {
    err("import FAILED ❌", label || url, e);
    throw e;
  }
}

function createRenderer(THREE, host) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  host.appendChild(renderer.domElement);
  return renderer;
}

function createScene(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  return scene;
}

function createCamera(THREE) {
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 10);
  return camera;
}

function createPlayerRig(THREE, camera) {
  const rig = new THREE.Group();
  rig.name = "PlayerRig";
  rig.position.set(0, 0, 10);
  rig.add(camera);
  return rig;
}

function wireResize(renderer, camera) {
  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}

async function attachXRHands({ THREE, renderer, scene, XRHandModelFactory, log }) {
  // If you already handle hands elsewhere, this won’t hurt.
  try {
    const factory = new XRHandModelFactory();

    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      scene.add(hand);

      const model = factory.createHandModel(hand, "mesh");
      hand.add(model);
    }

    log("XR hand models attached ✅");
  } catch (e) {
    console.warn("[boot2] XR hand attach skipped:", e);
  }
}

(async function main() {
  const { base } = diagStart();
  const host = makeCanvasHost();

  // 1) Core imports (CDN)
  const THREE = await safeImport(`https://unpkg.com/three@0.158.0/build/three.module.js?v=${Date.now()}`, "three");
  log("three import ✅", "r158");

  const VRButtonMod = await safeImport(`https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js?v=${Date.now()}`, "VRButton");
  const { VRButton } = VRButtonMod;
  log("VRButton ready ✅");

  const XRHandMod = await safeImport(`https://unpkg.com/three@0.158.0/examples/jsm/webxr/XRHandModelFactory.js?v=${Date.now()}`, "XRHandModelFactory");
  const { XRHandModelFactory } = XRHandMod;
  log("XR hand model factory ready ✅");

  // 2) Create renderer/scene/camera/rig
  const renderer = createRenderer(THREE, host);
  const scene = createScene(THREE);
  const camera = createCamera(THREE);
  const playerRig = createPlayerRig(THREE, camera);
  scene.add(playerRig);
  wireResize(renderer, camera);

  // 3) Add VR button
  try {
    document.body.appendChild(VRButton.createButton(renderer));
  } catch (e) {
    err("VRButton append failed ❌", e);
  }

  // 4) Import world and init
  //    BOOT2 expects world.js exports initWorld()
  let WORLD = null;
  try {
    const worldUrl = `${base}js/scarlett1/world.js?v=${Date.now()}`;
    log("world url=" + worldUrl);

    const worldMod = await safeImport(worldUrl, "world.js");

    if (!worldMod.initWorld && !worldMod.default?.initWorld) {
      throw new Error("world.js missing export initWorld()");
    }

    const initWorld = worldMod.initWorld || worldMod.default.initWorld;

    log("importing world…");
    WORLD = await initWorld({
      THREE,
      scene,
      renderer,
      camera,
      playerRig,
      log: (...a) => console.log("[world]", ...a),
      quality: "quest"
    });

    log("initWorld() completed ✅");
    log("teleport surfaces=", WORLD?.teleportSurfaces?.length || 0);
  } catch (e) {
    err("BOOT ERROR:", e?.message || e);
    throw e;
  }

  // 5) Attach XR hand models (visual)
  await attachXRHands({ THREE, renderer, scene, XRHandModelFactory, log });

  // 6) Import & INIT controls (CRITICAL)
  let CONTROLS = null;
  try {
    const controlsUrl = `${base}js/core/controls.js?v=${Date.now()}`;
    const controlsMod = await safeImport(controlsUrl, "controls");

    const initFn =
      controlsMod.initControls ||
      controlsMod.init ||
      controlsMod.install ||
      controlsMod.default?.initControls ||
      controlsMod.default?.init ||
      null;

    if (!initFn) throw new Error("controls.js has no init function export");

    CONTROLS = await initFn({
      THREE,
      renderer,
      scene,
      camera,
      playerRig,
      world: WORLD,
      log: (...a) => console.log("[controls]", ...a),
      options: {
        // you can tune these later
        moveSpeed: 2.4,
        lookSpeed: 2.0,
        xrSnapDeg: 30
      }
    });

    log("controls init ✅", "hasUpdate=" + String(!!CONTROLS?.update));
  } catch (e) {
    err("controls init FAILED ❌", e);
  }

  // 7) Optional: Android spine (keep, but controls.js already builds sticks too)
  try {
    const androidUrl = `${base}js/scarlett1/spine_android.js?v=${Date.now()}`;
    await safeImport(androidUrl, "spine_android");
  } catch (e) {
    // non-fatal
  }

  // 8) Render loop (CRITICAL: ticks controls/world)
  let lastT = performance.now();
  log("render loop start ✅");

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (CONTROLS?.update) CONTROLS.update(dt);
    if (WORLD?.update) WORLD.update(dt);

    renderer.render(scene, camera);
  });
})();

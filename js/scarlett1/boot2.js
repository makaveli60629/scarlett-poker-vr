// /js/scarlett1/boot2.js — Scarlett Boot (MODULE) FULL v1.1
// ✅ Loads THREE (CDN)
// ✅ Loads world.js and calls initWorld()
// ✅ Loads spine_android.js for mobile sticks (safe)
// ✅ Never gets stuck at "Booting…"

const diagLog = window.__SCARLETT_DIAG_LOG || ((...a) => console.log("[boot2]", ...a));
const diagStatus = window.__SCARLETT_DIAG_STATUS || ((s) => console.log("[status]", s));

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
}

function log(...a) { diagLog(stamp(), ...a); }

async function imp(url) {
  log("import", url);
  const m = await import(url);
  log("ok ✅", url);
  return m;
}

(async function main() {
  try {
    diagStatus("Booting…");
    log("boot executed ✅");

    // THREE
    const threeURL = `https://unpkg.com/three@0.158.0/build/three.module.js?v=${Date.now()}`;
    const THREE = await imp(threeURL);
    window.THREE = THREE;
    log("three import ✅ r158");

    // WORLD
    const worldURL = `./world.js?v=${Date.now()}`;
    log("world url=", worldURL);
    const worldMod = await imp(worldURL);

    if (!worldMod || typeof worldMod.initWorld !== "function") {
      throw new Error("world.js missing export initWorld()");
    }

    // Create scene/camera/renderer here (world will reuse them)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 250);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    if (!document.querySelector("canvas")) document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Rig created here so ALL modules share same rig
    const rig = new THREE.Group();
    rig.name = "PlayerRig";
    scene.add(rig);
    rig.add(camera);

    // Init world
    const worldCtx = { THREE, scene, camera, renderer, rig, diagLog, diagStatus, spawnIndex: 0 };
    const worldHandles = await worldMod.initWorld(worldCtx);
    // If world created its own scene/camera/renderer, prefer returned
    const finalScene = worldHandles?.scene || scene;
    const finalCamera = worldHandles?.camera || camera;
    const finalRenderer = worldHandles?.renderer || renderer;
    const finalRig = worldHandles?.rig || rig;

    // Ensure renderer loop exists if world didn't set one
    if (finalRenderer.xr && finalRenderer.setAnimationLoop) {
      // if already set by world, this is harmless (it will override to same behavior)
      finalRenderer.setAnimationLoop(() => finalRenderer.render(finalScene, finalCamera));
    }

    // ANDROID STICKS
    try {
      const androidMod = await imp(`./spine_android.js?v=${Date.now()}`);
      if (androidMod?.initAndroid) {
        androidMod.initAndroid({ renderer: finalRenderer, camera: finalCamera, rig: finalRig, diagLog });
      } else {
        log("spine_android loaded but no initAndroid()");
      }
    } catch (e) {
      log("android sticks load failed (skipping):", e?.message || e);
    }

    diagStatus("World running ✅");
    log("done ✅");
  } catch (e) {
    diagStatus("BOOT FAILED ❌");
    log("BOOT ERROR:", e?.message || e);
    throw e;
  }
})();

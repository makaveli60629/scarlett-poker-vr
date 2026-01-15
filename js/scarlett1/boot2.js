// /js/scarlett1/boot2.js — Scarlett Boot (MODULE) v2.0 FULL
// Goals:
// - Never "Booting..." forever with no logs
// - Load THREE via CDN
// - Load world.js (relative to this file)
// - Load /modules.json via spine_modules.js
// - Keep Quest working; Android controls work only when NOT in XR session

const DLOG = (s) => (window.__SCARLETT_DIAG_LOG__ ? window.__SCARLETT_DIAG_LOG__(String(s)) : console.log(s));
const DSTAT = (s) => (window.__SCARLETT_DIAG_STATUS__ ? window.__SCARLETT_DIAG_STATUS__(String(s)) : null);

function nowTag() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `[${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}]`;
}
const log = (...a) => DLOG(`${nowTag()} ${a.join(" ")}`);

DSTAT("Booting...");
log("[boot2] boot executed ✅");

(async () => {
  try {
    // Import THREE (CDN)
    const threeUrl = "https://unpkg.com/three@0.158.0/build/three.module.js";
    log(`[boot2] import ${threeUrl}`);
    const THREE = await import(threeUrl);
    log(`[boot2] three import ✅ r${THREE.REVISION}`);

    // Import world module (same folder)
    const worldUrl = `./world.js?v=${Date.now()}`;
    log(`[boot2] world url= ${worldUrl}`);
    const worldMod = await import(worldUrl);

    // Run world
    if (typeof worldMod.initWorld !== "function") {
      throw new Error("world.js must export function initWorld()");
    }

    log("initWorld() start");
    const ctx = await worldMod.initWorld({
      THREE,
      log,
      diagLog: log,
      basePath: "/scarlett-poker-vr/"
    });

    // Normalize context
    const C = ctx || {};
    C.THREE = THREE;
    C.log = log;
    C.base = "/scarlett-poker-vr/";
    // addUpdate support
    if (!C._updates) C._updates = [];
    C.addUpdate = C.addUpdate || ((fn) => C._updates.push(fn));

    // If world provided a render loop hook, great. If not, we’ll create one.
    // We only create a loop if renderer+scene+camera exist and world didn't already.
    if (C.renderer && C.scene && C.camera && !C.__hasLoop) {
      const clock = new THREE.Clock();
      function loop() {
        const dt = Math.min(0.05, clock.getDelta());
        for (const fn of C._updates) {
          try { fn(dt); } catch (e) { log("[boot2] update err", e?.message || e); }
        }
        C.renderer.render(C.scene, C.camera);
        C.renderer.setAnimationLoop(loop);
      }
      C.__hasLoop = true;
      C.renderer.setAnimationLoop(loop);
      log("render loop start ✅");
    }

    // Load modules.json (spines/addons)
    try {
      const mods = await import(`./spine_modules.js?v=${Date.now()}`);
      if (typeof mods.initModules === "function") {
        await mods.initModules(C);
      } else {
        log("[boot2] spine_modules.js loaded, but no initModules() (skipping)");
      }
    } catch (e) {
      log("[boot2] spine_modules load failed (skipping):", e?.message || e);
    }

    DSTAT("World running ✅");
    log("[boot2] done ✅");
  } catch (e) {
    DSTAT("BOOT FAILED ❌");
    log(`BOOT ERROR: ${e?.message || e}`);
    console.error(e);
  }
})();

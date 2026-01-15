// /js/scarlett1/boot2.js
// Scarlett VR Poker — BOOT v2 (FINAL LOCKED)

window.__SCARLETT_BOOT_STARTED = false;
window.__SCARLETT_BOOT_DONE = false;

const log = (m) => window.__SCARLETT_DIAG_LOG?.(m) || console.log(m);
const status = (s) => window.__SCARLETT_DIAG_STATUS?.(s) || console.log("STATUS:", s);

(async () => {
  try {
    window.__SCARLETT_BOOT_STARTED = true;
    status("Booting…");
    log("boot executed ✅");

    // ---- THREE ----
    const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
    window.THREE = THREE;
    log("[boot2] three import ✅ r" + THREE.REVISION);

    // ---- WORLD ----
    const base = "/scarlett-poker-vr";
    const worldURL = `${base}/js/scarlett1/world.js?v=${Date.now()}`;
    log("[boot2] world url= " + worldURL);

    const worldMod = await import(worldURL);
    log("[boot2] world import ✅");

    if (typeof worldMod.initWorld !== "function") {
      throw new Error("world.js missing initWorld()");
    }

    const ctx = await worldMod.initWorld({ THREE });
    log("render loop start ✅");

    // ---- MODULES ----
    try {
      const mods = await import(`${base}/js/scarlett1/spine_modules.js?v=${Date.now()}`);
      if (mods.initModules) {
        await mods.initModules(ctx);
        log("[boot2] modules init ✅");
      } else {
        log("[boot2] spine_modules.js loaded (no initModules)");
      }
    } catch (e) {
      log("[boot2] modules skipped ⚠️ " + e.message);
    }

    // ---- DONE ----
    window.__SCARLETT_BOOT_DONE = true;
    status("World running ✅");
    log("[boot2] done ✅");

  } catch (err) {
    console.error(err);
    status("BOOT FAILED ❌");
    log("BOOT ERROR: " + err.message);
  }
})();

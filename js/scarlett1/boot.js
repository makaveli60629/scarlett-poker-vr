// /js/scarlett1/boot.js — Scarlett 1.0 SAFE BOOT (ANDROID + OCULUS)

// 🔒 CRITICAL: set this immediately, before ANYTHING else
window.__SCARLETT_BOOT_STARTED__ = true;

(function () {
  const safeLog = (m) => {
    try { window.__SCARLETT_DIAG_LOG__ && window.__SCARLETT_DIAG_LOG__(m); }
    catch {}
    console.log(m);
  };

  const safeStatus = (m) => {
    try { window.__SCARLETT_DIAG_STATUS__ && window.__SCARLETT_DIAG_STATUS__(m); }
    catch {}
    console.log("[STATUS]", m);
  };

  safeLog("boot start ✅");

  (async () => {
    try {
      safeStatus("Loading three.js…");

      const THREE = await import(
        "https://unpkg.com/three@0.158.0/build/three.module.js"
      );

      safeLog("three import ✅");

      safeStatus("Loading world.js…");

      const base = "/scarlett-poker-vr/";
      const worldUrl = `${base}js/scarlett1/world.js?v=${Date.now()}`;
      safeLog("world url= " + worldUrl);

      const worldMod = await import(worldUrl);

      if (!worldMod || typeof worldMod.initWorld !== "function") {
        throw new Error("initWorld() missing from world.js");
      }

      safeStatus("Starting world…");
      await worldMod.initWorld({ THREE, base, LOG: safeLog, STATUS: safeStatus });

      safeStatus("World running ✅");
    } catch (err) {
      safeStatus("BOOT FAILED ❌");
      safeLog("ERROR BOOT FAILED: " + err.message);
      console.error(err);
    }
  })();
})();

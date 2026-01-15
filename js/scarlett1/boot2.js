// /js/scarlett1/boot2.js — Scarlett BOOT v2.2 (Hard-safe)
// ✅ Always updates HUD status
// ✅ Logs every stage
// ✅ No top-level await
// ✅ Will not silently hang

(function () {
  const log = (msg) => {
    console.log(msg);
    if (window.__SCARLETT_DIAG_LOG) window.__SCARLETT_DIAG_LOG(msg);
  };
  const status = (s) => {
    if (window.__SCARLETT_DIAG_STATUS) window.__SCARLETT_DIAG_STATUS(s);
    console.log("[STATUS]", s);
  };

  status("Booting...");

  const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";

  log(`[boot2] import ${THREE_URL}`);

  import(THREE_URL)
    .then((THREE) => {
      log(`[boot2] three import ✅ r${THREE.REVISION}`);

      const worldUrl = `./world.js?v=${Date.now()}`;
      log(`[boot2] world url= ${worldUrl}`);

      return import(worldUrl).then((worldMod) => {
        if (!worldMod || typeof worldMod.initWorld !== "function") {
          throw new Error("world.js loaded but initWorld() missing");
        }

        log("initWorld() start");
        const world = worldMod.initWorld({ THREE });
        window.__SCARLETT_WORLD__ = world;
        return world;
      });
    })
    .then((world) => {
      // Load spine modules (optional)
      const modsUrl = `./spine_modules.js?v=${Date.now()}`;
      log(`[boot2] import ${modsUrl}`);

      return import(modsUrl)
        .then((m) => {
          if (m && typeof m.initModules === "function") {
            log("[boot2] initModules() start");
            return m.initModules(world).then(() => world);
          } else {
            log("[boot2] spine_modules.js loaded, but no initModules() (skipping)");
            return world;
          }
        })
        .catch((e) => {
          log("[boot2] spine_modules load failed (skipping): " + (e?.message || e));
          return world;
        });
    })
    .then(() => {
      status("World running ✅");
      log("[boot2] done ✅");
    })
    .catch((err) => {
      console.error(err);
      status("BOOT FAILED ❌");
      log("BOOT ERROR: " + (err?.message || err));
    });
})();

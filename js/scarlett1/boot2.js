// /js/scarlett1/boot2.js — Scarlett BOOT v2.1 (GitHub Pages SAFE)
// ✅ No top-level await
// ✅ Android + Oculus safe
// ✅ HUD exits Booting
// ✅ Guaranteed Pages deploy

(function () {
  const log = (...a) => {
    console.log("[boot2]", ...a);
    window.__SCARLETT_DIAG_LOG && window.__SCARLETT_DIAG_LOG(a.join(" "));
  };

  const status = (s) => {
    console.log("[STATUS]", s);
    window.__SCARLETT_DIAG_STATUS && window.__SCARLETT_DIAG_STATUS(s);
  };

  status("Booting...");

  import("https://unpkg.com/three@0.158.0/build/three.module.js")
    .then((THREE) => {
      log("three import ✅", THREE.REVISION);

      return import("./world.js").then((worldMod) => {
        if (!worldMod.initWorld) {
          throw new Error("world.js missing initWorld()");
        }

        const world = worldMod.initWorld({ THREE });
        window.__SCARLETT_WORLD__ = world;

        return world;
      });
    })
    .then((world) => {
      const ua = navigator.userAgent;
      const isAndroid =
        /Android/i.test(ua) && !/OculusBrowser/i.test(ua);

      if (isAndroid) {
        return import("./spine_android.js")
          .then((mod) => {
            if (mod.initAndroidControls) {
              mod.initAndroidControls(world);
              log("Android controls attached ✅");
            }
          })
          .catch((e) => log("Android controls skipped", e));
      }
    })
    .then(() => {
      status("World running ✅");
      log("boot complete ✅");
    })
    .catch((err) => {
      console.error(err);
      status("BOOT FAILED ❌");
      window.__SCARLETT_DIAG_LOG &&
        window.__SCARLETT_DIAG_LOG("BOOT ERROR: " + err.message);
    });
})();

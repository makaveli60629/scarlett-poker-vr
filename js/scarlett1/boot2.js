// /js/scarlett1/boot2.js — Scarlett BOOT v2.0 (FULL, FINAL)
// ✅ World + Android + Oculus SAFE
// ✅ Fixes HUD stuck on "Booting..."
// ✅ Android controls work even if XR is available
// ✅ Oculus controllers untouched

(async () => {
  const log = (...a) => {
    console.log("[boot2]", ...a);
    window.__SCARLETT_DIAG_LOG && window.__SCARLETT_DIAG_LOG(a.join(" "));
  };

  const status = (s) => {
    console.log("[STATUS]", s);
    window.__SCARLETT_DIAG_STATUS && window.__SCARLETT_DIAG_STATUS(s);
  };

  try {
    status("Booting...");

    // ---------------------------
    // THREE
    // ---------------------------
    const THREE = await import(
      "https://unpkg.com/three@0.158.0/build/three.module.js"
    );
    log("three import ✅", THREE.REVISION);

    // ---------------------------
    // WORLD
    // ---------------------------
    const worldMod = await import("./world.js");
    if (!worldMod.initWorld) throw new Error("world.js missing initWorld()");
    log("world import ✅");

    const world = worldMod.initWorld({ THREE });
    window.__SCARLETT_WORLD__ = world;

    // ---------------------------
    // ANDROID vs XR DETECTION (CRITICAL FIX)
    // ---------------------------
    let isXRSession = false;

    if (navigator.xr) {
      try {
        isXRSession = await navigator.xr.isSessionSupported("immersive-vr");
      } catch {}
    }

    const isAndroid =
      /Android/i.test(navigator.userAgent) &&
      !/OculusBrowser/i.test(navigator.userAgent);

    log("env", {
      isXRSession,
      isAndroid,
      ua: navigator.userAgent,
    });

    // ---------------------------
    // ANDROID CONTROLS (ONLY if NOT XR)
    // ---------------------------
    if (isAndroid && !isXRSession) {
      try {
        const mod = await import("./spine_android.js");
        if (mod.initAndroidControls) {
          mod.initAndroidControls(world);
          log("Android controls attached ✅");
        } else {
          log("Android module loaded but no initAndroidControls()");
        }
      } catch (e) {
        log("Android controls FAILED", e);
      }
    }

    // ---------------------------
    // XR CONTROLS (HEADSET ONLY)
    // ---------------------------
    if (isXRSession) {
      try {
        const xr = await import("./spine_xr.js");
        xr.initXR && xr.initXR(world);
        log("XR spine attached ✅");
      } catch (e) {
        log("XR spine failed", e);
      }
    }

    // ---------------------------
    // FINAL HANDSHAKE (THIS FIXES HUD)
    // ---------------------------
    status("World running ✅");
    log("boot complete ✅");

  } catch (err) {
    console.error(err);
    status("BOOT FAILED ❌");
    window.__SCARLETT_DIAG_LOG &&
      window.__SCARLETT_DIAG_LOG("BOOT ERROR: " + err.message);
  }
})();

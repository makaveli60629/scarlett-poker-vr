// /js/scarlett1/boot.js — Scarlett 1.0 BOOT (FULL • PERMANENT)
// ✅ Sets permanent global "boot started" flags (fixes watchdog "path mismatch")
// ✅ Loads THREE (CDN) -> world.js -> spine_xr.js
// ✅ Never hard-crashes on missing optional modules; logs everything

(() => {
  // --- global flags used by older HUD watchdogs ---
  window.__SCARLETT_BOOT_EXPECT_BASE__ = "/scarlett-poker-vr/";
  window.__SCARLETT_BOOT_LOADED__ = Date.now();
  window.__SCARLETT_BOOT_STARTED__ = 0;
  window.__SCARLETT_BOOT_RUNNING__ = false;
  window.__SCARLETT_BOOT_FAILED__ = false;

  // --- tiny diagnostics helper (works even if HUD module is separate) ---
  const LOGS = [];
  const stamp = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `[${h}:${m}:${s}]`;
  };
  const safe = (x) => {
    try { return typeof x === "string" ? x : JSON.stringify(x); }
    catch { return String(x); }
  };

  function push(line) {
    LOGS.push(`${stamp()} ${line}`);
    console.log(line);
    if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__(`${stamp()} ${line}`);
  }
  function fail(err) {
    window.__SCARLETT_BOOT_FAILED__ = true;
    window.__SCARLETT_BOOT_RUNNING__ = false;
    push(`ERROR BOOT FAILED: ${err?.message || err}`);
    if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("BOOT FAILED ❌ (see log)");
  }

  async function run() {
    try {
      window.__SCARLETT_BOOT_STARTED__ = Date.now();
      window.__SCARLETT_BOOT_RUNNING__ = true;

      push(`href=${location.href}`);
      push(`path=${location.pathname}`);
      push(`base=${location.pathname.split("/").slice(0, 2).join("/") + "/"}`);
      push(`secureContext=${window.isSecureContext}`);
      push(`ua=${navigator.userAgent}`);
      push(`navigator.xr=${!!navigator.xr}`);

      if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("boot start ✅");

      // --- Load THREE from CDN ---
      if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("Loading three.js…");
      const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
      push("three import ✅ https://unpkg.com/three@0.158.0/build/three.module.js");

      // --- Load world ---
      const worldUrl = `/scarlett-poker-vr/js/scarlett1/world.js?v=${Date.now()}`;
      push(`world url= ${worldUrl}`);
      if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("Loading world.js…");

      const worldMod = await import(worldUrl);
      push("world import ✅");

      // Resolve init function robustly
      const initWorld =
        (typeof worldMod.initWorld === "function" && worldMod.initWorld) ||
        (typeof worldMod.default === "function" && worldMod.default) ||
        (worldMod.default && typeof worldMod.default.initWorld === "function" && worldMod.default.initWorld) ||
        (worldMod.World && typeof worldMod.World.init === "function" && worldMod.World.init) ||
        null;

      if (!initWorld) {
        push(`World exports = ${safe(Object.keys(worldMod))}`);
        if (worldMod.default) push(`World default keys = ${safe(Object.keys(worldMod.default))}`);
        throw new Error("world module has no initWorld/default/World.init");
      }

      if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("Starting world…");
      push("initWorld() start");
      await initWorld({ THREE });
      push("World running ✅");
      if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("World running ✅");

      // --- Load XR spine (controllers/lasers/teleport) ---
      const spineUrl = `/scarlett-poker-vr/js/scarlett1/spine_xr.js?v=${Date.now()}`;
      push(`spine url= ${spineUrl}`);
      if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("Loading XR spine…");

      const spineMod = await import(spineUrl);
      push("spine import ✅");

      if (typeof spineMod.installXR === "function") {
        await spineMod.installXR({ THREE });
        push("XR spine ready ✅");
        if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__("XR spine ready ✅ (Enter VR)");
      } else {
        push(`WARN spine_xr missing installXR. exports=${safe(Object.keys(spineMod))}`);
      }

      window.__SCARLETT_BOOT_RUNNING__ = false;
    } catch (e) {
      fail(e);
    }
  }

  // Make unhandled errors visible in HUD if present
  window.addEventListener("error", (e) => fail(e?.error || e?.message || e));
  window.addEventListener("unhandledrejection", (e) => fail(e?.reason || e));

  run();
})();

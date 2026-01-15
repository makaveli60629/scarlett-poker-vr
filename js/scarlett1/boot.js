// /js/scarlett1/boot.js — Scarlett 1.0 BOOT (PERMANENT • SAFE)
// - Sets __SCARLETT_BOOT_STARTED__ immediately (fixes "boot loaded but not started")
// - Imports THREE from CDN
// - Imports world.js and calls initWorld()
// - Never hard-crashes without reporting to Diagnostics HUD if present

(() => {
  // Mark started ASAP so diagnostics doesn't falsely say "not running"
  window.__SCARLETT_BOOT_STARTED__ = true;
  window.__SCARLETT_BOOT_URL__ = (typeof import !== "undefined" && import.meta && import.meta.url) ? import.meta.url : "unknown";

  const diagLog = (s) => {
    try { window.__SCARLETT_DIAG_LOG__ && window.__SCARLETT_DIAG_LOG__(String(s)); } catch {}
    try { console.log(s); } catch {}
  };

  const diagStatus = (s) => {
    try { window.__SCARLETT_DIAG_STATUS__ && window.__SCARLETT_DIAG_STATUS__(String(s)); } catch {}
  };

  const fail = (e, where = "BOOT") => {
    const msg = `[${where}] ${e?.stack || e?.message || e}`;
    diagLog(msg);
    diagStatus(`BOOT FAILED ❌ (${where})`);
    // Also expose last error for quick inspection
    window.__SCARLETT_LAST_ERROR__ = msg;
  };

  // Catch anything global (module errors included)
  window.addEventListener("error", (ev) => fail(ev.error || ev.message || ev, "WINDOW.ERROR"));
  window.addEventListener("unhandledrejection", (ev) => fail(ev.reason || ev, "PROMISE.REJECT"));

  (async () => {
    try {
      diagStatus("Loading three.js…");

      const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
      diagLog(`[boot] three import ✅ ${THREE?.REVISION ? `r${THREE.REVISION}` : ""}`);

      // Optional: VRButton (if present in /js/)
      let VRButton = null;
      try {
        const vb = await import("../VRButton.js");
        VRButton = vb.VRButton || vb.default || null;
        if (VRButton) diagLog("[boot] VRButton import ✅");
      } catch (e) {
        diagLog("[boot] VRButton not found (ok)");
      }

      // Load world
      diagStatus("Loading world.js…");
      const worldUrl = new URL("./world.js", import.meta.url).toString();
      diagLog(`[boot] world url= ${worldUrl}`);

      const worldMod = await import(worldUrl);
      diagLog("[boot] world import ✅");

      const initWorld =
        worldMod.initWorld ||
        worldMod.default ||
        worldMod.createWorld ||
        null;

      if (typeof initWorld !== "function") {
        throw new Error("world module missing initWorld() export");
      }

      diagStatus("Starting world…");
      diagLog("[boot] initWorld() start");

      const api = await initWorld({
        THREE,
        VRButton,
        diagLog,
        diagStatus,
        // container (optional) — default to body
        container: document.body
      });

      window.__SCARLETT_WORLD__ = api || null;

      diagStatus("World running ✅");
      diagLog("[boot] render loop start ✅");
    } catch (e) {
      fail(e, "BOOT");
    }
  })();
})();

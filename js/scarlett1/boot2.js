// /js/scarlett1/boot2.js — Scarlett Boot v2 (FULL • PERMANENT)
// - Marks __SCARLETT_BOOT_STARTED__ immediately
// - Imports THREE from CDN
// - Imports world.initWorld()
// - Loads optional modules from modules.json (xr + android + extras)
// - Forces safe spawn pad (not table)

window.__SCARLETT_BOOT_STARTED__ = true;

const diagLog = (s) => (window.__SCARLETT_DIAG_LOG__ ? window.__SCARLETT_DIAG_LOG__(s) : console.log(s));
const diagStatus = (s) => (window.__SCARLETT_DIAG_STATUS__ ? window.__SCARLETT_DIAG_STATUS__(s) : null);

const BASE = "/scarlett-poker-vr/";

function abs(path) {
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return BASE + path;
}

async function safeImport(url) {
  const u = url.includes("?") ? url : `${url}?v=${Date.now()}`;
  diagLog(`[boot2] import ${u}`);
  const mod = await import(u);
  diagLog(`[boot2] ok ✅ ${u}`);
  return mod;
}

(async () => {
  try {
    diagLog("boot executed ✅");
    diagStatus("Loading three.js…");

    const THREE = await safeImport("https://unpkg.com/three@0.158.0/build/three.module.js");
    diagLog(`[boot2] three import ✅ ${THREE?.REVISION ? "r"+THREE.REVISION : ""}`);

    diagStatus("Loading world.js…");
    const worldUrl = `${BASE}js/scarlett1/world.js?v=${Date.now()}`;
    diagLog(`[boot2] world url= ${worldUrl}`);
    const worldMod = await import(worldUrl);
    diagLog("[boot2] world import ✅");

    if (!worldMod || typeof worldMod.initWorld !== "function") {
      throw new Error("world.js must export initWorld()");
    }

    diagStatus("Starting world…");
    const app = await worldMod.initWorld({ THREE, base: BASE, log: diagLog });

    // Load modules.json + optional modules (xr, android, extras)
    diagStatus("Loading modules.json…");
    let cfg = null;
    try {
      const res = await fetch(`${BASE}modules.json?v=${Date.now()}`, { cache: "no-store" });
      cfg = await res.json();
      diagLog("[boot2] modules.json ✅");
    } catch (e) {
      diagLog("[boot2] modules.json missing (ok) — continuing");
    }

    if (cfg?.modules?.length) {
      diagStatus("Loading modules…");
      for (const m of cfg.modules) {
        try {
          const mod = await safeImport(m);
          // If a module exports init(), call it with app context
          if (typeof mod.init === "function") {
            await mod.init({ ...app, THREE, base: BASE, log: diagLog });
          }
        } catch (e) {
          diagLog(`[boot2] module failed ❌ ${m}: ${e?.message || e}`);
        }
      }
    }

    // Force a safe spawn if world provided pads
    if (app?.playerRig && Array.isArray(app.spawnPads) && app.spawnPads.length) {
      const pad = app.spawnPads[0]; // first pad is always "safe"
      app.playerRig.position.set(pad.x, pad.y, pad.z);
      if (app.playerRig.rotation) app.playerRig.rotation.y = pad.ry || 0;
      diagLog("[boot2] spawn pad applied ✅");
    }

    diagStatus("World running ✅");
    diagLog("[boot2] done ✅");
  } catch (e) {
    diagLog(`ERROR BOOT FAILED: ${e?.message || e}`);
    diagStatus("BOOT FAILED ❌ (see log)");
    throw e;
  }
})();

// /js/scarlett1/boot.js — Scarlett 1.0 Boot (FULL • PERMANENT)
// ✅ Always sets __SCARLETT_BOOT_STARTED__ immediately
// ✅ Loads Three.js via CDN (no bare "three" import)
// ✅ Loads world.js and calls initWorld()
// ✅ Separates Android debug controls from XR controls (no interference)

window.__SCARLETT_BOOT_STARTED__ = true;

const LOG = (msg) => {
  try {
    if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__(msg);
  } catch {}
  console.log(msg);
};

const STATUS = (msg) => {
  try {
    if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__(msg);
  } catch {}
  console.log("[STATUS]", msg);
};

(async () => {
  try {
    LOG("boot start ✅");

    // --- Load THREE from CDN ---
    STATUS("Loading three.js…");
    const THREE_URL = "https://unpkg.com/three@0.158.0/build/three.module.js";
    const THREE = await import(THREE_URL);
    LOG("three import ✅ " + THREE_URL);

    // --- Load world.js ---
    STATUS("Loading world.js…");
    const base = "/scarlett-poker-vr/";
    const worldUrl = `${base}js/scarlett1/world.js?v=${Date.now()}`;
    LOG("world url= " + worldUrl);

    const worldMod = await import(worldUrl);
    LOG("world import ✅");

    // Make sure initWorld exists
    if (!worldMod || typeof worldMod.initWorld !== "function") {
      throw new Error("worldMod.initWorld is not a function");
    }

    // --- Start world ---
    STATUS("Starting world…");
    LOG("initWorld() start");

    // initWorld contract:
    // initWorld({ THREE, LOG, STATUS, base })
    await worldMod.initWorld({ THREE, LOG, STATUS, base });

    STATUS("World running ✅");
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    STATUS("BOOT FAILED ❌");
    LOG("ERROR BOOT FAILED: " + msg);
    console.error(e);
  }
})();

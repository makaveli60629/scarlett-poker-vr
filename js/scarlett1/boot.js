// /js/scarlett1/boot.js — Scarlett 1.0 SAFE BOOT (PERMANENT)
// Must be loaded as <script type="module" src=".../boot.js">

// IMPORTANT: Set immediately so Diagnostics never shows "not started"
window.__SCARLETT_BOOT_STARTED__ = true;

const LOG = (m) => {
  try { window.__SCARLETT_DIAG_LOG__ && window.__SCARLETT_DIAG_LOG__(String(m)); } catch {}
  try { console.log(m); } catch {}
};

const STATUS = (m) => {
  try { window.__SCARLETT_DIAG_STATUS__ && window.__SCARLETT_DIAG_STATUS__(String(m)); } catch {}
};

const FAIL = (e) => {
  const msg = e?.stack || e?.message || String(e);
  STATUS("BOOT FAILED ❌");
  LOG("ERROR BOOT FAILED: " + msg);
  window.__SCARLETT_LAST_ERROR__ = msg;
};

// Catch anything that would otherwise silently break module execution
window.addEventListener("error", (ev) => FAIL(ev.error || ev.message || ev));
window.addEventListener("unhandledrejection", (ev) => FAIL(ev.reason || ev));

(async () => {
  try {
    LOG("boot start ✅");
    STATUS("Loading three.js…");

    const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
    LOG("three import ✅ https://unpkg.com/three@0.158.0/build/three.module.js");

    STATUS("Loading world.js…");
    const worldUrl = new URL("./world.js", import.meta.url).toString();
    LOG("world url= " + worldUrl);

    const worldMod = await import(worldUrl);
    LOG("world import ✅");

    const initWorld =
      worldMod.initWorld ||
      worldMod.default ||
      worldMod.createWorld ||
      null;

    if (typeof initWorld !== "function") {
      throw new Error("world module missing initWorld() export");
    }

    STATUS("Starting world…");
    LOG("initWorld() start");

    await initWorld({ THREE, LOG, STATUS });

    STATUS("World running ✅");
    LOG("render loop start ✅");
  } catch (e) {
    FAIL(e);
  }
})();

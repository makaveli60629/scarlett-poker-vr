// js/scarlett1/boot2.js
// Scarlett VR Poker — SAFE BOOT v2 (FULL • PERMANENT)

console.log("[boot2] executing…");

// signal to diagnostics that boot REALLY executed
window.__SCARLETT_BOOT_STARTED__ = true;

function dlog(s) {
  try {
    console.log(s);
    if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__(s);
  } catch {}
}
function dstatus(s) {
  try {
    if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__(s);
  } catch {}
}

function getBase() {
  const p = location.pathname || "/";
  const seg = p.split("/").filter(Boolean);
  if (seg.length > 0) return `/${seg[0]}/`;
  return "/";
}

(async () => {
  try {
    dstatus("boot2 running…");

    const base = getBase();

    // THREE via CDN if missing
    if (!window.THREE) {
      dstatus("Loading three.js…");
      const threeUrl = "https://unpkg.com/three@0.158.0/build/three.module.js";
      const THREE = await import(threeUrl);
      window.THREE = THREE;
      dlog(`[boot2] three import ✅ ${threeUrl}`);
    } else {
      dlog("[boot2] THREE already present ✅");
    }

    // Load world
    dstatus("Loading world.js…");
    const worldUrl = `${base}js/scarlett1/world.js?v=${Date.now()}`;
    dlog(`[boot2] world url= ${worldUrl}`);

    const worldMod = await import(worldUrl);
    dlog("[boot2] world import ✅");

    if (!worldMod || typeof worldMod.initWorld !== "function") {
      throw new Error("world.js missing export function initWorld()");
    }

    dstatus("Starting world…");
    await worldMod.initWorld({
      THREE: window.THREE,
      base,
      log: dlog,
      status: dstatus
    });

    dstatus("World running ✅");
    dlog("[boot2] done ✅");

  } catch (err) {
    dstatus("BOOT FAILED ❌ (see logs)");
    dlog(`[boot2] ERROR: ${err?.message || err}`);
    console.error(err);
  }
})();

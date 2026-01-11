// /js/index.js — Scarlett Boot Loader (PATH-SAFE)

import * as THREE from "three";

// Make diagnostics happy if you expect a global:
window.THREE = THREE;

const overlay = document.getElementById("overlay");
const log = (...a) => {
  console.log(...a);
  if (overlay) overlay.textContent += "\n" + a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
};

log("BOOT index.js ✅");
log("href=" + location.href);
log("THREE version=" + THREE.REVISION);

// Helper: always build URLs relative to THIS file (/js/index.js)
const here = (p) => new URL(p, import.meta.url).toString();

async function safeImport(rel) {
  const url = here(rel);
  try {
    const mod = await import(url);
    log("import ok:", rel);
    return mod;
  } catch (e) {
    log("❌ import failed:", rel);
    log(String(e?.stack || e));
    throw e;
  }
}

(async () => {
  // Import your world from the SAME /js folder
  // IMPORTANT: this expects world.js to be at /js/world.js exactly.
  const worldMod = await safeImport("./world.js");

  // If your project uses a different entry (main.js), switch to:
  // const mainMod = await safeImport("./main.js");

  // If you expect worldMod.World.init(...) etc, you can just log here for now:
  log("world module keys:", Object.keys(worldMod));

  // OPTIONAL: if your world expects to be started from here, do it.
  // But since you said "don't touch world", we stop at confirming it loads.
  log("✅ Loader finished. If you still see black, the next error will be shown here.");
})().catch((e) => {
  log("FATAL:", String(e?.message || e));
});

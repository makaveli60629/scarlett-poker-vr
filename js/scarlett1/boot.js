// /js/scarlett1/boot.js — Scarlett1 Boot v2 (loads world + installs XR safely)

(async () => {
  const now = Date.now();

  const DIAG = (msg, obj) => {
    try {
      console.log(msg, obj ?? "");
    } catch {}
  };

  function setStatus(t) {
    const el = document.getElementById("status");
    if (el) el.textContent = t;
    console.log("STATUS:", t);
  }

  console.log("boot start ✅");
  setStatus("boot.js running…");

  // Load three from CDN
  setStatus("Loading three.js…");
  const THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
  console.log("three import ✅", "https://unpkg.com/three@0.158.0/build/three.module.js");

  // Load world
  setStatus("Loading world.js…");
  const worldUrl = `/scarlett-poker-vr/js/scarlett1/world.js?v=${now}`;
  console.log("world url=", worldUrl);

  const worldMod = await import(worldUrl);
  console.log("world import ✅");

  setStatus("Starting world…");
  await worldMod.initWorld({ THREE, DIAG: console });
  setStatus("World running ✅");

  // Install XR
  try {
    const xrUrl = `/scarlett-poker-vr/js/scarlett1/spine_xr.js?v=${Date.now()}`;
    const xrMod = await import(xrUrl);
    await xrMod.installXR({ THREE, DIAG: console });
  } catch (e) {
    console.error("[boot] XR install failed", e);
  }
})();

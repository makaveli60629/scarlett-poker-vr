// ---------------- start HybridWorld (FUNCTION EXPORT) ----------------
(async () => {
  try {
    const worldMod = await safeImport("./world.js");
    log("world module keys:", Object.keys(worldMod));

    const HybridWorld = worldMod.HybridWorld;
    if (typeof HybridWorld !== "function") {
      log("❌ HybridWorld is not a function");
      return;
    }

    const BUILD = {
      stamp: Date.now(),
      mode: "hybrid",
      platform: navigator.userAgent,
    };

    const player = new THREE.Group();
    player.add(camera);
    scene.add(player);

    const controllers = { left: null, right: null, hands: [] };

    log("▶ Calling HybridWorld(ctx)");

    const res = HybridWorld({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log,
      BUILD,
    });

    if (res instanceof Promise) await res;

    log("🌍 HybridWorld ACTIVE");

    // remove cube test
    scene.remove(testRoot);
    testRoot.clear();

  } catch (e) {
    log("❌ HybridWorld failed:");
    log(e?.message || String(e));
    log(e?.stack || "");
  }
})();

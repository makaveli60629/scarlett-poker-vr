// js/boot.js
(function () {
  const BUILD = "SCARLETT_FULL_1_6_BOOTSAFE";
  const t0 = performance.now();

  // --- tiny diag helper (safe if diag not present yet) ---
  const D = (window.SCARLETT_DIAG = window.SCARLETT_DIAG || {});
  D.log =
    D.log ||
    function (s) {
      try {
        const box = document.getElementById("diagPanel");
        if (!box) return;
        box.textContent += s + "\n";
      } catch (e) {}
    };

  function now() {
    return ((performance.now() - t0) / 1000).toFixed(3);
  }
  function log(s) {
    D.log(`[${now()}] ${s}`);
  }

  log(`booting… BUILD=${BUILD}`);

  // Wait for A-Frame scene ready
  const scene = document.getElementById("scene");
  if (!scene) {
    log("[boot] ERROR: #scene missing");
    return;
  }

  function tryBuildWorld() {
    if (!window.SCARLETT_WORLD || typeof window.SCARLETT_WORLD.build !== "function") {
      return false;
    }
    try {
      window.SCARLETT_WORLD.build();
      return true;
    } catch (e) {
      log("[world] build threw: " + (e && e.message ? e.message : e));
      return false;
    }
  }

  function startAfterLoaded() {
    // Retry loop: Quest/Android sometimes load scripts slightly later
    let tries = 0;
    const maxTries = 80; // ~4 seconds at 50ms
    const iv = setInterval(() => {
      tries++;

      const ok = tryBuildWorld();
      if (ok) {
        log("[world] buildWorld() ✅");
        clearInterval(iv);
        return;
      }

      if (tries === 1) log("[world] waiting for SCARLETT_WORLD.build…");
      if (tries >= maxTries) {
        log("[world] ERROR: SCARLETT_WORLD.build missing (timeout)");
        clearInterval(iv);
      }
    }, 50);
  }

  if (scene.hasLoaded) {
    log("[scene] already loaded ✅");
    startAfterLoaded();
  } else {
    scene.addEventListener("loaded", () => {
      log("[scene] loaded ✅");
      startAfterLoaded();
    });
  }
})();

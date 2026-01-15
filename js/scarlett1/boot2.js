// /js/scarlett1/boot2.js — Scarlett 1.0 Boot (MODULE SAFE • PERMANENT)
// ✅ Loads THREE (CDN)
// ✅ Loads world.js and calls initWorld()
// ✅ Loads spine_modules.js which loads modules.json safely (objects supported)
// ✅ NEVER crashes if optional modules fail

(function () {
  const log = (...a) => console.log("[boot2]", ...a);

  const DIAG_LOG = (s) => {
    try {
      if (window.__SCARLETT_DIAG_LOG__) window.__SCARLETT_DIAG_LOG__(String(s));
    } catch {}
  };
  const DIAG_STATUS = (s) => {
    try {
      if (window.__SCARLETT_DIAG_STATUS__) window.__SCARLETT_DIAG_STATUS__(String(s));
    } catch {}
  };

  function nowV() {
    return `v=${Date.now()}`;
  }

  async function importAny(url) {
    // url MUST be string
    const u = `${url}${url.includes("?") ? "&" : "?"}${nowV()}`;
    DIAG_LOG(`[boot2] import ${u}`);
    log("import", u);
    const m = await import(u);
    DIAG_LOG(`[boot2] ok ✅ ${u}`);
    return m;
  }

  function makeRenderer(THREE) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    return renderer;
  }

  function makeCamera(THREE) {
    const cam = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      200
    );
    cam.position.set(0, 1.6, 6);
    return cam;
  }

  function onResize(renderer, camera) {
    window.addEventListener("resize", () => {
      try {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      } catch {}
    });
  }

  async function main() {
    try {
      window.__SCARLETT_BOOT_STARTED__ = true;

      DIAG_STATUS("boot2: starting…");
      DIAG_LOG("boot executed ✅");
      log("boot executed ✅");

      // -------- THREE --------
      DIAG_STATUS("boot2: loading three.js…");
      const THREE = await importAny("https://unpkg.com/three@0.158.0/build/three.module.js");
      window.THREE = THREE;

      DIAG_LOG(`[boot2] three import ✅ r${THREE.REVISION}`);
      log("three import ✅", "r" + THREE.REVISION);

      // -------- CORE SCENE --------
      DIAG_STATUS("boot2: creating renderer/scene…");
      const scene = new THREE.Scene();

      const renderer = makeRenderer(THREE);
      const camera = makeCamera(THREE);

      // PlayerRig (so everything can move together cleanly later)
      const playerRig = new THREE.Group();
      playerRig.name = "PlayerRig";
      playerRig.add(camera);
      scene.add(playerRig);

      onResize(renderer, camera);

      // -------- WORLD --------
      DIAG_STATUS("boot2: loading world.js…");
      const worldUrl = "/scarlett-poker-vr/js/scarlett1/world.js";
      DIAG_LOG(`[boot2] world url= ${worldUrl}`);
      log("world url=", worldUrl);

      const worldMod = await importAny(worldUrl);
      DIAG_LOG("[boot2] world import ✅");
      log("world import ✅");

      // Support either export initWorld or default.initWorld
      const initWorld =
        (typeof worldMod?.initWorld === "function" && worldMod.initWorld) ||
        (typeof worldMod?.default?.initWorld === "function" && worldMod.default.initWorld);

      if (!initWorld) throw new Error("world.js missing initWorld export");

      DIAG_STATUS("boot2: starting world…");
      const ctx = {
        THREE,
        scene,
        renderer,
        camera,
        playerRig,
        diag: {
          log: (s) => DIAG_LOG(s),
          status: (s) => DIAG_STATUS(s),
        },
      };

      const worldOut = await initWorld(ctx);
      // worldOut can be {world, scene} etc. We keep ctx.scene regardless.
      ctx.worldOut = worldOut;

      // -------- MODULES (SAFE) --------
      // This is the ONLY place modules.json is processed.
      // No url.includes errors, because spine_modules handles objects correctly.
      DIAG_STATUS("boot2: loading modules…");
      try {
        const mods = await importAny("/scarlett-poker-vr/js/scarlett1/spine_modules.js");
        const initModules =
          (typeof mods?.initModules === "function" && mods.initModules) ||
          (typeof mods?.default?.initModules === "function" && mods.default.initModules);

        if (initModules) {
          await initModules(ctx);
          DIAG_LOG("[boot2] modules.json ✅");
          log("modules.json ✅");
        } else {
          DIAG_LOG("[boot2] spine_modules.js loaded, but no initModules() (skipping)");
        }
      } catch (e) {
        DIAG_LOG(`[boot2] modules failed (non-fatal) ❌ ${e?.message || e}`);
        log("modules failed (non-fatal)", e);
      }

      // -------- RENDER LOOP --------
      DIAG_STATUS("boot2: running ✅");
      let last = performance.now();
      renderer.setAnimationLoop(() => {
        const t = performance.now();
        const dt = Math.min(0.05, (t - last) / 1000);
        last = t;

        // If world has tick
        try {
          const w = ctx.worldOut?.world || ctx.worldOut?.default?.world || ctx.world;
          if (w?.tick) w.tick(dt);
        } catch {}

        renderer.render(scene, camera);
      });

      DIAG_LOG("render loop start ✅");
      DIAG_LOG("[boot2] done ✅");
      log("done ✅");
    } catch (e) {
      const msg = e?.message || String(e);
      DIAG_STATUS(`BOOT2 FAILED ❌ (${msg})`);
      DIAG_LOG(`[boot2] ERROR ❌ ${msg}`);
      console.error(e);
    }
  }

  main();
})();

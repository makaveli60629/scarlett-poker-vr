// /js/scarlett1/boot2.js — Scarlett 1.0 Boot (MODULE) • FULL • PERMANENT
// ✅ Stable for Android + Oculus
// ✅ Creates ctx and runs world.js
// ✅ Starts module loader (spine_modules.js) so Android pads + addons load
// ✅ Updates Scarlett Diagnostics HUD status

window.__SCARLETT_BOOT_STARTED__ = true;

(() => {
  const pad2 = (n) => String(n).padStart(2, "0");
  const stamp = () => {
    const d = new Date();
    return `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
  };

  const diagLog = (msg) => {
    try { window.__SCARLETT_DIAG_LOG__?.(`${stamp()} ${msg}`); } catch {}
    try { console.log(`${stamp()} ${msg}`); } catch {}
  };

  const diagStatus = (s) => {
    try { window.__SCARLETT_DIAG_STATUS__?.(String(s)); } catch {}
  };

  const fatal = (e, label = "BOOT2 FAILED") => {
    const m = e?.message || e;
    diagLog(`❌ ${label}: ${m}`);
    diagStatus(`BOOT FAILED ❌ (see log)`);
    console.error(e);
  };

  const detectBase = () => {
    // GitHub pages: /scarlett-poker-vr/
    const p = location.pathname || "/";
    if (p.includes("/scarlett-poker-vr/")) return "/scarlett-poker-vr/";
    return "/";
  };

  const BASE = detectBase();
  const ROOT = `${BASE}js/scarlett1/`;

  diagLog(`href=${location.href}`);
  diagLog(`path=${location.pathname}`);
  diagLog(`base=${BASE}`);
  diagLog(`secureContext=${!!window.isSecureContext}`);
  diagLog(`ua=${navigator.userAgent}`);
  diagLog(`navigator.xr=${!!navigator.xr}`);

  diagStatus("Booting…");

  // Global ctx shared by world + modules (PERMANENT)
  const ctx = {
    BASE,
    ROOT,
    THREE: null,
    renderer: null,
    scene: null,
    camera: null,
    rig: null,
    clock: null,
    updates: [],
    addUpdate(fn) { if (typeof fn === "function") ctx.updates.push(fn); },
    log: (s) => diagLog(String(s)),
    status: (s) => diagStatus(String(s)),
    state: {
      startedAt: performance.now(),
      inXR: false
    }
  };
  window.__SCARLETT_BASE__ = BASE;
  window.__SCARLETT_ROOT__ = ROOT;
  window.__SCARLETT_CTX__ = ctx;

  // Ensure we catch runtime errors to HUD (PERMANENT)
  window.addEventListener("error", (ev) => {
    diagLog(`WINDOW ERROR: ${ev?.message || ev}`);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    diagLog(`PROMISE REJECT: ${ev?.reason?.message || ev?.reason || ev}`);
  });

  // Main async boot
  (async () => {
    try {
      diagLog(`boot executed ✅`);
      diagLog(`[boot2] importing three…`);

      // Import THREE (CDN) with cache-bust
      const THREE_URL = `https://unpkg.com/three@0.158.0/build/three.module.js?v=${Date.now()}`;
      diagLog(`[boot2] import ${THREE_URL}`);
      const THREE = await import(THREE_URL);
      ctx.THREE = THREE;
      diagLog(`[boot2] three import ✅ r${THREE.REVISION || "?"}`);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      document.body.appendChild(renderer.domElement);

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x05070c);

      // Camera + Rig
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
      camera.position.set(0, 1.65, 2.5);

      const rig = new THREE.Group();
      rig.name = "PlayerRig";
      rig.position.set(0, 0, 0);
      rig.add(camera);
      scene.add(rig);

      // Light baseline (safe)
      const hemi = new THREE.HemisphereLight(0x99bbff, 0x111122, 0.9);
      scene.add(hemi);

      const key = new THREE.DirectionalLight(0xffffff, 0.6);
      key.position.set(5, 10, 6);
      scene.add(key);

      // Save to ctx
      ctx.renderer = renderer;
      ctx.scene = scene;
      ctx.camera = camera;
      ctx.rig = rig;
      ctx.clock = new THREE.Clock();

      // Resize handler
      const onResize = () => {
        const w = window.innerWidth, h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      // Import world.js
      const worldUrl = `${ROOT}world.js?v=${Date.now()}`;
      diagLog(`[boot2] world url= ${worldUrl}`);
      diagLog(`[boot2] import ${worldUrl}`);
      const worldMod = await import(worldUrl);
      diagLog(`[boot2] world import ✅`);

      const initWorld =
        (typeof worldMod.initWorld === "function" && worldMod.initWorld) ||
        (typeof worldMod.default === "function" && worldMod.default) ||
        (typeof worldMod.default?.initWorld === "function" && worldMod.default.initWorld) ||
        null;

      if (!initWorld) {
        throw new Error("world.js loaded but no initWorld(ctx) export found");
      }

      // Start world
      ctx.status("Starting world…");
      diagLog(`initWorld() start`);
      await initWorld(ctx);

      // Render loop
      renderer.setAnimationLoop(() => {
        const dt = ctx.clock.getDelta();

        // allow modules to detect XR
        ctx.state.inXR = !!renderer.xr?.isPresenting;

        // update callbacks
        for (let i = 0; i < ctx.updates.length; i++) {
          try { ctx.updates[i](dt, ctx); } catch (e) { /* keep loop alive */ }
        }

        renderer.render(scene, camera);
      });

      diagLog(`render loop start ✅`);

      // -------------------------------
      // START MODULES (CRITICAL FIX)
      // -------------------------------
      try {
        diagLog(`[boot2] import ${ROOT}spine_modules.js`);
        const mods = await import(`${ROOT}spine_modules.js?v=${Date.now()}`);
        diagLog(`[boot2] spine_modules.js loaded ✅`);

        const startMods =
          (typeof mods.initModules === "function" && mods.initModules) ||
          (typeof mods.init === "function" && mods.init) ||
          (typeof mods.default?.initModules === "function" && mods.default.initModules) ||
          (typeof mods.default?.init === "function" && mods.default.init) ||
          null;

        if (!startMods) {
          diagLog(`[boot2] spine_modules.js loaded, but no init/initModules (skipping)`);
        } else {
          await startMods(ctx);
          diagLog(`[boot2] modules started ✅`);
        }
      } catch (e) {
        diagLog(`[boot2] module init failed ❌ ${e?.message || e}`);
      }

      // Final status
      ctx.status("World running ✅");
      diagLog(`[boot2] done ✅`);
    } catch (e) {
      fatal(e, "BOOT2 FAILED");
    }
  })();
})();

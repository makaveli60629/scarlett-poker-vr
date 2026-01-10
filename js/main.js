// /js/main.js — Scarlett VR Poker — Boot Core 1.0 (Permanent)
// Goals:
// ✅ ONE boot entry point
// ✅ VR Button always appears (3-level fallback)
// ✅ World always renders (fallback bright world)
// ✅ Loud diagnostics + on-screen logs (Quest/Android friendly)
// ✅ Safe optional module loading (never hard-fails)

(async function boot() {
  // ---------- Double boot guard ----------
  if (window.__SCARLETT_BOOTED__) {
    console.warn("Scarlett already booted — preventing double init");
    throw new Error("Double boot prevented");
  }
  window.__SCARLETT_BOOTED__ = true;

  // ---------- HUD refs ----------
  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnMenu: document.getElementById("btnMenu"),
    btnReboot: document.getElementById("btnReboot"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
  };

  const LOG = {
    lines: [],
    max: 320,
    push(kind, msg) {
      const time = new Date().toLocaleTimeString();
      const line = `[${time}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
    },
    clear() { this.lines = []; if (ui.logBox) ui.logBox.textContent = ""; },
    copy() {
      const text = this.lines.join("\n");
      navigator.clipboard?.writeText?.(text).then(
        () => this.push("log", "Copied logs ✅"),
        () => this.push("warn", "Clipboard copy failed.")
      );
    }
  };

  window.SCARLETT_LOG = LOG;

  addEventListener("error", (e) => LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener("unhandledrejection", (e) => {
    const reason = e.reason instanceof Error ? (e.reason.stack || e.reason.message) : String(e.reason);
    LOG.push("error", `UnhandledPromiseRejection: ${reason}`);
  });

  function setMetrics(rows) {
    if (!ui.grid) return;
    ui.grid.innerHTML = "";
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      row.className = "kv";
      const kk = document.createElement("div"); kk.className = "k"; kk.textContent = k;
      const vv = document.createElement("div"); vv.className = "v"; vv.textContent = v;
      row.appendChild(kk); row.appendChild(vv);
      ui.grid.appendChild(row);
    }
  }

  async function setCaps() {
    const xr = !!navigator.xr;
    ui.capXR.textContent = xr ? "YES" : "NO";
    let immersive = false;
    try { immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; } catch {}
    ui.capImm.textContent = immersive ? "YES" : "NO";
    return { xr, immersive };
  }

  // ---------- Load THREE (prefer your local wrapper if it exists) ----------
  const THREE = await (async () => {
    try {
      const mod = await import("./three.js"); // your repo shows /js/three.js exists
      // wrapper might export default or named exports
      return mod.default || mod.THREE || mod;
    } catch {
      const mod = await import("three");
      return mod;
    }
  })();

  // ---------- Safe import helper ----------
  async function safeImport(url, name = url) {
    try {
      const mod = await import(url);
      LOG.push("log", `import ok: ${name}`);
      return mod;
    } catch (e) {
      LOG.push("warn", `import fail: ${name} — ${e?.message || e}`);
      return null;
    }
  }

  // ---------- Create renderer/scene/camera ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);
  camera.position.set(0, 1.65, 2.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---------- VR Button (3-level fallback) ----------
  async function attachVRButton() {
    // A) Your local /js/VRButton.js first
    const localVR = await safeImport("./VRButton.js", "./VRButton.js");
    if (localVR) {
      try {
        // common patterns
        if (typeof localVR.createVRButton === "function") {
          const btn = localVR.createVRButton(renderer);
          if (btn) btn.id = "VRButton";
          LOG.push("log", "VRButton ✅ via local createVRButton()");
          return true;
        }
        if (localVR.VRButton?.createButton) {
          const btn = localVR.VRButton.createButton(renderer);
          btn.id = "VRButton";
          document.body.appendChild(btn);
          LOG.push("log", "VRButton ✅ via local VRButton.createButton()");
          return true;
        }
      } catch (e) {
        LOG.push("warn", `Local VRButton failed: ${e?.message || e}`);
      }
    }

    // B) Three addons VRButton
    const threeVR = await safeImport("three/addons/webxr/VRButton.js", "three/addons/webxr/VRButton.js")
      || await safeImport("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js", "unpkg VRButton.js");

    if (threeVR?.VRButton?.createButton) {
      try {
        const btn = threeVR.VRButton.createButton(renderer, {
          optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
        });
        btn.id = "VRButton";
        document.body.appendChild(btn);
        LOG.push("log", "VRButton ✅ via three/addons");
        return true;
      } catch (e) {
        LOG.push("warn", `Three VRButton failed: ${e?.message || e}`);
      }
    }

    // C) Manual fallback button
    if (navigator.xr) {
      const btn = document.createElement("button");
      btn.id = "VRButton";
      btn.textContent = "ENTER VR (Fallback)";
      btn.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:999999;padding:12px 14px;border-radius:14px;font-weight:900;";
      btn.onclick = async () => {
        try {
          const session = await navigator.xr.requestSession("immersive-vr", {
            optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
          });
          await renderer.xr.setSession(session);
          LOG.push("log", "Fallback XR session started ✅");
        } catch (e) {
          LOG.push("error", `Fallback requestSession failed: ${e?.message || e}`);
        }
      };
      document.body.appendChild(btn);
      LOG.push("warn", "Using fallback VR button.");
      return true;
    }

    LOG.push("error", "No navigator.xr — cannot enter VR on this browser/device.");
    return false;
  }

  // ---------- Always-visible fallback world ----------
  function buildBrightFallbackWorld() {
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x080812, 1.05));

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 12, 4);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(60, 60, 0x00ffff, 0x223344);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.position.y = 0.01;
    scene.add(grid);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 2.2, 20),
      new THREE.MeshStandardMaterial({
        color: 0x0a0b12,
        roughness: 0.4,
        metalness: 0.2,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 1.25
      })
    );
    pillar.position.set(0, 1.1, -2.2);
    scene.add(pillar);

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.12, 40),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
    );
    table.position.set(0, 0.78, -1.2);
    scene.add(table);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xff2d7a })
    );
    marker.position.set(0, 1.55, -0.6);
    scene.add(marker);

    // Dealer anchor for dealing systems (many of your modules look for this)
    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, 0.92, -0.35);
    scene.add(dealer);

    LOG.push("warn", "Fallback world built ✅ (so you are never blind).");
  }

  // ---------- Load your real world.js (safe) ----------
  let worldStatus = "fallback";
  async function loadWorld() {
    const mod = await safeImport("./world.js", "./world.js");
    if (!mod) {
      buildBrightFallbackWorld();
      return;
    }

    try {
      // patterns we support:
      // 1) export const World = { init(ctx) }
      // 2) export function createWorld(scene)
      // 3) export default { init }
      const ctx = { THREE, scene, renderer, camera, log: (m) => LOG.push("log", m), LOG };

      if (mod.World?.init) {
        await mod.World.init(ctx);
        worldStatus = "World.init(ctx)";
        LOG.push("log", "World.init ✅");
        return;
      }

      if (typeof mod.createWorld === "function") {
        mod.createWorld(scene);
        worldStatus = "createWorld(scene)";
        LOG.push("log", "createWorld ✅");
        return;
      }

      if (mod.default?.init) {
        await mod.default.init(ctx);
        worldStatus = "default.init(ctx)";
        LOG.push("log", "world default.init ✅");
        return;
      }

      // If we got here, the world module loaded but didn’t match expected exports.
      LOG.push("warn", "world.js loaded but no known init/createWorld export found.");
      buildBrightFallbackWorld();
    } catch (e) {
      LOG.push("error", `world init failed: ${e?.message || e}`);
      buildBrightFallbackWorld();
    }
  }

  // ---------- Controls: load your movement/phone modules if they exist ----------
  const Systems = [];
  function addSystem(name, sys) {
    if (!sys) return;
    Systems.push({ name, sys });
    LOG.push("log", `system added: ${name}`);
  }

  async function initOptionalSystems() {
    // These are in your repo list. We load them if they export init/update.
    const candidates = [
      ["diagnostics", "./diagnostics.js"],
      ["dev_mode", "./dev_mode.js"],
      ["input_hub", "./input_hub.js"],
      ["input", "./input.js"],
      ["hands", "./hands.js"],
      ["interactions", "./interactions.js"],
      ["vr_locomotion", "./vr_locomotion.js"],
      ["xr_locomotion", "./xr_locomotion.js"],
      ["android_controls", "./android_controls.js"],
      ["mobile_touch", "./mobile_touch.js"],
      ["teleport", "./teleport.js"],
      ["teleport_machine", "./teleport_machine.js"],
      ["vr_ui", "./vr_ui.js"],
      ["ui", "./ui.js"],
      ["poker_sim", "./poker_sim.js"],
    ];

    const ctx = { THREE, scene, renderer, camera, LOG, log: (m)=>LOG.push("log", m) };

    for (const [name, url] of candidates) {
      const mod = await safeImport(url, url);
      if (!mod) continue;

      const sys =
        mod.default ||
        mod[name] ||
        mod.System ||
        mod[name.replace(/[-_].*$/,"")] ||
        mod;

      // If it has init/update, register it
      if (sys?.init || sys?.update) {
        try {
          if (sys.init) await sys.init(ctx);
          addSystem(name, sys);
        } catch (e) {
          LOG.push("warn", `system init failed (${name}): ${e?.message || e}`);
        }
      }
    }
  }

  // ---------- Menu toggle ----------
  function toggleMenu() {
    // If you have your own HUD/UI system, it can override this later.
    // For now, we simply log.
    LOG.push("log", "Menu toggle (M). If you have ui.js/vr_ui.js it should hook here.");
  }

  ui.btnMenu?.addEventListener("click", toggleMenu);
  addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "m") toggleMenu(); });

  ui.btnClear?.addEventListener("click", () => LOG.clear());
  ui.btnCopy?.addEventListener("click", () => LOG.copy());
  ui.btnReboot?.addEventListener("click", () => {
    LOG.push("warn", "Soft reboot requested. Reloading page…");
    location.reload();
  });

  // ---------- Boot sequence ----------
  const caps = await setCaps();
  LOG.push("log", `Boot start. XR=${caps.xr} immersive-vr=${caps.immersive}`);

  await attachVRButton();
  await loadWorld();
  await initOptionalSystems();

  // Add XR hands objects (even if modules handle hands, this is harmless)
  try {
    const leftHand = renderer.xr.getHand(0);
    const rightHand = renderer.xr.getHand(1);
    leftHand.name = "XRHandLeft";
    rightHand.name = "XRHandRight";
    scene.add(leftHand, rightHand);
  } catch {}

  renderer.xr.addEventListener("sessionstart", () => LOG.push("log", "XR sessionstart ✅"));
  renderer.xr.addEventListener("sessionend", () => LOG.push("warn", "XR sessionend"));

  // ---------- Render loop ----------
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    // Update optional systems
    for (const s of Systems) {
      try { s.sys.update?.(dt, { THREE, scene, renderer, camera, LOG }); } catch {}
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["VRButton", document.getElementById("VRButton") ? "YES" : "NO"],
      ["World", worldStatus],
      ["Systems", `${Systems.length}`],
    ]);

    renderer.render(scene, camera);
  });

  LOG.push("log", "Boot complete ✅");
})();

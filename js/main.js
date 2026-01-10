// /js/main.js — Scarlett Hybrid 1.0 (PERMANENT BOOT CORE)
// ✅ Single entry point
// ✅ VRButton always appears (local VRButton.js -> three/addons -> manual fallback)
// ✅ Always renders (world.js or fallback world)
// ✅ Loads existing modules safely (never hard-crash)

(async function boot() {
  // ---------------- Double-boot guard ----------------
  if (window.__SCARLETT_BOOTED__) {
    console.warn("Scarlett already booted — preventing double init");
    throw new Error("Double boot prevented");
  }
  window.__SCARLETT_BOOTED__ = true;

  // ---------------- HUD + logger ----------------
  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnMenu: document.getElementById("btnMenu"),
    btnLobby: document.getElementById("btnRoomLobby"),
    btnStore: document.getElementById("btnRoomStore"),
    btnScorpion: document.getElementById("btnRoomScorpion"),
    btnSoftReboot: document.getElementById("btnSoftReboot"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
  };

  const LOG = {
    lines: [],
    max: 360,
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

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.LOG = LOG;

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

  ui.btnClear?.addEventListener("click", () => LOG.clear());
  ui.btnCopy?.addEventListener("click", () => LOG.copy());
  ui.btnSoftReboot?.addEventListener("click", () => location.reload());

  // ---------------- Load THREE (prefer your local /js/three.js) ----------------
  const THREE = await (async () => {
    try {
      const mod = await import("./three.js");
      return mod.default || mod.THREE || mod;
    } catch {
      const mod = await import("three");
      return mod;
    }
  })();

  // ---------------- Safe import helper ----------------
  async function safeImport(url, label = url) {
    try {
      const mod = await import(url);
      LOG.push("log", `import ok: ${label}`);
      return mod;
    } catch (e) {
      LOG.push("warn", `import fail: ${label} — ${e?.message || e}`);
      return null;
    }
  }

  // ---------------- Renderer / scene / camera ----------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 800);
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

  // ---------------- VRButton (3-level fallback) ----------------
  async function attachVRButton() {
    // A) Your local /js/VRButton.js
    const local = await safeImport("./VRButton.js", "./VRButton.js");
    if (local) {
      try {
        if (typeof local.createVRButton === "function") {
          const btn = local.createVRButton(renderer);
          if (btn) btn.id = "VRButton";
          LOG.push("log", "VRButton ✅ via local createVRButton()");
          return true;
        }
        if (local.VRButton?.createButton) {
          const btn = local.VRButton.createButton(renderer);
          btn.id = "VRButton";
          document.body.appendChild(btn);
          LOG.push("log", "VRButton ✅ via local VRButton.createButton()");
          return true;
        }
      } catch (e) {
        LOG.push("warn", `Local VRButton failed: ${e?.message || e}`);
      }
    }

    // B) three/addons
    const threeVR =
      await safeImport("three/addons/webxr/VRButton.js", "three/addons/webxr/VRButton.js") ||
      await safeImport("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js", "unpkg VRButton.js");

    if (threeVR?.VRButton?.createButton) {
      const btn = threeVR.VRButton.createButton(renderer, {
        optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
      });
      btn.id = "VRButton";
      document.body.appendChild(btn);
      LOG.push("log", "VRButton ✅ via three/addons");
      return true;
    }

    // C) Manual fallback
    if (navigator.xr) {
      const btn = document.createElement("button");
      btn.id = "VRButton";
      btn.textContent = "ENTER VR (Fallback)";
      btn.style.cssText =
        "position:fixed;right:14px;bottom:14px;z-index:999999;padding:12px 14px;border-radius:14px;font-weight:900;";
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
      LOG.push("warn", "Using manual fallback VR button.");
      return true;
    }

    LOG.push("error", "No navigator.xr — cannot enter VR on this browser.");
    return false;
  }

  // ---------------- Minimal always-visible fallback world ----------------
  function buildFallbackWorld() {
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x080812, 1.05));

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(6, 12, 4);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const grid = new THREE.GridHelper(80, 80, 0x00ffff, 0x223344);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.position.y = 0.01;
    scene.add(grid);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(6.0, 6.0, 0.20, 64),
      new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.5, metalness: 0.15 })
    );
    hub.position.set(0, 0.10, 0);
    scene.add(hub);

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.12, 40),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
    );
    table.position.set(0, 0.78, -1.2);
    scene.add(table);

    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, 0.92, -0.35);
    scene.add(dealer);

    LOG.push("warn", "Fallback world built ✅ (you are never blind).");
  }

  // ---------------- Load unified world (below) ----------------
  let worldStatus = "none";
  const worldMod = await safeImport("./world.js", "./world.js");
  if (!worldMod) {
    buildFallbackWorld();
    worldStatus = "fallback (world.js missing)";
  }

  // ---------------- Create runtime ctx ----------------
  const ctx = {
    THREE, scene, camera, renderer, LOG,
    BUILD: Date.now(),
    systems: {},
    world: null,
    room: "lobby",
    mode: "lobby",
  };

  // ---------------- Init world ----------------
  if (worldMod?.World?.init) {
    try {
      await worldMod.World.init(ctx);
      worldStatus = "World.init ✅";
      ctx.world = worldMod.World;
    } catch (e) {
      LOG.push("error", `World.init failed: ${e?.message || e}`);
      buildFallbackWorld();
      worldStatus = "fallback (World.init crash)";
    }
  } else {
    buildFallbackWorld();
    worldStatus = "fallback (no World.init export)";
  }

  // ---------------- Hands objects always present (harmless) ----------------
  try {
    const left = renderer.xr.getHand(0); left.name = "XRHandLeft";
    const right = renderer.xr.getHand(1); right.name = "XRHandRight";
    scene.add(left, right);
    ctx.hands = { left, right };
  } catch {}

  // ---------------- Simple debug controls ----------------
  function toggleMenu() {
    // If your ui.js already manages menu, it can override this later.
    LOG.push("log", "Menu toggle pressed (M).");
  }

  ui.btnMenu?.addEventListener("click", toggleMenu);
  addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "m") toggleMenu(); });

  function setRoom(room) {
    ctx.world?.setRoom?.(ctx, room);
    ctx.room = room;
    ctx.mode = room;
    LOG.push("log", `Room => ${room}`);
  }
  ui.btnLobby?.addEventListener("click", () => setRoom("lobby"));
  ui.btnStore?.addEventListener("click", () => setRoom("store"));
  ui.btnScorpion?.addEventListener("click", () => setRoom("scorpion"));

  // ---------------- XR session events ----------------
  await setCaps();
  await attachVRButton();

  renderer.xr.addEventListener("sessionstart", () => LOG.push("log", "XR sessionstart ✅"));
  renderer.xr.addEventListener("sessionend", () => LOG.push("warn", "XR sessionend"));

  // ---------------- Main loop ----------------
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    try { ctx.world?.update?.(ctx, dt); } catch {}

    setMetrics([
      ["FPS", `${fps}`],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["VRButton", document.getElementById("VRButton") ? "YES" : "NO"],
      ["World", worldStatus],
      ["Room", ctx.room],
      ["Systems", Object.keys(ctx.systems || {}).length.toString()],
    ]);

    renderer.render(scene, camera);
  });

  LOG.push("log", "Hybrid boot complete ✅");
})();

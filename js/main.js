// /js/main.js — Scarlett Hybrid 1.2 (PERMANENT BOOT CORE — FULL)
// ✅ Single entry point (index.html imports this only)
// ✅ VRButton always appears (local VRButton.js -> three/addons -> manual fallback)
// ✅ Always renders (world.js or fallback world)
// ✅ Safe module loading (never hard-crash)
// ✅ PlayerRig added (fixes android_controls + mobile_touch expectations)
// ✅ Spawns at SpawnPoint (square entry) and ALWAYS faces table
// ✅ Fallback movement (WASD + Android touch move/look) + basic collision vs ctx.colliders
// ✅ Room buttons call World.setRoom safely
//
// NOTE: This file expects your /index.html to include the debug HUD elements:
// #scarlettGrid #scarlettLog #capXR #capImm and buttons btnMenu btnRoomLobby btnRoomStore btnRoomScorpion etc.

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
    max: 420,
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
    if (ui.capXR) ui.capXR.textContent = xr ? "YES" : "NO";
    let immersive = false;
    try { immersive = xr ? await navigator.xr.isSessionSupported("immersive-vr") : false; } catch {}
    if (ui.capImm) ui.capImm.textContent = immersive ? "YES" : "NO";
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

  // ✅ PlayerRig required by android_controls/mobile_touch (position/rotation exist)
  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);
  scene.add(player);

  // camera local offset for standing height (non-XR). In XR, the headset pose overrides.
  camera.position.set(0, 1.65, 2.8);
  player.add(camera);

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
    // A) Local /js/VRButton.js
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
        if (typeof local.createButton === "function") {
          const btn = local.createButton(renderer);
          if (btn) {
            btn.id = "VRButton";
            document.body.appendChild(btn);
          }
          LOG.push("log", "VRButton ✅ via local createButton()");
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

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.12, 40),
      new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.9, metalness: 0.05 })
    );
    table.position.set(0, 0.78, -1.2);
    table.name = "BossTable";
    scene.add(table);

    const dealer = new THREE.Object3D();
    dealer.name = "DealerAnchor";
    dealer.position.set(0, 1.0, -0.35);
    scene.add(dealer);

    const spawn = new THREE.Object3D();
    spawn.name = "SpawnPoint";
    spawn.position.set(0, 0, 6);
    scene.add(spawn);

    LOG.push("warn", "Fallback world built ✅ (you are never blind).");
  }

  // ---------------- Runtime ctx ----------------
  const ctx = {
    THREE, scene, camera, renderer, LOG,
    BUILD: Date.now(),
    systems: {},
    world: null,
    room: "lobby",
    mode: "lobby",

    // ✅ Player rig aliases (fixes android_controls + mobile_touch expectations)
    player,
    rig: player,
    cameraRig: player,
    yawObject: player,     // yaw (left/right)
    pitchObject: camera,   // pitch (up/down)

    // Collision list populated by world.js if it creates solids
    colliders: [],
    disableFallbackMove: false, // set true if your locomotion modules fully work
  };

  // ---------------- Load world.js ----------------
  let worldStatus = "none";
  const worldMod = await safeImport("./world.js", "./world.js");
  if (!worldMod) {
    buildFallbackWorld();
    worldStatus = "fallback (world.js missing)";
  }

  if (worldMod?.World?.init) {
    try {
      await worldMod.World.init(ctx);
      ctx.world = worldMod.World;
      worldStatus = "World.init ✅";
    } catch (e) {
      LOG.push("error", `World.init failed: ${e?.message || e}`);
      buildFallbackWorld();
      worldStatus = "fallback (World.init crash)";
    }
  } else if (worldStatus === "none") {
    buildFallbackWorld();
    worldStatus = "fallback (no World.init export)";
  }

  // ---------------- Hands objects always present ----------------
  try {
    const left = renderer.xr.getHand(0); left.name = "XRHandLeft";
    const right = renderer.xr.getHand(1); right.name = "XRHandRight";
    scene.add(left, right);
    ctx.hands = { left, right };
  } catch {}

  // ---------------- SpawnPoint + Face Table (always) ----------------
  const _tmpV = new THREE.Vector3();
  const _tmpV2 = new THREE.Vector3();

  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint");
    const table = scene.getObjectByName("BossTable");

    if (sp) {
      player.position.copy(sp.position);
      player.position.y = 0;
      LOG.push("log", `Spawn applied ✅ at x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    } else {
      LOG.push("warn", "No SpawnPoint found; using current PlayerRig position.");
    }

    if (table) {
      table.getWorldPosition(_tmpV);
      _tmpV2.set(player.position.x, 0, player.position.z);
      const dir = _tmpV.sub(_tmpV2);
      dir.y = 0;
      if (dir.lengthSq() > 0.00001) {
        const yaw = Math.atan2(dir.x, dir.z);
        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing table ✅");
      }
    } else {
      LOG.push("warn", "No BossTable found to face.");
    }
  }

  // Apply immediately (non-XR view)
  applySpawnAndFacing();

  // Re-apply on XR session start (Quest pose init)
  renderer.xr.addEventListener("sessionstart", () => {
    setTimeout(applySpawnAndFacing, 150);
  });

  // ---------------- Menu + room buttons ----------------
  function toggleMenu() {
    LOG.push("log", "Menu toggle pressed (M).");
  }

  ui.btnMenu?.addEventListener("click", toggleMenu);
  addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "m") toggleMenu(); });

  function setRoom(room) {
    try { ctx.world?.setRoom?.(ctx, room); } catch {}
    ctx.room = room;
    ctx.mode = room;
    LOG.push("log", `Room => ${room}`);
  }
  ui.btnLobby?.addEventListener("click", () => setRoom("lobby"));
  ui.btnStore?.addEventListener("click", () => setRoom("store"));
  ui.btnScorpion?.addEventListener("click", () => setRoom("scorpion"));

  // ---------------- Fallback Locomotion + Collision ----------------
  // Desktop: WASD/Arrows, Mobile: left drag move, right drag look
  const MoveFallback = (() => {
    const keys = {};
    let touchMove = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 };
    let touchLook = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 };

    addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
    addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

    addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        const leftSide = t.clientX < innerWidth * 0.5;
        if (leftSide && !touchMove.active) {
          touchMove = { active: true, id: t.identifier, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
        } else if (!leftSide && !touchLook.active) {
          touchLook = { active: true, id: t.identifier, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
        }
      }
    }, { passive: true });

    addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (touchMove.active && t.identifier === touchMove.id) {
          touchMove.dx = t.clientX - touchMove.startX;
          touchMove.dy = t.clientY - touchMove.startY;
        }
        if (touchLook.active && t.identifier === touchLook.id) {
          touchLook.dx = t.clientX - touchLook.startX;
          touchLook.dy = t.clientY - touchLook.startY;
        }
      }
    }, { passive: true });

    addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) {
        if (touchMove.active && t.identifier === touchMove.id) touchMove.active = false;
        if (touchLook.active && t.identifier === touchLook.id) touchLook.active = false;
      }
    }, { passive: true });

    // push-out collision for axis-aligned boxes (cheap + stable)
    function collideSlide(nextPos, colliders) {
      if (!colliders?.length) return nextPos;

      const p = nextPos.clone();
      const radius = 0.35;

      // reuse 1 box to reduce allocations
      const box = new THREE.Box3();

      for (const c of colliders) {
        if (!c) continue;
        c.updateMatrixWorld?.(true);
        box.setFromObject(c);

        // expanded check
        if (box.containsPoint(p)) {
          const cx = (box.min.x + box.max.x) * 0.5;
          const cz = (box.min.z + box.max.z) * 0.5;
          const dx = p.x - cx;
          const dz = p.z - cz;

          if (Math.abs(dx) > Math.abs(dz)) {
            p.x = dx > 0 ? box.max.x + radius : box.min.x - radius;
          } else {
            p.z = dz > 0 ? box.max.z + radius : box.min.z - radius;
          }
        }
      }
      return p;
    }

    return {
      update(dt) {
        if (ctx.disableFallbackMove) return;

        // allow in both XR and non-XR for now; disable later if your locomotion takes over
        const speed = (renderer.xr.isPresenting ? 1.15 : 2.4);

        // LOOK (touch right side)
        if (touchLook.active) {
          const yawSpeed = 0.0022;
          const pitchSpeed = 0.0018;
          ctx.yawObject.rotation.y -= touchLook.dx * yawSpeed;
          ctx.pitchObject.rotation.x -= touchLook.dy * pitchSpeed;
          ctx.pitchObject.rotation.x = Math.max(-1.2, Math.min(1.2, ctx.pitchObject.rotation.x));
          touchLook.dx *= 0.65;
          touchLook.dy *= 0.65;
        }

        // Move vector
        let forward = 0, strafe = 0;

        // WASD/Arrows
        if (keys["w"] || keys["arrowup"]) forward += 1;
        if (keys["s"] || keys["arrowdown"]) forward -= 1;
        if (keys["a"] || keys["arrowleft"]) strafe -= 1;
        if (keys["d"] || keys["arrowright"]) strafe += 1;

        // Touch move (left side)
        if (touchMove.active) {
          forward += (-touchMove.dy / 120);
          strafe  += ( touchMove.dx / 120);
          forward = Math.max(-1, Math.min(1, forward));
          strafe  = Math.max(-1, Math.min(1, strafe));
        }

        if (forward === 0 && strafe === 0) return;

        const yaw = ctx.yawObject.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);

        const vx = (strafe * cos + forward * sin) * speed * dt;
        const vz = (forward * cos - strafe * sin) * speed * dt;

        const next = ctx.player.position.clone();
        next.x += vx;
        next.z += vz;

        const fixed = collideSlide(next, ctx.colliders);
        ctx.player.position.copy(fixed);
      }
    };
  })();

  // ---------------- XR capability + VRButton ----------------
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

    // Update world + systems
    try { ctx.world?.update?.(ctx, dt); } catch {}

    // Always-available movement
    MoveFallback.update(dt);

    // Metrics
    setMetrics([
      ["FPS", `${fps}`],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["VRButton", document.getElementById("VRButton") ? "YES" : "NO"],
      ["Room", ctx.room],
      ["Systems", Object.keys(ctx.systems || {}).length.toString()],
      ["PlayerRig", `${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`],
      ["Colliders", `${(ctx.colliders?.length || 0)}`],
    ]);

    renderer.render(scene, camera);
  });

  LOG.push("log", "Hybrid boot complete ✅ (spawn + movement enabled)");
})();

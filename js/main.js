// /js/main.js — Scarlett Hybrid 2.2 (FULL, PERMANENT)
// ✅ Spawn on pad + face center
// ✅ Laser + ring ALWAYS visible in VR (camera fallback if hands not ready)
// ✅ Pinch teleport (right hand) + GestureEngine update loop wired
// ✅ VRButton reliable
// ✅ Desktop/Android fallback move (non-VR)

(async function boot() {
  if (window.__SCARLETT_BOOTED__) throw new Error("Double boot prevented");
  window.__SCARLETT_BOOTED__ = true;

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
    max: 650,
    push(kind, msg) {
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
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

  function toggleMenu() { LOG.push("log", "Menu toggle pressed (M)."); }
  ui.btnMenu?.addEventListener("click", toggleMenu);
  addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "m") toggleMenu(); });

  // THREE
  const THREE = await (async () => {
    try { const m = await import("./three.js"); return m.default || m.THREE || m; }
    catch { return await import("three"); }
  })();

  async function safeImport(url, label = url) {
    try { const m = await import(url); LOG.push("log", `import ok: ${label}`); return m; }
    catch (e) { LOG.push("warn", `import fail: ${label} — ${e?.message || e}`); return null; }
  }

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // Camera + Rig
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 800);
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // VRButton
  async function attachVRButton() {
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

    LOG.push("error", "No navigator.xr — cannot enter VR.");
    return false;
  }

  // ctx
  const ctx = {
    THREE, scene, camera, renderer, LOG,
    BUILD: Date.now(),
    systems: {},
    world: null,
    room: "lobby",
    mode: "lobby",

    player,
    rig: player,
    cameraRig: player,
    yawObject: player,
    pitchObject: camera,

    colliders: [],
    disableFallbackMove: false,
  };

  // Load world
  const worldMod = await safeImport("./world.js", "./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
  } else {
    LOG.push("error", "world.js missing World.init");
  }

  // Spawn + face
  const _tmp = new THREE.Vector3();
  const _tmp2 = new THREE.Vector3();

  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const table = scene.getObjectByName("BossTable");

    if (sp) {
      sp.getWorldPosition(_tmp);
      player.position.set(_tmp.x, 0, _tmp.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    if (table) {
      table.getWorldPosition(_tmp);
      _tmp2.set(player.position.x, 0, player.position.z);
      const d = _tmp.sub(_tmp2);
      d.y = 0;
      if (d.lengthSq() > 1e-6) {
        const yaw = Math.atan2(d.x, d.z);
        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing table ✅");
      }
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 200));

  // Room buttons
  function setRoom(room) {
    try { ctx.world?.setRoom?.(ctx, room); } catch {}
    ctx.room = room;
    ctx.mode = room;
    LOG.push("log", `Room => ${room}`);
  }
  ui.btnLobby?.addEventListener("click", () => setRoom("lobby"));
  ui.btnStore?.addEventListener("click", () => setRoom("store"));
  ui.btnScorpion?.addEventListener("click", () => setRoom("scorpion"));

  // Gesture Engine
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  gestureMod?.GestureEngine?.init?.({
    THREE, renderer, scene, camera,
    log: (m) => LOG.push("log", m),
    LOG
  });

  // Hands (optional visuals)
  try {
    const l = renderer.xr.getHand(0); l.name = "XRHandLeft";
    const r = renderer.xr.getHand(1); r.name = "XRHandRight";
    scene.add(l, r);
    ctx.hands = { left: l, right: r };
  } catch {}

  // Teleport visuals (laser + ring)
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.name = "TeleportLaser";
  laser.renderOrder = 9999;
  laser.material.depthTest = false;
  scene.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.name = "TeleportMarker";
  ring.renderOrder = 9999;
  ring.material.depthTest = false;
  scene.add(ring);

  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function updateTeleportRay() {
    // Always from camera (most reliable + always works)
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir);
    dir.normalize();

    // force downward tilt
    dir.y -= 0.35;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 1e-6) return { ok: false };

    const t = -(floorPlane.normal.dot(origin) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 24) return { ok: false };

    hit.copy(origin).addScaledVector(dir, t);

    laser.geometry.setFromPoints([origin, hit]);
    ring.position.set(hit.x, 0.02, hit.z);

    return { ok: true, point: hit.clone() };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  // Pinch teleport via GestureEngine right-hand pinchstart
  let queuedTeleport = false;
  gestureMod?.GestureEngine?.on?.("pinchstart", (e) => {
    if (e.hand !== "right") return;
    queuedTeleport = true;
  });

  // Desktop/Android fallback move (non-VR only)
  const MoveFallback = (() => {
    const keys = {};
    let touchMove = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 };
    let touchLook = { active: false, id: -1, startX: 0, startY: 0, dx: 0, dy: 0 };

    addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
    addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

    addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        const leftSide = t.clientX < innerWidth * 0.5;
        if (leftSide && !touchMove.active) touchMove = { active: true, id: t.identifier, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
        else if (!leftSide && !touchLook.active) touchLook = { active: true, id: t.identifier, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
      }
    }, { passive: true });

    addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (touchMove.active && t.identifier === touchMove.id) { touchMove.dx = t.clientX - touchMove.startX; touchMove.dy = t.clientY - touchMove.startY; }
        if (touchLook.active && t.identifier === touchLook.id) { touchLook.dx = t.clientX - touchLook.startX; touchLook.dy = t.clientY - touchLook.startY; }
      }
    }, { passive: true });

    addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) {
        if (touchMove.active && t.identifier === touchMove.id) touchMove.active = false;
        if (touchLook.active && t.identifier === touchLook.id) touchLook.active = false;
      }
    }, { passive: true });

    function collideSlide(nextPos, colliders) {
      if (!colliders?.length) return nextPos;
      const p = nextPos.clone();
      const box = new THREE.Box3();
      const radius = 0.35;
      for (const c of colliders) {
        if (!c) continue;
        c.updateMatrixWorld?.(true);
        box.setFromObject(c);
        if (box.containsPoint(p)) {
          const cx = (box.min.x + box.max.x) * 0.5;
          const cz = (box.min.z + box.max.z) * 0.5;
          const dx = p.x - cx;
          const dz = p.z - cz;
          if (Math.abs(dx) > Math.abs(dz)) p.x = dx > 0 ? box.max.x + radius : box.min.x - radius;
          else p.z = dz > 0 ? box.max.z + radius : box.min.z - radius;
        }
      }
      return p;
    }

    return {
      update(dt) {
        if (ctx.disableFallbackMove) return;
        if (renderer.xr.isPresenting) return;

        const speed = 2.4;

        if (touchLook.active) {
          ctx.yawObject.rotation.y -= touchLook.dx * 0.0022;
          ctx.pitchObject.rotation.x -= touchLook.dy * 0.0018;
          ctx.pitchObject.rotation.x = Math.max(-1.2, Math.min(1.2, ctx.pitchObject.rotation.x));
          touchLook.dx *= 0.65; touchLook.dy *= 0.65;
        }

        let forward = 0, strafe = 0;
        if (keys["w"] || keys["arrowup"]) forward += 1;
        if (keys["s"] || keys["arrowdown"]) forward -= 1;
        if (keys["a"] || keys["arrowleft"]) strafe -= 1;
        if (keys["d"] || keys["arrowright"]) strafe += 1;

        if (touchMove.active) {
          forward += (-touchMove.dy / 120);
          strafe += (touchMove.dx / 120);
          forward = Math.max(-1, Math.min(1, forward));
          strafe = Math.max(-1, Math.min(1, strafe));
        }

        if (!forward && !strafe) return;

        const yaw = ctx.yawObject.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);
        const vx = (strafe * cos + forward * sin) * speed * dt;
        const vz = (forward * cos - strafe * sin) * speed * dt;

        const next = ctx.player.position.clone();
        next.x += vx; next.z += vz;

        ctx.player.position.copy(collideSlide(next, ctx.colliders));
      }
    };
  })();

  // Caps + VRButton
  await setCaps();
  await attachVRButton();

  renderer.xr.addEventListener("sessionstart", () => LOG.push("log", "XR sessionstart ✅"));
  renderer.xr.addEventListener("sessionend", () => LOG.push("warn", "XR sessionend"));

  // Main loop (note: frame is passed in XR!)
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop((time, frame) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    try { ctx.world?.update?.(ctx, dt); } catch {}

    // Non-VR movement
    MoveFallback.update(dt);

    // Gesture updates (VR only)
    if (renderer.xr.isPresenting) {
      const refSpace = renderer.xr.getReferenceSpace?.();
      gestureMod?.GestureEngine?.update?.(frame, refSpace);

      // Laser+ring always on in VR
      const ray = updateTeleportRay();
      laser.visible = ray.ok;
      ring.visible = ray.ok;

      // Teleport if we got a pinchstart event
      if (queuedTeleport && ray.ok) {
        queuedTeleport = false;
        teleportTo(ray.point);
      }
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["VRButton", document.getElementById("VRButton") ? "YES" : "NO"],
      ["Room", ctx.room],
      ["Systems", Object.keys(ctx.systems || {}).length.toString()],
      ["Colliders", `${ctx.colliders?.length || 0}`],
      ["Rig XYZ", `${player.position.x.toFixed(1)},${player.position.y.toFixed(1)},${player.position.z.toFixed(1)}`],
    ]);

    renderer.render(scene, camera);
  });

  LOG.push("log", "Hybrid 2.2 boot complete ✅ (GestureEngine wired + teleport stable)");
})();

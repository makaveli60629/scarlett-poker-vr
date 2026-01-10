// /js/main.js — Scarlett Hybrid 2.5 (FULL, PERMANENT)
// ✅ Fixes your current issue: missing modules no longer break gameplay
// ✅ Controllers move + snap turn
// ✅ Teleport ray from RIGHT controller (primary), wrist hand (secondary), camera (last)
// ✅ Teleport on trigger/A/B press (even if GestureEngine missing)
// ✅ Still loads world systems as before
// ✅ Logs missing-module warnings clearly

(async function boot() {
  if (window.__SCARLETT_BOOTED__) throw new Error("Double boot prevented");
  window.__SCARLETT_BOOTED__ = true;

  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnSoftReboot: document.getElementById("btnSoftReboot"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
  };

  const LOG = {
    lines: [],
    max: 900,
    push(kind, msg) {
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(msg);
    },
    clear() { this.lines = []; if (ui.logBox) ui.logBox.textContent = ""; },
    copy() { navigator.clipboard?.writeText?.(this.lines.join("\n")); this.push("log", "Copied logs ✅"); }
  };

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.LOG = LOG;

  addEventListener("error", (e) => LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener("unhandledrejection", (e) => LOG.push("error", `UnhandledPromiseRejection: ${e.reason?.message || e.reason}`));

  ui.btnClear?.addEventListener("click", () => LOG.clear());
  ui.btnCopy?.addEventListener("click", () => LOG.copy());
  ui.btnSoftReboot?.addEventListener("click", () => location.reload());

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

  // Rig + camera
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
  const vrb = await safeImport("./VRButton.js", "./VRButton.js");
  if (vrb?.VRButton?.createButton) {
    const btn = vrb.VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    LOG.push("log", "VRButton ✅");
  } else {
    LOG.push("warn", "VRButton.js not found or invalid.");
  }

  // ctx
  const ctx = {
    THREE, scene, camera, renderer, LOG,
    BUILD: Date.now(),
    systems: {},
    world: null,
    colliders: [],
    player,
    rig: player,
    yawObject: player,
    pitchObject: camera,
  };

  // world
  const worldMod = await safeImport("./world.js", "./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
  } else {
    LOG.push("error", "world.js missing World.init");
  }

  // Spawn + facing (+135° correction)
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const table = scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");
    if (sp) {
      sp.getWorldPosition(tmp);
      player.position.set(tmp.x, 0, tmp.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }
    if (table) {
      table.getWorldPosition(tmp);
      tmp2.set(player.position.x, 0, player.position.z);
      const d = tmp.sub(tmp2);
      d.y = 0;
      if (d.lengthSq() > 1e-6) {
        let yaw = Math.atan2(d.x, d.z);
        yaw += THREE.MathUtils.degToRad(135);
        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing table ✅ (with +135° correction)");
      }
    }
  }
  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 200));

  // Optional modules (may be missing on GitHub right now)
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");

  const GestureEngine = gestureMod?.GestureEngine || null;
  const BettingModule = betMod?.BettingModule || null;

  if (GestureEngine?.init) {
    GestureEngine.init({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });
  } else {
    LOG.push("warn", "GestureEngine missing -> pinch features disabled (controller still works).");
  }

  if (BettingModule?.init) {
    BettingModule.init(ctx);
  } else {
    LOG.push("warn", "BettingModule missing -> bet zone disabled (movement/teleport still works).");
  }

  // Controllers
  const controllerL = renderer.xr.getController(0); controllerL.name = "ControllerLeft"; scene.add(controllerL);
  const controllerR = renderer.xr.getController(1); controllerR.name = "ControllerRight"; scene.add(controllerR);

  // XR hands (optional)
  let rightHand = null;
  try { rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight"; scene.add(rightHand); } catch {}

  // Teleport visuals
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.renderOrder = 9999; laser.material.depthTest = false; scene.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 9999; ring.material.depthTest = false;
  ring.visible = false; scene.add(ring);

  const o = new THREE.Vector3();
  const d = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const q = new THREE.Quaternion();

  function getAimPose(outOrigin, outDir) {
    // controllerR first (your request)
    if (controllerR) {
      controllerR.getWorldPosition(outOrigin);
      controllerR.getWorldQuaternion(q);
      outDir.set(0, 0, -1).applyQuaternion(q).normalize();
      outDir.y -= 0.18; outDir.normalize();
      return "controller";
    }
    // right wrist if hand tracking is active
    const wrist = rightHand?.joints?.wrist;
    if (wrist) {
      wrist.getWorldPosition(outOrigin);
      wrist.getWorldQuaternion(q);
      outDir.set(0, 0, -1).applyQuaternion(q).normalize();
      outDir.y -= 0.22; outDir.normalize();
      return "hand";
    }
    camera.getWorldPosition(outOrigin);
    camera.getWorldDirection(outDir);
    outDir.y -= 0.35; outDir.normalize();
    return "camera";
  }

  function updateTeleportRay() {
    const src = getAimPose(o, d);
    const denom = floorPlane.normal.dot(d);
    if (Math.abs(denom) < 1e-6) return { ok: false, src };
    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 26) return { ok: false, src };

    hit.copy(o).addScaledVector(d, t);
    laser.geometry.setFromPoints([o, hit]);
    ring.position.set(hit.x, 0.02, hit.z);
    return { ok: true, point: hit.clone(), src };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  // Controller movement + snap turn
  const move = { speed: 2.6, snapDeg: 30, snapCooldown: 0, aim: "controller" };

  function readGamepad() {
    const s = renderer.xr.getSession?.();
    if (!s) return null;
    let gp = null;
    for (const src of s.inputSources) if (src.gamepad && src.handedness === "left") { gp = src.gamepad; break; }
    if (!gp) for (const src of s.inputSources) if (src.gamepad) { gp = src.gamepad; break; }
    return gp;
  }

  function readTeleportPressed() {
    const s = renderer.xr.getSession?.();
    if (!s) return false;
    for (const src of s.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;
      const b = gp.buttons || [];
      if (b[0]?.pressed || b[4]?.pressed || b[5]?.pressed) return true; // trigger or A/X or B/Y
    }
    return false;
  }

  // Pinch teleport queue (only if GestureEngine exists)
  let queuedTeleport = false;
  if (GestureEngine?.on) {
    GestureEngine.on("pinchstart", (e) => { if (e.hand === "right") queuedTeleport = true; });
  }

  // Main loop
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop((time, frame) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    try { ctx.world?.update?.(ctx, dt); } catch {}
    try { BettingModule?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      // Gesture update (safe)
      try { GestureEngine?.update?.(frame, renderer.xr.getReferenceSpace?.()); } catch {}

      // Locomotion
      const gp = readGamepad();
      if (gp?.axes) {
        const ax = gp.axes;
        const x = ax[0] ?? 0;
        const y = ax[1] ?? 0;

        const yaw = player.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);
        const forward = -y;
        const strafe = x;

        player.position.x += (strafe * cos + forward * sin) * move.speed * dt;
        player.position.z += (forward * cos - strafe * sin) * move.speed * dt;

        // snap turn from right stick x if present, else reuse left
        move.snapCooldown = Math.max(0, move.snapCooldown - dt);
        const turn = ax[2] ?? ax[0] ?? 0;
        if (move.snapCooldown <= 0 && Math.abs(turn) > 0.75) {
          player.rotation.y += THREE.MathUtils.degToRad(move.snapDeg) * (turn > 0 ? -1 : 1);
          move.snapCooldown = 0.25;
        }
      }

      // Teleport aim
      const ray = updateTeleportRay();
      move.aim = ray.src;

      laser.visible = ray.ok;
      ring.visible = ray.ok;

      if ((queuedTeleport || readTeleportPressed()) && ray.ok) {
        queuedTeleport = false;
        teleportTo(ray.point);
      }
    } else {
      laser.visible = false;
      ring.visible = false;
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Aim", move.aim],
      ["Modules", `gesture=${!!GestureEngine} bet=${!!BettingModule}`],
      ["Rig", `${player.position.x.toFixed(1)},${player.position.z.toFixed(1)}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 2.5 boot complete ✅ (module-safe; upload missing files to enable chips/bets/pinch)");
})();

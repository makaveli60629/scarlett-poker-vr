// /js/main.js — Scarlett Hybrid 2.7.2 (FULL, PERMANENT DEBUG BUILD)
// FIXES:
// ✅ Facing snapped to 45° (no more corner drift)
// ✅ Teleport ring/laser hits real floor using ctx.floorY
// ✅ Movement speed reduced + deadzone
// ✅ RIGHT stick only movement + RIGHT stick 45° snap turn
// ✅ controllers + XRHands parented to PlayerRig (no stuck-on-table)
// ✅ teleport ray anchored to right controller (valid pose check)
// ✅ loads world + optional systems + gesture_engine + betting_module

(async function boot() {
  console.log("HYBRID_MAIN=2.7.2");

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

  // PlayerRig + camera
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

  // Context
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
    floorY: 0, // ✅ world.js can overwrite this
  };

  // World
  const worldMod = await safeImport("./world.js", "./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
  } else {
    LOG.push("error", "world.js missing World.init");
  }

  // ✅ Controllers parented to rig
  const controllerL = renderer.xr.getController(0);
  controllerL.name = "ControllerLeft";
  player.add(controllerL);

  const controllerR = renderer.xr.getController(1);
  controllerR.name = "ControllerRight";
  player.add(controllerR);

  LOG.push("log", "Controllers parented to PlayerRig ✅");

  // ✅ Hands also parented to rig
  try {
    const handL = renderer.xr.getHand(0); handL.name = "XRHandLeft"; player.add(handL);
    const handR = renderer.xr.getHand(1); handR.name = "XRHandRight"; player.add(handR);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (controller-only OK).");
  }

  // ✅ Spawn + Facing snapped to 45°
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const SNAP_45 = Math.PI / 4;

  function snapYaw45(yaw) {
    return Math.round(yaw / SNAP_45) * SNAP_45;
  }

  function applySpawnAndFacing() {
    const spObj = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    if (spObj) {
      spObj.getWorldPosition(tmp);
      player.position.set(tmp.x, 0, tmp.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    } else {
      LOG.push("warn", "No SpawnPoint/SpawnPad found.");
    }

    const spPoint = scene.getObjectByName("SpawnPoint");

    // Prefer authored rotation if enabled by world
    if (spPoint && spPoint.userData?.useSpawnRotation) {
      spPoint.getWorldQuaternion(tmpQ);
      const e = new THREE.Euler().setFromQuaternion(tmpQ, "YXZ");
      player.rotation.set(0, snapYaw45(e.y), 0);
      LOG.push("log", "Facing ✅ (SpawnPoint rotation, snapped 45°)");
      return;
    }

    // Otherwise face target
    const faceTargetName = spPoint?.userData?.faceTargetName || "HubPlate";
    const target =
      scene.getObjectByName(faceTargetName) ||
      scene.getObjectByName("BossTable") ||
      scene.getObjectByName("HubPlate");

    if (!target) { LOG.push("warn", "No facing target found."); return; }

    target.getWorldPosition(tmp);
    tmp2.set(player.position.x, 0, player.position.z);
    const v = tmp.sub(tmp2);
    v.y = 0;

    if (v.lengthSq() > 1e-6) {
      const yaw = snapYaw45(Math.atan2(v.x, v.z));
      player.rotation.set(0, yaw, 0);
      LOG.push("log", `Facing ✅ (${target.name}) snapped 45°`);
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 220));

  // Modules
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");

  const GestureEngine = gestureMod?.GestureEngine || null;
  const BettingModule = betMod?.BettingModule || null;

  if (GestureEngine?.init) GestureEngine.init({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });
  if (!GestureEngine) LOG.push("warn", "GestureEngine missing -> pinch disabled.");

  if (BettingModule?.init) BettingModule.init(ctx);
  if (!BettingModule) LOG.push("warn", "BettingModule missing -> betting disabled.");

  // ✅ Teleport visuals anchored to right controller, using world floorY
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ctx.floorY);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.material.depthTest = true;
  laser.frustumCulled = false;
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.material.depthTest = true;
  ring.visible = false;
  scene.add(ring);

  const o = new THREE.Vector3();
  const d = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const q = new THREE.Quaternion();

  function controllerPoseValid() {
    controllerR.getWorldPosition(o);
    return o.lengthSq() > 0.05;
  }

  function updateTeleportRay() {
    // refresh plane constant in case world updates floorY
    floorPlane.constant = -ctx.floorY;

    if (!controllerPoseValid()) return { ok: false, src: "controller-invalid" };

    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);

    d.set(0, 0, -1).applyQuaternion(q).normalize();
    d.y -= 0.18;
    d.normalize();

    const denom = floorPlane.normal.dot(d);
    if (Math.abs(denom) < 1e-6) return { ok: false, src: "controller" };

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 40) return { ok: false, src: "controller" };

    hit.copy(o).addScaledVector(d, t);

    const dist = Math.max(0.2, Math.min(40, o.distanceTo(hit)));
    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-dist)]);

    ring.position.set(hit.x, ctx.floorY + 0.02, hit.z);
    ring.visible = true;

    return { ok: true, point: hit.clone(), src: "controller" };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  // ✅ Prefer RIGHT controller for everything (one-controller mode)
  function readGamepadPreferred() {
    const s = renderer.xr.getSession?.();
    if (!s) return null;

    for (const src of s.inputSources) {
      if (src.gamepad && src.handedness === "right") return { gp: src.gamepad, handedness: "right" };
    }
    for (const src of s.inputSources) {
      if (src.gamepad) return { gp: src.gamepad, handedness: src.handedness || "unknown" };
    }
    return null;
  }

  function readTeleportPressed() {
    const s = renderer.xr.getSession?.();
    if (!s) return false;
    for (const src of s.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;
      const b = gp.buttons || [];
      if (b[0]?.pressed || b[4]?.pressed || b[5]?.pressed) return true;
    }
    return false;
  }

  const move = {
    speed: 1.35,       // ✅ slower
    deadzone: 0.16,
    snapDeg: 45,       // ✅ 45° snap turns
    snapCooldown: 0,
    useRightStick: true
  };

  let queuedTeleport = false;
  if (GestureEngine?.on) GestureEngine.on("pinchstart", (e) => { if (e.hand === "right") queuedTeleport = true; });

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
      try { GestureEngine?.update?.(frame, renderer.xr.getReferenceSpace?.()); } catch {}

      // locomotion — right stick only (if available)
      const pack = readGamepadPreferred();
      const gp = pack?.gp;

      if (gp?.axes) {
        const ax = gp.axes;

        // right stick (2,3) if present, else fallback (0,1)
        let sx = 0, sy = 0, tx = 0;

        if (move.useRightStick && ax.length >= 4) {
          sx = ax[2] ?? 0; // strafe
          sy = ax[3] ?? 0; // forward/back
          tx = sx;         // turn uses same axis
        } else {
          sx = ax[0] ?? 0;
          sy = ax[1] ?? 0;
          tx = ax[2] ?? sx ?? 0;
        }

        // deadzone
        const dz = move.deadzone;
        if (Math.abs(sx) < dz) sx = 0;
        if (Math.abs(sy) < dz) sy = 0;
        if (Math.abs(tx) < dz) tx = 0;

        const yaw = player.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);

        const forward = -sy;
        const strafe = sx;

        player.position.x += (strafe * cos + forward * sin) * move.speed * dt;
        player.position.z += (forward * cos - strafe * sin) * move.speed * dt;

        // snap turn 45°
        move.snapCooldown = Math.max(0, move.snapCooldown - dt);
        if (move.snapCooldown <= 0 && Math.abs(tx) > 0.75) {
          player.rotation.y += THREE.MathUtils.degToRad(move.snapDeg) * (tx > 0 ? -1 : 1);
          move.snapCooldown = 0.28;
          LOG.push("log", `SnapTurn ${move.snapDeg}°`);
        }
      }

      // teleport
      const ray = updateTeleportRay();
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
      ["FloorY", `${ctx.floorY.toFixed(2)}`],
      ["Rig", `${player.position.x.toFixed(1)},${player.position.z.toFixed(1)}`],
      ["ControllersInRig", (controllerR.parent === player) ? "YES" : "NO"],
      ["Move", `spd=${move.speed} dz=${move.deadzone} snap=${move.snapDeg}°`],
      ["Modules", `gesture=${!!GestureEngine} bet=${!!BettingModule}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 2.7.2 boot complete ✅ (snap facing, floor-correct teleport, right-stick 45° turn)");
})();

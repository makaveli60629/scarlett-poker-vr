// /js/main.js — Scarlett Hybrid 2.6 (FULL)
// ✅ Facing fix: rotate 90° LEFT from current result (your request)
// ✅ Teleport beam is ATTACHED to controller/camera (so it stays with you)
// ✅ Beam depthTest ON (won't appear through walls)
// ✅ Beam source validity check (prevents origin stuck at 0,0,0)
// ✅ Controller movement + snap turn stays
// ✅ Still loads optional gesture/betting modules if present

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

  // Spawn + facing FIX (90° LEFT of where you were)
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
      const v = tmp.sub(tmp2);
      v.y = 0;
      if (v.lengthSq() > 1e-6) {
        let yaw = Math.atan2(v.x, v.z);

        // Previously we tried +135°. You said you need to face "right angle to the left" now.
        // That means rotate -90° from what you're seeing.
        const yawOffsetDeg = 45; // (= 135 - 90) => net 90° left correction
        yaw += THREE.MathUtils.degToRad(yawOffsetDeg);

        player.rotation.set(0, yaw, 0);
        LOG.push("log", `Facing table ✅ (yawOffset=${yawOffsetDeg}°)`);
      }
    }
  }
  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 220));

  // Optional modules (safe if missing)
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");

  const GestureEngine = gestureMod?.GestureEngine || null;
  const BettingModule = betMod?.BettingModule || null;

  if (GestureEngine?.init) GestureEngine.init({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });
  if (!GestureEngine) LOG.push("warn", "GestureEngine missing -> pinch features disabled (controller still works).");

  if (BettingModule?.init) BettingModule.init(ctx);
  if (!BettingModule) LOG.push("warn", "BettingModule missing -> betting disabled (movement/teleport still works).");

  // Controllers
  const controllerL = renderer.xr.getController(0); controllerL.name = "ControllerLeft"; scene.add(controllerL);
  const controllerR = renderer.xr.getController(1); controllerR.name = "ControllerRight"; scene.add(controllerR);

  // XR right hand (optional)
  let rightHand = null;
  try { rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight"; scene.add(rightHand); } catch {}

  // ---------- Teleport visuals (ATTACHED) ----------
  // We'll attach the laser to whichever aim source is active (controllerR or camera fallback).
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
  laserMat.depthTest = true;        // ✅ no "through walls"
  laserMat.transparent = true;
  laserMat.opacity = 0.95;

  const laser = new THREE.Line(laserGeom, laserMat);
  laser.name = "TeleportLaser";
  laser.frustumCulled = false;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.name = "TeleportMarker";
  ring.visible = false;
  ring.material.depthTest = true;

  // start attached to controllerR (preferred)
  controllerR.add(laser);
  scene.add(ring);

  const o2 = new THREE.Vector3();
  const d2 = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const q = new THREE.Quaternion();

  function isPoseValid(obj) {
    // Valid if it isn't still at origin and has moved at least slightly
    if (!obj) return false;
    obj.getWorldPosition(o2);
    return o2.lengthSq() > 0.05; // avoids (0,0,0) stale pose
  }

  function getAimPose(outOrigin, outDir) {
    // Prefer RIGHT controller if valid
    if (isPoseValid(controllerR)) {
      controllerR.getWorldPosition(outOrigin);
      controllerR.getWorldQuaternion(q);
      outDir.set(0, 0, -1).applyQuaternion(q).normalize();
      outDir.y -= 0.18; outDir.normalize();
      // ensure laser is parented to controllerR
      if (laser.parent !== controllerR) {
        laser.parent?.remove(laser);
        controllerR.add(laser);
        laser.position.set(0,0,0);
      }
      return "controller";
    }

    // Otherwise try right wrist if available
    const wrist = rightHand?.joints?.wrist;
    if (wrist) {
      wrist.getWorldPosition(outOrigin);
      wrist.getWorldQuaternion(q);
      outDir.set(0, 0, -1).applyQuaternion(q).normalize();
      outDir.y -= 0.22; outDir.normalize();
      // parent laser to rightHand so it follows you
      if (laser.parent !== rightHand) {
        laser.parent?.remove(laser);
        rightHand.add(laser);
        laser.position.set(0,0,0);
      }
      return "hand";
    }

    // Final fallback: camera
    camera.getWorldPosition(outOrigin);
    camera.getWorldDirection(outDir);
    outDir.y -= 0.35; outDir.normalize();
    if (laser.parent !== camera) {
      laser.parent?.remove(laser);
      camera.add(laser);
      laser.position.set(0,0,0);
    }
    return "camera";
  }

  function updateTeleportRay() {
    const src = getAimPose(o2, d2);

    const denom = floorPlane.normal.dot(d2);
    if (Math.abs(denom) < 1e-6) return { ok: false, src };

    const t = -(floorPlane.normal.dot(o2) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 26) return { ok: false, src };

    hit.copy(o2).addScaledVector(d2, t);

    // laser is in local space of its parent: just set endpoint distance along -Z
    const dist = Math.max(0.2, Math.min(26, o2.distanceTo(hit)));
    const pts = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-dist)];
    laser.geometry.setFromPoints(pts);

    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible = true;

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

  // Loop
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

      // locomotion
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

        move.snapCooldown = Math.max(0, move.snapCooldown - dt);
        const turn = ax[2] ?? ax[0] ?? 0;
        if (move.snapCooldown <= 0 && Math.abs(turn) > 0.75) {
          player.rotation.y += THREE.MathUtils.degToRad(move.snapDeg) * (turn > 0 ? -1 : 1);
          move.snapCooldown = 0.25;
        }
      }

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
  LOG.push("log", "Hybrid 2.6 boot complete ✅ (yaw fixed + laser attached + demo hub alive)");
})();

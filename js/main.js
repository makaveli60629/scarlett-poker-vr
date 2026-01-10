// /js/main.js — Scarlett Hybrid 2.4 (FULL, PERMANENT)
// ✅ VRButton reliable
// ✅ Spawn on pad + face hub/table + extra +135° correction (your “3 more 45°”)
// ✅ BRIGHT + world systems
// ✅ Controller locomotion (thumbstick move) + snap turn
// ✅ Teleport ray from RIGHT HAND (wrist) OR RIGHT CONTROLLER (preferred), NOT camera
// ✅ Laser/ring visible while aiming; click A/X or trigger to teleport
// ✅ Low-poly controller-hands + wrist watch (left)
// ✅ Chips/Betting remain compatible (if your chip files exist)

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
    max: 800,
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

  // Spawn + facing (with your +135° correction)
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

        // ✅ FIX: your report says you need +135° (three 45°)
        yaw += THREE.MathUtils.degToRad(135);

        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing table ✅ (with +135° correction)");
      }
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 200));

  // GestureEngine (hands-only pinch still available)
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  gestureMod?.GestureEngine?.init?.({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });

  // Controllers
  const controllerL = renderer.xr.getController(0);
  controllerL.name = "ControllerLeft";
  scene.add(controllerL);

  const controllerR = renderer.xr.getController(1);
  controllerR.name = "ControllerRight";
  scene.add(controllerR);

  // Low-poly “controller hands” (so controllers feel like hands)
  function makeControllerHand(color = 0xe8ecff) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, flatShading: true });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.06), mat);
    palm.position.set(0, 0, -0.02);
    g.add(palm);

    const kn = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.03), mat);
    kn.position.set(0, 0.012, -0.05);
    g.add(kn);

    // little “finger nubs”
    for (let i = -1; i <= 1; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.03), mat);
      f.position.set(i * 0.016, 0.012, -0.075);
      g.add(f);
    }

    g.rotation.x = -0.25;
    return g;
  }

  const handMeshL = makeControllerHand(0x7fe7ff);
  const handMeshR = makeControllerHand(0xff2d7a);

  controllerL.add(handMeshL);
  controllerR.add(handMeshR);

  // Wrist watch (left controller)
  const watch = new THREE.Group();
  const wMat = new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.35, metalness: 0.35, flatShading: true });
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.03), wMat);
  const face  = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.008, 18), new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0x00ffff, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.25
  }));
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0.011, 0);
  watch.add(strap, face);
  watch.position.set(0, -0.015, -0.015);
  controllerL.add(watch);

  // Hands (XR hands can coexist; if you enable hand tracking, pinch still works)
  let leftHand = null, rightHand = null;
  try {
    leftHand = renderer.xr.getHand(0); leftHand.name = "XRHandLeft";
    rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight";
    scene.add(leftHand, rightHand);
  } catch {}

  // Teleport visuals
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.renderOrder = 9999;
  laser.material.depthTest = false;
  scene.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 9999;
  ring.material.depthTest = false;
  ring.visible = false;
  scene.add(ring);

  const o = new THREE.Vector3();
  const d = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const q = new THREE.Quaternion();

  function getAimPose(outOrigin, outDir) {
    // Priority order:
    // 1) Right XR controller (best for you right now)
    // 2) Right hand wrist joint (if hand tracking is active)
    // 3) Camera fallback (only if none)

    // controller
    if (controllerR) {
      controllerR.getWorldPosition(outOrigin);
      controllerR.getWorldQuaternion(q);
      outDir.set(0, 0, -1).applyQuaternion(q).normalize();
      outDir.y -= 0.20; // slight down
      outDir.normalize();
      return "controller";
    }

    // hand wrist
    const wrist = rightHand?.joints?.wrist;
    if (wrist) {
      wrist.getWorldPosition(outOrigin);
      wrist.getWorldQuaternion(q);
      outDir.set(0, 0, -1).applyQuaternion(q).normalize();
      outDir.y -= 0.25;
      outDir.normalize();
      return "hand";
    }

    // fallback
    camera.getWorldPosition(outOrigin);
    camera.getWorldDirection(outDir);
    outDir.y -= 0.35;
    outDir.normalize();
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
    laser.visible = true;

    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible = true;

    return { ok: true, point: hit.clone(), src };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  // Controller locomotion + snap turn
  const move = {
    speed: 2.4,
    snapDeg: 30,
    snapCooldown: 0,
    v2: { x: 0, y: 0 },
    aim: "controller"
  };

  function readGamepadAxes() {
    const s = renderer.xr.getSession?.();
    if (!s) return null;

    // find gamepad for RIGHT controller first, else any
    let gp = null;
    for (const src of s.inputSources) {
      if (src.gamepad && src.handedness === "right") { gp = src.gamepad; break; }
    }
    if (!gp) {
      for (const src of s.inputSources) { if (src.gamepad) { gp = src.gamepad; break; } }
    }
    if (!gp) return null;

    const ax = gp.axes || [];
    // Quest typical: [x, y, x2, y2] depending source
    const x = ax[2] ?? ax[0] ?? 0; // strafe
    const y = ax[3] ?? ax[1] ?? 0; // forward/back (usually negative is forward)
    return { gp, x, y };
  }

  function readTeleportButtons() {
    const s = renderer.xr.getSession?.();
    if (!s) return false;

    // Teleport accept on A/X or trigger (pressed)
    for (const src of s.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;

      const b = gp.buttons || [];
      const trigger = b[0]?.pressed;   // often trigger
      const a = b[4]?.pressed;         // often A / X
      const bBtn = b[5]?.pressed;      // B / Y
      if (trigger || a || bBtn) return true;
    }
    return false;
  }

  // Optional: keep pinch teleport too (if you enable hand tracking later)
  let queuedTeleport = false;
  gestureMod?.GestureEngine?.on?.("pinchstart", (e) => {
    if (e.hand === "right") queuedTeleport = true;
  });

  // Modules (chips/betting optional if you have files)
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");
  betMod?.BettingModule?.init?.(ctx);

  // Main loop
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop((time, frame) => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    // world update
    try { ctx.world?.update?.(ctx, dt); } catch {}

    // module update
    betMod?.BettingModule?.update?.(ctx, dt);

    if (renderer.xr.isPresenting) {
      // gestures (hands only)
      const refSpace = renderer.xr.getReferenceSpace?.();
      gestureMod?.GestureEngine?.update?.(frame, refSpace);

      // controller locomotion
      const axes = readGamepadAxes();
      if (axes) {
        const x = axes.x || 0;
        const y = axes.y || 0;

        // move relative to player yaw
        const yaw = player.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);

        const forward = -y; // Quest: stick up often yields negative y
        const strafe = x;

        const vx = (strafe * cos + forward * sin) * move.speed * dt;
        const vz = (forward * cos - strafe * sin) * move.speed * dt;

        player.position.x += vx;
        player.position.z += vz;

        // snap turn (use left stick x if available; use right stick x as fallback)
        move.snapCooldown = Math.max(0, move.snapCooldown - dt);
        const turn = (axes.gp.axes?.[0] ?? 0);
        if (move.snapCooldown <= 0 && Math.abs(turn) > 0.75) {
          player.rotation.y += THREE.MathUtils.degToRad(move.snapDeg) * (turn > 0 ? -1 : 1);
          move.snapCooldown = 0.25;
        }
      }

      // teleport aim
      const ray = updateTeleportRay();
      move.aim = ray.src;
      laser.visible = ray.ok;
      ring.visible = ray.ok;

      const pressTeleport = readTeleportButtons();
      if ((queuedTeleport || pressTeleport) && ray.ok) {
        queuedTeleport = false;
        teleportTo(ray.point);
      }
    } else {
      // non-VR
      laser.visible = false;
      ring.visible = false;
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Aim", move.aim],
      ["VRButton", document.getElementById("VRButton") ? "YES" : "NO"],
      ["Rig XYZ", `${player.position.x.toFixed(1)},${player.position.y.toFixed(1)},${player.position.z.toFixed(1)}`],
      ["Pot", `${betMod?.BettingModule?.getPot?.() ?? 0}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 2.4 boot complete ✅ (controllers move + hand/controller teleport + brighter + yaw fix)");
})();

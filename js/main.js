// /js/main.js — Scarlett Hybrid 2.7 (FULL)
// ✅ FIX 1: Spawn facing includes +180° flip (so you don't face the teleport machine)
// ✅ FIX 2: Controllers + XRHands are parented to PlayerRig (so they follow you; no "stuck on table")
// ✅ Center hub table already in world.js; this makes you face it reliably
// ✅ Teleport ray anchored to right controller (valid pose check)

(async function boot() {
  console.log("HYBRID_MAIN=2.7");

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

  // ✅ FIX: Controllers MUST be parented to PlayerRig so they move with teleport
  const controllerL = renderer.xr.getController(0);
  controllerL.name = "ControllerLeft";
  player.add(controllerL);

  const controllerR = renderer.xr.getController(1);
  controllerR.name = "ControllerRight";
  player.add(controllerR);

  LOG.push("log", "Controllers parented to PlayerRig ✅ (no more stuck-on-table)");

  // XR hands (also parent to rig)
  let rightHand = null, leftHand = null;
  try {
    leftHand = renderer.xr.getHand(0); leftHand.name = "XRHandLeft"; player.add(leftHand);
    rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight"; player.add(rightHand);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (controller-only is fine).");
  }

  // Spawn + facing: look at center table, then flip 180° (your request)
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const target = scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");

    if (sp) {
      sp.getWorldPosition(tmp);
      player.position.set(tmp.x, 0, tmp.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    if (target) {
      target.getWorldPosition(tmp);
      tmp2.set(player.position.x, 0, player.position.z);
      const v = tmp.sub(tmp2);
      v.y = 0;

      if (v.lengthSq() > 1e-6) {
        let yaw = Math.atan2(v.x, v.z);

        // ✅ your new instruction: flip 180°
        yaw += Math.PI;

        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing corrected ✅ (+180° flip)");
      }
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 220));

  // Optional modules (safe)
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");

  const GestureEngine = gestureMod?.GestureEngine || null;
  const BettingModule = betMod?.BettingModule || null;

  if (GestureEngine?.init) GestureEngine.init({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });
  if (!GestureEngine) LOG.push("warn", "GestureEngine missing -> pinch disabled.");

  if (BettingModule?.init) BettingModule.init(ctx);
  if (!BettingModule) LOG.push("warn", "BettingModule missing -> betting disabled.");

  // Teleport visuals (anchored to controllerR)
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

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
    return o.lengthSq() > 0.05; // blocks stale origin
  }

  function updateTeleportRay() {
    if (!controllerPoseValid()) return { ok: false, src: "controller-invalid" };

    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);

    d.set(0, 0, -1).applyQuaternion(q).normalize();
    d.y -= 0.18;
    d.normalize();

    const denom = floorPlane.normal.dot(d);
    if (Math.abs(denom) < 1e-6) return { ok: false, src: "controller" };

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 26) return { ok: false, src: "controller" };

    hit.copy(o).addScaledVector(d, t);

    const dist = Math.max(0.2, Math.min(26, o.distanceTo(hit)));
    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-dist)]);

    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible = true;

    return { ok: true, point: hit.clone(), src: "controller" };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  function readGamepad() {
    const s = renderer.xr.getSession?.();
    if (!s) return null;
    for (const src of s.inputSources) if (src.gamepad && src.handedness === "left") return src.gamepad;
    for (const src of s.inputSources) if (src.gamepad) return src.gamepad;
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

  // locomotion
  const move = { speed: 2.6, snapDeg: 30, snapCooldown: 0 };

  // pinch teleport queue
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
      ["Rig", `${player.position.x.toFixed(1)},${player.position.z.toFixed(1)}`],
      ["ControllersInRig", (controllerR.parent === player) ? "YES" : "NO"],
      ["Modules", `gesture=${!!GestureEngine} bet=${!!BettingModule}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 2.7 boot complete ✅ (180° facing + controllers follow rig + center hub ready)");
})();

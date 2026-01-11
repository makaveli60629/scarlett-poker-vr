// /js/main.js — Scarlett Hybrid 3.2 (FULL, PERMANENT DEBUG BUILD)
// FIXES v3.2:
// ✅ Spawn facing: explicitly face AWAY from teleport machine (or any "faceAwayFromName")
// ✅ Teleport is edge-triggered (one leap per press) - no more rapid teleports holding trigger
// ✅ Keeps: XR yaw correction, left move, right 45° snap, floor raycast teleport

(async function boot() {
  console.log("HYBRID_MAIN=3.2");

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
    btnMenu: document.getElementById("btnMenu"),
    panel: document.getElementById("scarlettDiag"),
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

  let menuVisible = true;
  function setMenuVisible(v) {
    menuVisible = !!v;
    if (!ui.panel) return;
    ui.panel.style.display = menuVisible ? "block" : "none";
  }
  function toggleMenu() { setMenuVisible(!menuVisible); }
  ui.btnMenu?.addEventListener("click", toggleMenu);
  addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "m") toggleMenu(); });

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
    LOG.push("log", "VRButton ✅ via local VRButton.createButton()");
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
    floors: [],
    player,
    rig: player,
    yawObject: player,
    pitchObject: camera,
  };

  // World
  const worldMod = await safeImport("./world.js", "./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
  } else {
    LOG.push("error", "world.js missing World.init");
  }

  // Controllers parented to rig
  const controllerL = renderer.xr.getController(0);
  controllerL.name = "ControllerLeft";
  player.add(controllerL);

  const controllerR = renderer.xr.getController(1);
  controllerR.name = "ControllerRight";
  player.add(controllerR);

  LOG.push("log", "Controllers parented to PlayerRig ✅");

  // Hands parented to rig
  try {
    const leftHand = renderer.xr.getHand(0); leftHand.name = "XRHandLeft"; player.add(leftHand);
    const rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight"; player.add(rightHand);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (controller-only OK).");
  }

  // ---------- Spawn + facing (robust) ----------
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();

  function getXRCameraYawRad() {
    const xrCam = renderer.xr.getCamera(camera);
    const e = new THREE.Euler().setFromQuaternion(xrCam.quaternion, "YXZ");
    return e.y;
  }

  function applySpawn() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    if (!sp) return;
    sp.getWorldPosition(tmpV);
    player.position.set(tmpV.x, 0, tmpV.z);
    LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
  }

  function computeYawToward(fromXZ, toWorld) {
    tmpV.copy(toWorld);
    tmpV2.set(fromXZ.x, 0, fromXZ.z);
    const v = tmpV.sub(tmpV2);
    v.y = 0;
    if (v.lengthSq() < 1e-6) return null;
    return Math.atan2(v.x, v.z);
  }

  function applyFacingXRCorrect() {
    const sp = scene.getObjectByName("SpawnPoint");
    const from = player.position;

    // If world supplies an explicit rotation, use it (best)
    if (sp && Math.abs(sp.rotation.y) > 0.0001) {
      let desiredYaw = sp.rotation.y;

      // XR correction
      if (renderer.xr.isPresenting) desiredYaw = desiredYaw - getXRCameraYawRad();
      player.rotation.set(0, desiredYaw, 0);

      LOG.push("log", `Facing from SpawnPoint.rotation ✅ yaw=${THREE.MathUtils.radToDeg(sp.rotation.y).toFixed(0)}°`);
      return;
    }

    // Otherwise: face AWAY from TeleportMachine (or any configured object)
    const awayName = sp?.userData?.faceAwayFromName || "TeleportMachineFallback";
    const awayObj = scene.getObjectByName(awayName);

    if (awayObj) {
      awayObj.getWorldPosition(tmpV);
      let yawToTele = computeYawToward(from, tmpV);
      if (yawToTele != null) {
        let desiredYaw = yawToTele + Math.PI; // face opposite
        if (renderer.xr.isPresenting) desiredYaw = desiredYaw - getXRCameraYawRad();
        player.rotation.set(0, desiredYaw, 0);
        LOG.push("log", `Facing AWAY from ${awayName} ✅`);
        return;
      }
    }

    // Fallback: face toward hub
    const targetName = sp?.userData?.faceTargetName || "HubPlate";
    const target = scene.getObjectByName(targetName) || scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");
    if (target) {
      target.getWorldPosition(tmpV);
      let desiredYaw = computeYawToward(from, tmpV);
      if (desiredYaw != null) {
        if (renderer.xr.isPresenting) desiredYaw = desiredYaw - getXRCameraYawRad();
        player.rotation.set(0, desiredYaw, 0);
        LOG.push("log", `Facing toward ${targetName} ✅`);
      }
    }
  }

  function applySpawnAndFacingAll() {
    applySpawn();
    applyFacingXRCorrect();
  }

  applySpawnAndFacingAll();

  renderer.xr.addEventListener("sessionstart", () => {
    setTimeout(() => setMenuVisible(false), 900);
    setTimeout(() => applySpawnAndFacingAll(), 300);
  });

  renderer.xr.addEventListener("sessionend", () => setMenuVisible(true));

  // ---------- Modules ----------
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");
  const GestureEngine = gestureMod?.GestureEngine || gestureMod?.default || null;
  const BettingModule = betMod?.BettingModule || betMod?.default || null;

  if (GestureEngine?.init) GestureEngine.init({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });
  if (!GestureEngine) LOG.push("warn", "GestureEngine missing -> pinch disabled.");

  if (BettingModule?.init) BettingModule.init(ctx);
  if (!BettingModule) LOG.push("warn", "BettingModule missing -> betting disabled.");

  // ---------- Teleport (edge-triggered) ----------
  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.frustumCulled = false;
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.34, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const o = new THREE.Vector3();
  const d = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function controllerPoseValid() {
    controllerR.getWorldPosition(o);
    return o.lengthSq() > 0.05;
  }

  function rayToFloor() {
    if (!controllerPoseValid()) return { ok: false };

    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(tmpQ);

    d.set(0, 0, -1).applyQuaternion(tmpQ).normalize();
    d.y -= 0.18;
    d.normalize();

    // Prefer real floor meshes if provided by world
    let floorMeshes = (ctx.floors && ctx.floors.length) ? ctx.floors : null;
    if (!floorMeshes) {
      floorMeshes = [];
      scene.traverse((obj) => {
        if (!obj.isMesh) return;
        const n = (obj.name || "").toLowerCase();
        if (n.includes("floor") || n.includes("hubplate") || n.includes("spawn") || n.includes("plate")) {
          floorMeshes.push(obj);
        }
      });
    }

    if (floorMeshes && floorMeshes.length) {
      raycaster.set(o, d);
      const hits = raycaster.intersectObjects(floorMeshes, true);
      if (hits && hits.length) {
        hit.copy(hits[0].point);
        return { ok: true, point: hit.clone(), src: "raycast" };
      }
    }

    // fallback plane
    const denom = floorPlane.normal.dot(d);
    if (Math.abs(denom) < 1e-6) return { ok: false };
    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 30) return { ok: false };
    hit.copy(o).addScaledVector(d, t);
    return { ok: true, point: hit.clone(), src: "plane" };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  function getGamepad(handedness) {
    const s = renderer.xr.getSession?.();
    if (!s) return null;
    for (const src of s.inputSources) {
      if (src.gamepad && src.handedness === handedness) return { gp: src.gamepad, src };
    }
    return null;
  }

  function deadzone(v, dz = 0.18) {
    return Math.abs(v) < dz ? 0 : v;
  }

  // Edge-triggered teleport press (per-controller)
  const pressState = new Map(); // inputSource -> lastPressed
  function readTeleportPressedEdge() {
    const s = renderer.xr.getSession?.();
    if (!s) return false;

    let fired = false;
    for (const src of s.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;
      const b = gp.buttons || [];
      const pressed = !!(b[0]?.pressed || b[1]?.pressed || b[4]?.pressed || b[5]?.pressed);
      const last = pressState.get(src) || false;

      if (pressed && !last) fired = true; // rising edge => one leap
      pressState.set(src, pressed);
    }
    return fired;
  }

  // Movement tuning
  const move = {
    speed: 1.10,   // slow
    snapDeg: 45,
    snapCooldown: 0,
  };

  // pinch teleport queue (edge style)
  let queuedTeleport = false;
  if (GestureEngine?.on) {
    GestureEngine.on("pinchstart", (e) => { if (e.hand === "right") queuedTeleport = true; });
  }

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

      // Left stick movement
      const left = getGamepad("left");
      if (left?.gp?.axes) {
        const ax = left.gp.axes;
        const x = deadzone(ax[0] ?? 0);
        const y = deadzone(ax[1] ?? 0);

        const yaw = player.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);

        const forward = -y;
        const strafe = x;

        player.position.x += (strafe * cos + forward * sin) * move.speed * dt;
        player.position.z += (forward * cos - strafe * sin) * move.speed * dt;
      }

      // Right stick snap turn
      const right = getGamepad("right");
      if (right?.gp?.axes) {
        move.snapCooldown = Math.max(0, move.snapCooldown - dt);
        const turn = deadzone(right.gp.axes[2] ?? right.gp.axes[0] ?? 0);
        if (move.snapCooldown <= 0 && Math.abs(turn) > 0.75) {
          player.rotation.y += THREE.MathUtils.degToRad(move.snapDeg) * (turn > 0 ? -1 : 1);
          move.snapCooldown = 0.22;
        }
      }

      // Teleport ray + edge-triggered teleport
      const ray = rayToFloor();
      if (ray.ok) {
        const dist = Math.max(0.2, Math.min(30, o.distanceTo(ray.point)));
        laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-dist)]);
        ring.position.set(ray.point.x, ray.point.y + 0.02, ray.point.z);
        laser.visible = true;
        ring.visible = true;

        const fire = queuedTeleport || readTeleportPressedEdge();
        if (fire && ray.ok) {
          queuedTeleport = false;
          teleportTo(ray.point);
        }
      } else {
        laser.visible = false;
        ring.visible = false;
      }
    } else {
      laser.visible = false;
      ring.visible = false;
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Rig", `${player.position.x.toFixed(1)},${player.position.z.toFixed(1)}`],
      ["MoveSpeed", `${move.speed.toFixed(2)}`],
      ["SnapTurn", `${move.snapDeg}°`],
      ["Modules", `gesture=${!!GestureEngine} bet=${!!BettingModule}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 3.2 boot complete ✅ (face-away + teleport edge-trigger + slower movement)");
})();

// /js/main.js — Scarlett Hybrid 4.5 (FULL REFINE)
// - Bright + consistent lighting
// - Grid-only (world controls floors; we don't add floors here)
// - Laser always visible
// - Left stick move; Right stick 45° snap; if no left stick -> right stick Y moves
// - Teleport = 1 leap per press (right trigger / A / squeeze)
// - Spawn faces BossTable (or SpawnPoint target/rotation if provided)
// - HUD diagnostics restored + buttons wired

(async function boot() {
  console.log("SCARLETT_MAIN=4.5");

  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  // -------------------------
  // HUD / Diagnostics wiring
  // -------------------------
  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnSoftReboot: document.getElementById("btnSoftReboot"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
    btnMenu: document.getElementById("btnMenu"),
    btnRoomLobby: document.getElementById("btnRoomLobby"),
    btnRoomStore: document.getElementById("btnRoomStore"),
    btnRoomScorpion: document.getElementById("btnRoomScorpion"),
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
    copy() {
      navigator.clipboard?.writeText?.(this.lines.join("\n"));
      this.push("log", "Copied logs ✅");
    }
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

  async function safeImport(url, label = url) {
    try { const m = await import(url); LOG.push("log", `import ok: ${label}`); return m; }
    catch (e) { LOG.push("warn", `import fail: ${label} — ${e?.message || e}`); return null; }
  }

  // -------------------------
  // THREE (prefer local wrapper)
  // -------------------------
  const THREE = await (async () => {
    const local = await safeImport("./three.js", "three via local wrapper");
    if (local) return local.default || local.THREE || local;
    return await import("three");
  })();

  // -------------------------
  // Scene / Camera / Renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c12);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1400);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Quest brightness + stable response
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.45;
  renderer.physicallyCorrectLights = false;

  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // -------------------------
  // VRButton
  // -------------------------
  const vrb = await safeImport("./VRButton.js", "./VRButton.js");
  if (vrb?.VRButton?.createButton) {
    const btn = vrb.VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    LOG.push("log", "VRButton ✅");
  } else {
    LOG.push("warn", "VRButton.js missing/invalid");
  }

  // -------------------------
  // Rig
  // -------------------------
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // -------------------------
  // OVERKILL LIGHT PACK (inside + outside)
  // -------------------------
  const lightRoot = new THREE.Group();
  lightRoot.name = "LightPack";
  scene.add(lightRoot);

  lightRoot.add(new THREE.AmbientLight(0xffffff, 1.15));
  lightRoot.add(new THREE.HemisphereLight(0xffffff, 0x202030, 2.3));

  const sun = new THREE.DirectionalLight(0xffffff, 4.2);
  sun.position.set(60, 110, 70);
  lightRoot.add(sun);

  // Headlamp: guarantees you can see what you're looking at
  const headLamp = new THREE.PointLight(0xffffff, 2.6, 45);
  headLamp.position.set(0, 1.25, 0.35);
  camera.add(headLamp);

  // -------------------------
  // Context shared with World / Systems
  // -------------------------
  const ctx = {
    THREE, scene, camera, renderer, player, rig: player, LOG,
    BUILD: Date.now(),
    systems: {},
    world: null,
    colliders: []
  };

  // -------------------------
  // World
  // -------------------------
  const worldMod = await safeImport("./world.js", "./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
    LOG.push("log", `world module loaded: ${worldMod.World?.version || "unknown"}`);
  } else {
    LOG.push("error", "world.js missing World.init");
  }

  // -------------------------
  // Controllers parented to rig
  // -------------------------
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  controllerL.name = "ControllerLeft";
  controllerR.name = "ControllerRight";
  player.add(controllerL, controllerR);
  LOG.push("log", "Controllers parented to PlayerRig ✅");

  try {
    const leftHand = renderer.xr.getHand(0);
    const rightHand = renderer.xr.getHand(1);
    leftHand.name = "XRHandLeft";
    rightHand.name = "XRHandRight";
    player.add(leftHand, rightHand);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (ok)");
  }

  // -------------------------
  // Room manager (optional)
  // -------------------------
  const rm = await safeImport("./room_manager.js", "./room_manager.js");
  if (rm?.RoomManager?.init) {
    rm.RoomManager.init(ctx);
    ctx.systems.roomManager = rm.RoomManager;
    LOG.push("log", "[rm] init ✅");
  }

  // Room buttons -> RoomManager if present
  function setRoom(name) {
    const R = ctx.systems.roomManager;
    if (R?.setRoom) R.setRoom(ctx, name);
    else LOG.push("warn", `RoomManager missing; cannot setRoom(${name})`);
  }
  ui.btnRoomLobby?.addEventListener("click", () => setRoom("lobby"));
  ui.btnRoomStore?.addEventListener("click", () => setRoom("store"));
  ui.btnRoomScorpion?.addEventListener("click", () => setRoom("scorpion"));

  // -------------------------
  // Spawn facing: ALWAYS face BossTable by default
  // -------------------------
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    if (sp) {
      sp.getWorldPosition(tmpA);
      player.position.set(tmpA.x, 0, tmpA.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    // Priority:
    // 1) SpawnPoint.userData.faceTargetName
    // 2) SpawnPoint.rotation.y if explicitly set
    // 3) Look at BossTable / HubPlate
    const faceTargetName = sp?.userData?.faceTargetName;
    if (faceTargetName) {
      const t = scene.getObjectByName(faceTargetName);
      if (t) {
        t.getWorldPosition(tmpB);
        const v = tmpB.sub(new THREE.Vector3(player.position.x, 0, player.position.z));
        v.y = 0;
        if (v.lengthSq() > 1e-6) {
          player.rotation.y = Math.atan2(v.x, v.z);
          LOG.push("log", `Facing target ✅ (${faceTargetName})`);
          return;
        }
      }
    }

    // explicit spawn rotation?
    if (sp && Math.abs(sp.rotation?.y) > 1e-4) {
      player.rotation.y = sp.rotation.y;
      LOG.push("log", `Facing from SpawnPoint.rotation ✅ yaw=${(player.rotation.y * 180/Math.PI).toFixed(0)}°`);
      return;
    }

    // default: face table
    const table = scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");
    if (table) {
      table.getWorldPosition(tmpB);
      const v = tmpB.sub(new THREE.Vector3(player.position.x, 0, player.position.z));
      v.y = 0;
      if (v.lengthSq() > 1e-6) {
        player.rotation.y = Math.atan2(v.x, v.z);
        LOG.push("log", "Facing table ✅ (BossTable)");
      }
    }
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 180));

  // -------------------------
  // Teleport ray + marker (always visible)
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laserMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false
  });

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    laserMat
  );
  laser.frustumCulled = false;
  laser.renderOrder = 9999;
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.38, 72),
    new THREE.MeshBasicMaterial({
      color: 0x7fe7ff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 9999;
  ring.visible = false;
  scene.add(ring);

  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const hubPos = new THREE.Vector3();

  function updateTeleportRay() {
    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);
    if (o.lengthSq() < 0.0001) return false;

    // Controller forward
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

    // Slight bias toward hub center so it “wants” to go there
    const hub = scene.getObjectByName("HubPlate") || scene.getObjectByName("BossTable");
    if (hub) {
      hub.getWorldPosition(hubPos);
      const toHub = hubPos.clone().sub(o).normalize();
      fwd.lerp(toHub, 0.25).normalize();
    }

    // Aim down so it hits plane y=0
    dir.copy(fwd);
    dir.y -= 0.45;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 1e-4) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 40) return false;

    hit.copy(o).addScaledVector(dir, t);

    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  // -------------------------
  // Gamepad helpers (Quest axes fix)
  // -------------------------
  function getGamepads() {
    const session = renderer.xr.getSession?.();
    if (!session) return { gpL: null, gpR: null };

    let gpL = null, gpR = null;
    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
    return { gpL, gpR };
  }

  function deadzone(v, dz = 0.18) {
    if (Math.abs(v) < dz) return 0;
    return v;
  }

  // Move + snap
  const MOVE_SPEED = 1.15;          // slower, controlled
  const SNAP_ANGLE = Math.PI / 4;   // 45°
  let snapCooldown = 0;

  // Teleport = 1 leap per press
  let lastTeleportPressed = false;

  function isTeleportPressed(gpR) {
    if (!gpR?.buttons?.length) return false;
    // Trigger(0) or squeeze(1) or A(4) often on Quest mappings
    const b = gpR.buttons;
    return !!(b[0]?.pressed || b[1]?.pressed || b[4]?.pressed);
  }

  // -------------------------
  // Main loop
  // -------------------------
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  await setCaps();
  LOG.push("log", "Hybrid 4.5 boot complete ✅ (grid-only + hallways + bright + laser + move + 45° snap + 1-leap)");

  renderer.setAnimationLoop((t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    try { ctx.world?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR } = getGamepads();

      // Movement:
      // - Prefer LEFT stick axes[0],[1]
      // - If no left controller/gamepad -> use RIGHT stick Y (axes[3]) for forward/back
      let lx = 0, ly = 0;
      if (gpL?.axes?.length >= 2) {
        lx = deadzone(gpL.axes[0] ?? 0);
        ly = deadzone(gpL.axes[1] ?? 0);
      } else if (gpR?.axes?.length >= 4) {
        // single-controller fallback
        lx = 0;
        ly = deadzone(gpR.axes[3] ?? 0);
      }

      if (lx || ly) {
        const yaw = player.rotation.y;
        const forward = (-ly) * MOVE_SPEED * dt;
        const strafe  = ( lx) * MOVE_SPEED * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Snap turn (RIGHT stick X): Quest usually uses axes[2] for right X
      snapCooldown = Math.max(0, snapCooldown - dt);
      let rx = 0;
      if (gpR?.axes?.length >= 4) rx = deadzone(gpR.axes[2] ?? 0, 0.25);
      else if (gpR?.axes?.length >= 1) rx = deadzone(gpR.axes[0] ?? 0, 0.25);

      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        player.rotation.y += (rx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCooldown = 0.28;
      }

      // Teleport ray + leap
      const canTeleport = updateTeleportRay();
      const pressed = isTeleportPressed(gpR);

      if (pressed && !lastTeleportPressed && canTeleport) {
        // one leap
        player.position.set(hit.x, 0, hit.z);
        LOG.push("log", `Teleport ✅ x=${hit.x.toFixed(2)} z=${hit.z.toFixed(2)}`);
      }
      lastTeleportPressed = pressed;

      setMetrics([
        ["FPS", `${fps}`],
        ["XR", "YES"],
        ["Rig", `${player.position.x.toFixed(1)},${player.position.z.toFixed(1)}`],
        ["Move", gpL ? "LEFT stick" : "RIGHT-Y fallback"],
        ["Snap", "RIGHT X 45°"],
        ["Laser", laser.visible ? "YES" : "NO"],
      ]);

    } else {
      laser.visible = false;
      ring.visible = false;
      lastTeleportPressed = false;

      setMetrics([
        ["FPS", `${fps}`],
        ["XR", "NO"],
        ["Rig", `${player.position.x.toFixed(1)},${player.position.z.toFixed(1)}`],
        ["Laser", "NO"],
      ]);
    }

    renderer.render(scene, camera);
  });
})();

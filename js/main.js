// /js/main.js — Scarlett Hybrid 4.4 (FULL REFINE)
// ✅ Cache-proof module loading (world.js cannot be stale)
// ✅ HUD buttons wired + always-on diagnostics
// ✅ Overkill lighting + headlamp
// ✅ Correct spawn facing (look-at hub/table)
// ✅ Teleport one leap per press
// ✅ Left stick move + Right stick 45° snap (Quest axis safe)

(async function boot() {
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  const BUILD = (window.__SCARLETT_BUILD__ ||= Date.now());
  console.log("SCARLETT_MAIN=4.4 BUILD=", BUILD);

  // -------------------------
  // HUD refs (index.html already has them)
  // -------------------------
  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnMenu: document.getElementById("btnMenu"),
    btnRoomLobby: document.getElementById("btnRoomLobby"),
    btnRoomStore: document.getElementById("btnRoomStore"),
    btnRoomScorpion: document.getElementById("btnRoomScorpion"),
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
    copy() {
      try { navigator.clipboard?.writeText?.(this.lines.join("\n")); this.push("log","Copied logs ✅"); }
      catch { this.push("warn","Clipboard not available"); }
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

  function safeNow() { return performance?.now?.() ?? Date.now(); }

  // -------------------------
  // THREE
  // -------------------------
  let THREE;
  try {
    const m = await import(`./three.js?v=${BUILD}`);
    THREE = m.default || m.THREE || m;
    LOG.push("log", "three via local wrapper ✅");
  } catch {
    THREE = await import("three");
    LOG.push("log", "three via importmap ✅");
  }

  // -------------------------
  // Scene / Camera / Renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1200);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Bright & predictable on Quest
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.15;
  renderer.physicallyCorrectLights = false;

  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // -------------------------
  // VRButton (cache-proof)
  // -------------------------
  const { VRButton } = await import(`./VRButton.js?v=${BUILD}`);
  document.body.appendChild(VRButton.createButton(renderer));
  LOG.push("log", "VRButton ✅");

  // -------------------------
  // Player Rig
  // -------------------------
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // Controllers parented to rig
  const controllerL = renderer.xr.getController(0); controllerL.name = "ControllerLeft";
  const controllerR = renderer.xr.getController(1); controllerR.name = "ControllerRight";
  player.add(controllerL, controllerR);
  LOG.push("log", "Controllers parented to PlayerRig ✅");

  // Hands parented to rig
  try {
    const leftHand = renderer.xr.getHand(0); leftHand.name = "XRHandLeft";
    const rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight";
    player.add(leftHand, rightHand);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (controller-only OK).");
  }

  // -------------------------
  // Overkill light pack
  // -------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a2a, 2.2));

  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(40, 90, 60);
  scene.add(sun);

  const headLamp = new THREE.PointLight(0xffffff, 2.2, 35);
  headLamp.position.set(0, 1.4, 0.35);
  camera.add(headLamp);

  // -------------------------
  // Context
  // -------------------------
  const ctx = {
    THREE, scene, camera, renderer,
    player, rig: player, yawObject: player, pitchObject: camera,
    LOG,
    BUILD,
    systems: {},
    colliders: [],
    world: null,
    room: "lobby",
    mode: "lobby"
  };

  // -------------------------
  // Cache-proof world import + signature enforcement
  // -------------------------
  const worldMod = await import(`./world.js?v=${BUILD}`);
  const World = worldMod?.World;
  if (!World?.init) {
    LOG.push("error", "world.js missing export World.init");
    return;
  }
  LOG.push("log", `world module loaded: ${World.VERSION || "no VERSION"}`);
  await World.init(ctx);
  ctx.world = World;

  // -------------------------
  // Spawn & face table (deterministic)
  // -------------------------
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  function forceSpawnAndFace() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    if (sp) {
      sp.getWorldPosition(tmpA);
      player.position.set(tmpA.x, 0, tmpA.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    // Always face hub/table (not the teleport machine)
    const target =
      scene.getObjectByName("BossTable") ||
      scene.getObjectByName("HubPlate") ||
      scene.getObjectByName("DealerAnchor");

    if (target) {
      target.getWorldPosition(tmpA);
      tmpB.set(player.position.x, 0, player.position.z);
      const v = tmpA.sub(tmpB); v.y = 0;

      if (v.lengthSq() > 1e-6) {
        const yaw = Math.atan2(v.x, v.z);
        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing table ✅ (BossTable)");
      }
    }
  }

  forceSpawnAndFace();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(forceSpawnAndFace, 160));

  // -------------------------
  // Room manager (optional)
  // -------------------------
  try {
    const rm = await import(`./room_manager.js?v=${BUILD}`);
    rm?.RoomManager?.init?.(ctx);
    LOG.push("log", "[rm] init ✅");
  } catch (e) {
    LOG.push("warn", `room_manager missing: ${e?.message || e}`);
  }

  // HUD buttons (desktop / android)
  ui.btnMenu?.addEventListener("click", () => LOG.push("log", "Menu button pressed"));
  ui.btnRoomLobby?.addEventListener("click", () => { ctx.room="lobby"; ctx.mode="lobby"; LOG.push("log","Room: Lobby"); });
  ui.btnRoomStore?.addEventListener("click", () => { ctx.room="store"; ctx.mode="store"; LOG.push("log","Room: Store"); });
  ui.btnRoomScorpion?.addEventListener("click", () => { ctx.room="scorpion"; ctx.mode="scorpion"; LOG.push("log","Room: Scorpion"); });

  // -------------------------
  // Teleport system (floor plane)
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.frustumCulled = false;
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function hubTarget() {
    return scene.getObjectByName("HubPlate") || scene.getObjectByName("BossTable") || null;
  }

  function updateTeleportRay() {
    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);
    if (o.lengthSq() < 0.0001) return false;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

    // bias slightly toward hub center
    const h = hubTarget();
    if (h) {
      const t = new THREE.Vector3();
      h.getWorldPosition(t);
      const toHub = t.sub(o).normalize();
      fwd.lerp(toHub, 0.30).normalize();
    }

    dir.copy(fwd);
    dir.y -= 0.35;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 35) return false;

    hit.copy(o).addScaledVector(dir, t);
    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  // -------------------------
  // Quest gamepad mapping
  // -------------------------
  function getGamepads() {
    const session = renderer.xr.getSession();
    if (!session) return { gpL: null, gpR: null };
    let gpL=null, gpR=null;
    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
    return { gpL, gpR };
  }

  const MOVE_SPEED = 1.10;          // slower (your request)
  const SNAP_ANGLE = Math.PI / 4;   // 45°
  let snapCooldown = 0;

  // Teleport one leap per press
  let lastTeleportPressed = false;

  // -------------------------
  // Main loop
  // -------------------------
  let last = safeNow();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  renderer.setAnimationLoop((t) => {
    const now = safeNow();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    try { ctx.world?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR } = getGamepads();

      // Move (left stick)
      if (gpL?.axes?.length >= 2) {
        const lx = gpL.axes[0] ?? 0;
        const ly = gpL.axes[1] ?? 0;

        const yaw = player.rotation.y;
        const forward = (-ly) * MOVE_SPEED * dt;
        const strafe  = ( lx) * MOVE_SPEED * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Snap turn (right stick X: axes[2] on Quest)
      snapCooldown = Math.max(0, snapCooldown - dt);
      const rx = (gpR?.axes?.length >= 4 ? (gpR.axes[2] ?? 0) : (gpR?.axes?.[0] ?? 0));

      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        player.rotation.y += (rx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCooldown = 0.28;
      }

      // Teleport
      const canTeleport = updateTeleportRay();
      const pressed = !!gpR?.buttons?.[0]?.pressed; // right trigger

      if (pressed && !lastTeleportPressed && canTeleport) {
        player.position.set(hit.x, 0, hit.z);
        LOG.push("log", `Teleport ✅ x=${hit.x.toFixed(2)} z=${hit.z.toFixed(2)}`);
      }
      lastTeleportPressed = pressed;
    } else {
      laser.visible = false;
      ring.visible = false;
      lastTeleportPressed = false;
    }

    setMetrics([
      ["Build", `${BUILD}`],
      ["FPS", `${fps}`],
      ["XR", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Pos", `${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}`],
      ["World", `${ctx.world?.VERSION || "?"}`],
      ["Room", `${ctx.room}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 4.4 boot complete ✅ (cache-proof + HUD wired + bright + 45° snap + 1-leap teleport)");
})();

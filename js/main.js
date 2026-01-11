// /js/main.js — Scarlett Hybrid 4.3 (FULL HUD DIAGNOSTICS + BUTTONS WORK)
// ✅ diagnostics grid + scroll log + copy/clear
// ✅ Soft reboot + Hard reset
// ✅ WebXR capability display
// ✅ Keeps: bright lighting, grid world, spawn faces BossTable, left move + right 45° snap, teleport one-leap

(async function boot() {
  console.log("SCARLETT_MAIN=4.3");

  // Prevent double-boot
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  // -------------------------
  // HUD references
  // -------------------------
  const ui = {
    grid: document.getElementById("scarlettGrid"),
    logBox: document.getElementById("scarlettLog"),
    capXR: document.getElementById("capXR"),
    capImm: document.getElementById("capImm"),
    btnSoftReboot: document.getElementById("btnSoftReboot"),
    btnHardReset: document.getElementById("btnHardReset"),
    btnCopy: document.getElementById("btnCopyLog"),
    btnClear: document.getElementById("btnClearLog"),
    btnRoomLobby: document.getElementById("btnRoomLobby"),
    btnRoomStore: document.getElementById("btnRoomStore"),
    btnRoomScorpion: document.getElementById("btnRoomScorpion"),
  };

  // -------------------------
  // LOG + diagnostics
  // -------------------------
  const LOG = {
    lines: [],
    max: 900,
    push(kind, msg) {
      const t = new Date().toLocaleTimeString();
      const line = `[${t}] ${kind.toUpperCase()}: ${msg}`;
      this.lines.push(line);
      if (this.lines.length > this.max) this.lines.splice(0, this.lines.length - this.max);
      if (ui.logBox) ui.logBox.textContent = this.lines.join("\n");
      if (kind === "error") console.error(msg);
      else if (kind === "warn") console.warn(msg);
      else console.log(msg);
    },
    clear() { this.lines = []; if (ui.logBox) ui.logBox.textContent = ""; },
    async copy() {
      const txt = this.lines.join("\n");
      try {
        await navigator.clipboard.writeText(txt);
        this.push("log", "Copied logs ✅");
      } catch {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = txt;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        this.push("log", "Copied logs (fallback) ✅");
      }
    }
  };

  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.LOG = LOG;

  addEventListener("error", (e) => LOG.push("error", `${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  addEventListener("unhandledrejection", (e) => LOG.push("error", `UnhandledPromiseRejection: ${e.reason?.message || e.reason}`));

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

  // Button wiring (guaranteed)
  ui.btnClear?.addEventListener("click", () => LOG.clear());
  ui.btnCopy?.addEventListener("click", () => LOG.copy());

  ui.btnSoftReboot?.addEventListener("click", () => {
    LOG.push("log", "Soft reboot…");
    location.reload();
  });

  // Hard reset: clears your local flags + reloads
  ui.btnHardReset?.addEventListener("click", () => {
    LOG.push("warn", "Hard reset… clearing runtime flags");
    try { delete window.__SCARLETT_BOOTED__; } catch {}
    try { delete window.SCARLETT; } catch {}
    location.reload();
  });

  // -------------------------
  // Import THREE (local first)
  // -------------------------
  const THREE = await (async () => {
    try { const m = await import("./three.js"); return m.default || m.THREE || m; }
    catch { const m = await import("three"); return m.default || m.THREE || m; }
  })();

  async function safeImport(url, label = url) {
    try { const m = await import(url); LOG.push("log", `import ok: ${label}`); return m; }
    catch (e) { LOG.push("warn", `import fail: ${label} — ${e?.message || e}`); return null; }
  }

  // -------------------------
  // Scene / camera / renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070912);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1600);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Bright Quest-friendly output
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 3.15;
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
    LOG.push("warn", "VRButton.js missing/invalid.");
  }

  // -------------------------
  // Player rig
  // -------------------------
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // -------------------------
  // OVERKILL LIGHT PACK
  // -------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2b2b45, 3.2));
  const sun = new THREE.DirectionalLight(0xffffff, 7.0);
  sun.position.set(60, 140, 80);
  scene.add(sun);

  const headLamp = new THREE.PointLight(0xffffff, 3.0, 45);
  headLamp.position.set(0, 1.4, 0.35);
  camera.add(headLamp);

  // -------------------------
  // Controllers + hands (parented to rig)
  // -------------------------
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  controllerL.name = "ControllerLeft";
  controllerR.name = "ControllerRight";
  player.add(controllerL, controllerR);
  LOG.push("log", "Controllers parented to PlayerRig ✅");

  try {
    const handL = renderer.xr.getHand(0);
    const handR = renderer.xr.getHand(1);
    handL.name = "XRHandLeft";
    handR.name = "XRHandRight";
    player.add(handL, handR);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (controller-only OK).");
  }

  // -------------------------
  // World
  // -------------------------
  const worldMod = await safeImport("./world.js", "./world.js");
  if (!worldMod?.World?.init) throw new Error("world.js missing World.init");

  const ctx = {
    THREE, scene, renderer, camera, player,
    systems: {},
    colliders: [],
    mode: "lobby",
    LOG
  };

  await worldMod.World.init(ctx);

  // -------------------------
  // Spawn: ALWAYS face BossTable
  // -------------------------
  const tmpP = new THREE.Vector3();
  const tmpT = new THREE.Vector3();

  function applySpawnFacingTable() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    const table = scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");

    if (sp) {
      sp.getWorldPosition(tmpP);
      player.position.set(tmpP.x, 0, tmpP.z);
      LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
    }

    if (table) {
      table.getWorldPosition(tmpT);
      const v = tmpT.sub(player.position);
      v.y = 0;
      if (v.lengthSq() > 1e-6) {
        const yaw = Math.atan2(v.x, v.z);
        player.rotation.set(0, yaw, 0);
        LOG.push("log", "Facing table ✅ (BossTable)");
      }
    }
  }

  applySpawnFacingTable();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnFacingTable, 170));

  // -------------------------
  // Optional: Room Manager for buttons
  // -------------------------
  const rm = await safeImport("./room_manager.js", "./room_manager.js");
  if (rm?.RoomManager?.init) {
    ctx.systems.room_manager = rm.RoomManager;
    rm.RoomManager.init(ctx);
    LOG.push("log", "[rm] init ✅");
  }

  function setRoom(room) {
    if (ctx.systems.room_manager?.setRoom) ctx.systems.room_manager.setRoom(ctx, room);
    else LOG.push("warn", `RoomManager missing; can't setRoom(${room})`);
  }

  ui.btnRoomLobby?.addEventListener("click", () => setRoom("lobby"));
  ui.btnRoomStore?.addEventListener("click", () => setRoom("store"));
  ui.btnRoomScorpion?.addEventListener("click", () => setRoom("scorpion"));

  // -------------------------
  // Teleport: ONE leap per press
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
  const fwd = new THREE.Vector3();
  const hubPos = new THREE.Vector3();
  const toHub = new THREE.Vector3();

  const getHub = () => scene.getObjectByName("HubPlate") || scene.getObjectByName("BossTable") || null;

  function updateTeleportRay() {
    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);
    if (o.lengthSq() < 0.0001) return false;

    fwd.set(0, 0, -1).applyQuaternion(q).normalize();

    const hub = getHub();
    if (hub) {
      hub.getWorldPosition(hubPos);
      toHub.copy(hubPos).sub(o).normalize();
      fwd.lerp(toHub, 0.28).normalize();
    }

    dir.copy(fwd);
    dir.y -= 0.38;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 40) return false;

    hit.copy(o).addScaledVector(dir, t);

    const dist = Math.max(0.2, Math.min(40, o.distanceTo(hit)));
    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-dist)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  function getGamepads() {
    const s = renderer.xr.getSession?.();
    if (!s) return { gpL: null, gpR: null };
    let gpL = null, gpR = null;
    for (const src of s.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
    return { gpL, gpR };
  }

  function teleportPressed(gpR) {
    if (!gpR?.buttons) return false;
    return !!(gpR.buttons[0]?.pressed || gpR.buttons[1]?.pressed || gpR.buttons[4]?.pressed || gpR.buttons[5]?.pressed);
  }

  // Locomotion
  const MOVE_L = 1.05;
  const MOVE_R = 1.00;
  const SNAP = Math.PI / 4; // 45°
  let snapCooldown = 0;
  let lastTeleport = false;

  // FPS
  let last = performance.now();
  let fpsAcc = 0, fpsCount = 0, fps = 0;

  // -------------------------
  // Main Loop
  // -------------------------
  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;

    fpsAcc += dt; fpsCount++;
    if (fpsAcc >= 0.5) { fps = Math.round(fpsCount / fpsAcc); fpsAcc = 0; fpsCount = 0; }

    try { worldMod.World?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR } = getGamepads();

      // Left stick move (Quest: axes 0,1)
      if (gpL?.axes?.length >= 2) {
        const lx = gpL.axes[0] ?? 0;
        const ly = gpL.axes[1] ?? 0;

        const yaw = player.rotation.y;
        const forward = (-ly) * MOVE_L * dt;
        const strafe  = ( lx) * MOVE_L * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Right stick forward/back solo (Quest: axes 3)
      if (gpR?.axes?.length >= 4) {
        const ry = gpR.axes[3] ?? 0;
        if (Math.abs(ry) > 0.12) {
          const yaw = player.rotation.y;
          const forward = (-ry) * MOVE_R * dt;
          player.position.x += Math.sin(yaw) * forward;
          player.position.z += Math.cos(yaw) * forward;
        }
      }

      // Right stick snap turn (Quest: axes 2)
      snapCooldown = Math.max(0, snapCooldown - dt);
      const rx = (gpR?.axes?.length >= 4) ? (gpR.axes[2] ?? 0) : (gpR?.axes?.[0] ?? 0);
      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        player.rotation.y += (rx > 0 ? -SNAP : SNAP);
        snapCooldown = 0.28;
      }

      // Teleport: one leap per press
      const canTeleport = updateTeleportRay();
      const pressed = teleportPressed(gpR);
      if (pressed && !lastTeleport && canTeleport) {
        player.position.set(hit.x, 0, hit.z);
        LOG.push("log", `Teleport ✅ x=${hit.x.toFixed(2)} z=${hit.z.toFixed(2)}`);
      }
      lastTeleport = pressed;
    } else {
      laser.visible = false;
      ring.visible = false;
      lastTeleport = false;
    }

    setMetrics([
      ["FPS", `${fps}`],
      ["XR Presenting", renderer.xr.isPresenting ? "YES" : "NO"],
      ["Rig (x,z)", `${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)}`],
      ["Yaw°", `${Math.round(THREE.MathUtils.radToDeg(player.rotation.y))}`],
      ["TeleportRay", ring.visible ? "ON" : "OFF"],
      ["Colliders", `${ctx.colliders?.length ?? 0}`],
    ]);

    renderer.render(scene, camera);
  });

  await setCaps();
  LOG.push("log", "Hybrid 4.3 boot complete ✅ (HUD diagnostics restored + buttons working)");
})();

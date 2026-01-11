// /js/main.js — Scarlett Hybrid 3.0 (FULL, PERMANENT DEBUG BUILD)
// Works with:
// ✅ your updated index.html (auto-hide HUD in VR + mini HUD toggle)
// ✅ /js/world.js v3.3+ (front room single exit + hub + statues)
// Fixes you asked for:
// ✅ Spawn facing: respects SpawnPoint.rotation when world sets useSpawnRotation
// ✅ Spawn “behind me” issue fixed (no more fighting yaw math)
// ✅ Teleport laser always hits FLOOR (uses ctx.floorY, default 0)
// ✅ Movement speed slowed + smooth (left stick move)
// ✅ Right stick snap turn at 45° (right controller stick)
// ✅ Single-controller fallback (if only one stick source exists)
// ✅ Controllers + hands stay parented to PlayerRig (no stuck-on-table)
// ✅ VR HUD auto-hides via events (scarlett_xr_start / scarlett_xr_end)
// ✅ Debug overlay fields supported (if index has them)

(async function boot() {
  console.log("HYBRID_MAIN=3.0");

  if (window.__SCARLETT_BOOTED__) throw new Error("Double boot prevented");
  window.__SCARLETT_BOOTED__ = true;

  // ---------- UI references (optional) ----------
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

  const DBG = window.__SCARLETT_DBG__ || null;

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

  // ---------- metrics ----------
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

  // ---------- imports ----------
  const THREE = await (async () => {
    try { const m = await import("./three.js"); return m.default || m.THREE || m; }
    catch { return await import("three"); }
  })();

  async function safeImport(url, label = url) {
    try { const m = await import(url); LOG.push("log", `import ok: ${label}`); return m; }
    catch (e) { LOG.push("warn", `import fail: ${label} — ${e?.message || e}`); return null; }
  }

  // ---------- scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  // ---------- rig + camera ----------
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1200);
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---------- VRButton ----------
  const vrb = await safeImport("./VRButton.js", "./VRButton.js");
  if (vrb?.VRButton?.createButton) {
    const btn = vrb.VRButton.createButton(renderer);
    btn.id = "VRButton";
    document.body.appendChild(btn);
    LOG.push("log", "VRButton ✅ via local VRButton.createButton()");
  } else {
    // fallback to addons if local missing
    const vrb2 = await safeImport("three/addons/webxr/VRButton.js", "three/addons/webxr/VRButton.js");
    if (vrb2?.VRButton?.createButton) {
      const btn = vrb2.VRButton.createButton(renderer);
      btn.id = "VRButton";
      document.body.appendChild(btn);
      LOG.push("log", "VRButton ✅ via three/addons");
    } else {
      LOG.push("warn", "VRButton not available (no Enter VR button will show).");
    }
  }

  // Notify index.html to auto-hide HUD in VR
  renderer.xr.addEventListener("sessionstart", () => window.dispatchEvent(new Event("scarlett_xr_start")));
  renderer.xr.addEventListener("sessionend",   () => window.dispatchEvent(new Event("scarlett_xr_end")));

  // ---------- ctx ----------
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
    floorY: 0
  };

  // ---------- world ----------
  const worldMod = await safeImport("./world.js", "./world.js");
  if (worldMod?.World?.init) {
    await worldMod.World.init(ctx);
    ctx.world = worldMod.World;
  } else {
    LOG.push("error", "world.js missing World.init");
  }

  // ---------- controllers + hands (parent to rig) ----------
  const controllerL = renderer.xr.getController(0);
  controllerL.name = "ControllerLeft";
  player.add(controllerL);

  const controllerR = renderer.xr.getController(1);
  controllerR.name = "ControllerRight";
  player.add(controllerR);

  LOG.push("log", "Controllers parented to PlayerRig ✅");

  let leftHand = null, rightHand = null;
  try {
    leftHand = renderer.xr.getHand(0); leftHand.name = "XRHandLeft"; player.add(leftHand);
    rightHand = renderer.xr.getHand(1); rightHand.name = "XRHandRight"; player.add(rightHand);
    LOG.push("log", "XRHands parented to PlayerRig ✅");
  } catch {
    LOG.push("warn", "XRHands unavailable (controller-only OK).");
  }

  // ---------- spawn & facing ----------
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();

  function applySpawn() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    if (!sp) {
      LOG.push("warn", "No SpawnPoint/SpawnPad found.");
      return;
    }

    sp.getWorldPosition(tmpV);
    player.position.set(tmpV.x, 0, tmpV.z);
    LOG.push("log", `Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);

    // ✅ Primary rule: if world authored a spawn rotation, use it. (Stops “facing wall” chaos.)
    if (sp.userData?.useSpawnRotation) {
      player.rotation.set(0, sp.rotation.y, 0);
      LOG.push("log", `Facing from SpawnPoint.rotation ✅ yaw=${THREE.MathUtils.radToDeg(sp.rotation.y).toFixed(0)}°`);
      return;
    }

    // Secondary: face a target if present
    const faceName = sp.userData?.faceTargetName || "HubPlate";
    const target = scene.getObjectByName(faceName) || scene.getObjectByName("BossTable") || scene.getObjectByName("HubPlate");
    if (!target) return;

    target.getWorldPosition(tmpV2);
    const from = new THREE.Vector3(player.position.x, 0, player.position.z);
    const to = new THREE.Vector3(tmpV2.x, 0, tmpV2.z);
    const v = to.sub(from);
    if (v.lengthSq() < 1e-6) return;

    const yaw = Math.atan2(v.x, v.z); // face target
    player.rotation.set(0, yaw, 0);
    LOG.push("log", "Facing target ✅");
  }

  applySpawn();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawn, 220));

  // ---------- optional modules ----------
  const gestureMod = await safeImport("./gesture_engine.js", "./gesture_engine.js");
  const betMod = await safeImport("./betting_module.js", "./betting_module.js");

  const GestureEngine = gestureMod?.GestureEngine || null;
  const BettingModule = betMod?.BettingModule || null;

  if (GestureEngine?.init) GestureEngine.init({ THREE, renderer, scene, camera, log: (m) => LOG.push("log", m), LOG });
  if (!GestureEngine) LOG.push("warn", "GestureEngine missing -> pinch disabled (controller still works).");

  if (BettingModule?.init) BettingModule.init(ctx);
  if (!BettingModule) LOG.push("warn", "BettingModule missing -> betting disabled.");

  // ---------- teleport (floor plane y = ctx.floorY) ----------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(ctx.floorY || 0));

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
  const q = new THREE.Quaternion();

  function controllerPoseValid(ctrl) {
    ctrl.getWorldPosition(o);
    // Reject origin-ish poses that cause lasers to appear “through walls somewhere”
    return o.lengthSq() > 0.02 && Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.z);
  }

  function updateTeleportRay() {
    if (!controllerPoseValid(controllerR)) return { ok: false, src: "pose-bad" };

    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);

    d.set(0, 0, -1).applyQuaternion(q).normalize();
    // slight down tilt so it hits floor in small rooms
    d.y -= 0.20;
    d.normalize();

    const denom = floorPlane.normal.dot(d);
    if (Math.abs(denom) < 1e-6) return { ok: false, src: "parallel" };

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.15 || t > 40) return { ok: false, src: "range" };

    hit.copy(o).addScaledVector(d, t);

    const dist = THREE.MathUtils.clamp(o.distanceTo(hit), 0.2, 40);
    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-dist)]);

    ring.position.set(hit.x, (ctx.floorY || 0) + 0.02, hit.z);
    ring.visible = true;

    return { ok: true, point: hit.clone(), src: "plane" };
  }

  function teleportTo(point) {
    player.position.set(point.x, 0, point.z);
    LOG.push("log", `Teleport ✅ x=${point.x.toFixed(2)} z=${point.z.toFixed(2)}`);
  }

  // ---------- gamepad mapping (left move, right snap 45°) ----------
  function getInputSources() {
    const s = renderer.xr.getSession?.();
    return s ? Array.from(s.inputSources || []) : [];
  }

  function findGamepad(handedness) {
    const srcs = getInputSources();
    for (const src of srcs) if (src.gamepad && src.handedness === handedness) return src.gamepad;
    return null;
  }

  function readAxes(gp) {
    if (!gp?.axes) return [0,0,0,0];
    const a = gp.axes;
    // Many XR gamepads provide 4 axes; some provide 2.
    const ax0 = a[0] ?? 0;
    const ax1 = a[1] ?? 0;
    const ax2 = a[2] ?? ax0;
    const ax3 = a[3] ?? ax1;
    return [ax0, ax1, ax2, ax3];
  }

  function readButtons(gp) {
    if (!gp?.buttons) return "";
    // show first 6 buttons pressed states for debug
    const b = gp.buttons;
    let s = "";
    for (let i = 0; i < Math.min(6, b.length); i++) s += b[i]?.pressed ? "1" : "0";
    return s || "";
  }

  function teleportPressed() {
    const srcs = getInputSources();
    for (const src of srcs) {
      const gp = src.gamepad;
      if (!gp?.buttons) continue;
      const b = gp.buttons;
      // A/X/trigger/grip often maps here depending on browser
      if (b[0]?.pressed || b[1]?.pressed || b[4]?.pressed || b[5]?.pressed) return true;
    }
    return false;
  }

  // ---------- movement tuning ----------
  const move = {
    speed: 1.15,          // ✅ slower
    dead: 0.18,
    snapDeg: 45,          // ✅ 45° requested
    snapCooldown: 0
  };

  // pinch-to-teleport queue (optional)
  let queuedTeleport = false;
  if (GestureEngine?.on) GestureEngine.on("pinchstart", (e) => { if (e.hand === "right") queuedTeleport = true; });

  // ---------- keyboard fallback (desktop debug) ----------
  const keys = new Set();
  addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  // ---------- loop ----------
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
    try { BettingModule?.update?.(ctx, dt); } catch {}

    // Keep floor plane updated if world changes floorY
    floorPlane.constant = -(ctx.floorY || 0);

    const presenting = renderer.xr.isPresenting;

    // Update gesture engine
    if (presenting) {
      try { GestureEngine?.update?.(frame, renderer.xr.getReferenceSpace?.()); } catch {}
    }

    // --- movement (VR) ---
    let leftGP = presenting ? findGamepad("left") : null;
    let rightGP = presenting ? findGamepad("right") : null;

    // Single-controller fallback
    if (presenting && !leftGP && rightGP) leftGP = rightGP;
    if (presenting && !rightGP && leftGP) rightGP = leftGP;

    // left stick move
    if (presenting && leftGP) {
      const [ax0, ax1, ax2, ax3] = readAxes(leftGP);

      // Prefer axes[2],[3] if present; otherwise use [0],[1]
      let mx = (leftGP.axes?.length >= 4) ? ax2 : ax0;
      let my = (leftGP.axes?.length >= 4) ? ax3 : ax1;

      // invert Y so up = forward
      my = -my;

      const mag = Math.hypot(mx, my);
      if (mag > move.dead) {
        // normalize after deadzone
        const nx = mx / mag;
        const ny = my / mag;

        const yaw = player.rotation.y;
        const sin = Math.sin(yaw), cos = Math.cos(yaw);

        // forward/back + strafe
        player.position.x += (nx * cos + ny * sin) * move.speed * dt;
        player.position.z += (ny * cos - nx * sin) * move.speed * dt;
      }
    }

    // right stick snap turn 45°
    if (presenting && rightGP) {
      move.snapCooldown = Math.max(0, move.snapCooldown - dt);

      const [ax0, ax1, ax2, ax3] = readAxes(rightGP);
      const tx = (rightGP.axes?.length >= 4) ? ax2 : ax0;

      if (move.snapCooldown <= 0 && Math.abs(tx) > 0.78) {
        const dir = (tx > 0) ? -1 : 1;
        player.rotation.y += THREE.MathUtils.degToRad(move.snapDeg) * dir;
        move.snapCooldown = 0.28;
      }
    }

    // --- desktop WASD (non-VR) ---
    if (!presenting) {
      const yaw = player.rotation.y;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const speed = 1.3;

      let forward = 0, strafe = 0;
      if (keys.has("w")) forward += 1;
      if (keys.has("s")) forward -= 1;
      if (keys.has("a")) strafe -= 1;
      if (keys.has("d")) strafe += 1;

      if (forward || strafe) {
        player.position.x += (strafe * cos + forward * sin) * speed * dt;
        player.position.z += (forward * cos - strafe * sin) * speed * dt;
      }

      if (keys.has("q")) player.rotation.y += THREE.MathUtils.degToRad(60) * dt;
      if (keys.has("e")) player.rotation.y -= THREE.MathUtils.degToRad(60) * dt;
    }

    // --- teleport ---
    let ray = { ok: false };
    if (presenting) {
      ray = updateTeleportRay();
      laser.visible = ray.ok;
      ring.visible = ray.ok;

      if ((queuedTeleport || teleportPressed()) && ray.ok) {
        queuedTeleport = false;
        teleportTo(ray.point);
      }
    } else {
      laser.visible = false;
      ring.visible = false;
    }

    // --- Room label (simple heuristic based on rig position) ---
    // (Front room is +Z, hub around 0, left is -X, right is +X, back is -Z)
    const px = player.position.x;
    const pz = player.position.z;
    let room = "unknown";
    const hubR = 16;
    if (Math.hypot(px, pz) < hubR) room = "hub";
    else if (pz > hubR) room = "front";
    else if (pz < -hubR) room = "back";
    else if (px < -hubR) room = "left";
    else if (px > hubR) room = "right";

    // --- Debug HUD updates ---
    if (DBG?.set && DBG?.pill) {
      DBG.pill("dbgPose", controllerPoseValid(controllerR), controllerPoseValid(controllerR) ? "pose: OK" : "pose: BAD");
      DBG.pill("dbgRoom", true, `room: ${room}`);

      DBG.set("dbgFloorY", `${(ctx.floorY || 0).toFixed(2)}`);
      DBG.set("dbgTeleHit", ray?.ok ? `${ray.point.x.toFixed(1)},${ray.point.z.toFixed(1)}` : "-");

      const axR = rightGP ? readAxes(rightGP) : [0,0,0,0];
      const axL = leftGP ? readAxes(leftGP) : [0,0,0,0];

      DBG.set("dbgAxesR", rightGP ? axR.map(v => (v||0).toFixed(2)).join(",") : "-");
      DBG.set("dbgAxesL", leftGP  ? axL.map(v => (v||0).toFixed(2)).join(",") : "-");
      DBG.set("dbgBtnsR", rightGP ? readButtons(rightGP) : "-");
      DBG.set("dbgBtnsL", leftGP  ? readButtons(leftGP)  : "-");

      DBG.set("dbgRig", `${px.toFixed(1)},${pz.toFixed(1)}`);
      DBG.set("dbgYaw", `${THREE.MathUtils.radToDeg(player.rotation.y).toFixed(0)}`);
    }

    // compact grid metrics (legacy)
    setMetrics([
      ["FPS", `${fps}`],
      ["XR", presenting ? "YES" : "NO"],
      ["Room", room],
      ["Rig", `${px.toFixed(1)},${pz.toFixed(1)}`],
      ["Yaw°", `${THREE.MathUtils.radToDeg(player.rotation.y).toFixed(0)}`],
      ["FloorY", `${(ctx.floorY || 0).toFixed(2)}`],
      ["ControllersInRig", (controllerR.parent === player) ? "YES" : "NO"],
      ["Modules", `gesture=${!!GestureEngine} bet=${!!BettingModule}`],
    ]);

    renderer.render(scene, camera);
  });

  // ---------- optional buttons (won't break if missing) ----------
  ui.btnMenu?.addEventListener("click", () => LOG.push("log", "Menu pressed (M)"));
  ui.btnRoomLobby?.addEventListener("click", () => LOG.push("log", "Room: Lobby (not wired yet)"));
  ui.btnRoomStore?.addEventListener("click", () => LOG.push("log", "Room: Store (not wired yet)"));
  ui.btnRoomScorpion?.addEventListener("click", () => LOG.push("log", "Room: Scorpion (not wired yet)"));

  await setCaps();
  LOG.push("log", "Hybrid 3.0 boot complete ✅ (spawn rotation respected, floor teleport fixed, slow move + 45° snap)");
})();

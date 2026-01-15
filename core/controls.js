// /js/core/controls.js — Scarlett Core Controls v3.0 (XR + Android + Desktop)
// ✅ XR Controllers: lasers + teleport + snap turn (Quest)
// ✅ Hands can exist; controllers take over automatically when present
// ✅ Android (non-XR): dual-stick move + look
// ✅ Desktop: WASD + arrows, mouse optional (light)
// ✅ BOOT2-safe exports: initControls(), init(), default
//
// BOOT2 expected usage (typical):
//   const Controls = await import("/js/core/controls.js");
//   const controls = await Controls.init({ THREE, renderer, scene, camera, playerRig, world, log });
//   // in loop: controls.update(dt)

export function initControls(ctx = {}) {
  const {
    THREE,
    renderer,
    scene,
    camera,
    playerRig,
    world,
    log = (...a) => console.log("[controls]", ...a),
    options = {}
  } = ctx;

  if (!THREE || !renderer || !scene || !camera || !playerRig) {
    throw new Error("[controls] initControls missing required params {THREE, renderer, scene, camera, playerRig}");
  }

  // -----------------------
  // Config
  // -----------------------
  const cfg = {
    // XR
    xrMaxRay: 30,
    xrSnapDeg: 30,
    xrSnapCooldown: 0.25,
    xrTeleportKeepY: true,

    // Movement
    moveSpeed: 2.2,        // meters/sec
    runSpeed: 4.0,
    lookSpeed: 1.8,

    // Android stick UI
    sticksEnabled: true,

    ...options
  };

  const state = {
    enabled: true,
    inXR: false,

    // XR controllers
    xr: {
      controllers: [null, null],
      lines: [null, null],
      raycasters: [null, null],
      lastHit: [null, null],
      lastSnapT: 999,
      tmpMat: new THREE.Matrix4(),
      tmpDir: new THREE.Vector3(),
      tmpPos: new THREE.Vector3(),
      tmpV: new THREE.Vector3()
    },

    // Teleport targets
    teleportSurfaces: [],
    teleportPads: [],

    // Desktop keys
    keys: new Set(),
    shift: false,

    // Android sticks
    sticks: {
      active: false,
      left: { id: null, x: 0, y: 0, dx: 0, dy: 0, el: null, knob: null },
      right:{ id: null, x: 0, y: 0, dx: 0, dy: 0, el: null, knob: null },
      root: null
    },

    // Timing
    t: performance.now()
  };

  // -----------------------
  // Helpers
  // -----------------------
  function getSession() {
    return renderer.xr?.getSession?.() || null;
  }

  function refreshTeleportTargets() {
    state.teleportSurfaces.length = 0;
    state.teleportPads.length = 0;

    if (world?.teleportSurfaces?.length) state.teleportSurfaces.push(...world.teleportSurfaces);
    if (world?.pads?.length) state.teleportPads.push(...world.pads);

    // fallback: scan for userData.teleportSurface
    if (state.teleportSurfaces.length === 0 && world?.group) {
      world.group.traverse((o) => {
        if (o?.isMesh && o.userData?.teleportSurface) state.teleportSurfaces.push(o);
      });
    }

    log("teleport targets", "surfaces=", state.teleportSurfaces.length, "pads=", state.teleportPads.length);
  }

  function getRigYaw() {
    // camera might be offset; rig yaw is authoritative
    return playerRig.rotation.y;
  }

  function getCameraYaw() {
    // yaw from camera world direction
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return Math.atan2(dir.x, dir.z); // note: x,z swapped for yaw
  }

  function moveRigXZ(vx, vz, dt) {
    playerRig.position.x += vx * dt;
    playerRig.position.z += vz * dt;
  }

  // -----------------------
  // XR: build lasers + teleport
  // -----------------------
  function makeLaserLine() {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -cfg.xrMaxRay)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x55aaff });
    const line = new THREE.Line(geo, mat);
    line.name = "XR_Laser";
    line.scale.z = 1;
    return line;
  }

  function getRayOriginDir(controller) {
    // forward is -Z in controller local space
    state.xr.tmpMat.identity().extractRotation(controller.matrixWorld);
    state.xr.tmpDir.set(0, 0, -1).applyMatrix4(state.xr.tmpMat).normalize();
    state.xr.tmpPos.setFromMatrixPosition(controller.matrixWorld);
    return { origin: state.xr.tmpPos, dir: state.xr.tmpDir };
  }

  function intersectTeleport(i) {
    const c = state.xr.controllers[i];
    const rc = state.xr.raycasters[i];
    if (!c || !rc) return null;

    const { origin, dir } = getRayOriginDir(c);
    rc.set(origin, dir);
    rc.far = cfg.xrMaxRay;

    // pads first
    if (state.teleportPads.length) {
      const hits = rc.intersectObjects(state.teleportPads, true);
      if (hits?.length) return { type: "pad", hit: hits[0] };
    }

    // surfaces
    if (state.teleportSurfaces.length) {
      const hits = rc.intersectObjects(state.teleportSurfaces, true);
      if (hits?.length) return { type: "floor", hit: hits[0] };
    }

    return null;
  }

  function setLaserVisual(i, res) {
    const line = state.xr.lines[i];
    if (!line) return;

    if (!res) {
      line.visible = true;
      line.scale.z = 1;
      state.xr.lastHit[i] = null;
      return;
    }

    const d = res.hit.distance || cfg.xrMaxRay;
    line.visible = true;
    line.scale.z = Math.max(0.05, d / cfg.xrMaxRay);
    state.xr.lastHit[i] = res;
  }

  function teleportTo(vec3) {
    // keep Y unless we want to drop onto target Y
    const y = cfg.xrTeleportKeepY ? playerRig.position.y : vec3.y;
    playerRig.position.set(vec3.x, y, vec3.z);
  }

  function onSelectStart(i) {
    const res = state.xr.lastHit[i];
    if (!res) return;

    if (res.type === "pad") {
      // climb parents until pad root
      let n = res.hit.object;
      while (n && !n.userData?.teleport) n = n.parent;
      if (n?.userData?.target) {
        teleportTo(n.userData.target);
        return;
      }
    }

    teleportTo(res.hit.point);
  }

  function setupXRControllers() {
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      c.name = `XR_Controller_${i}`;
      scene.add(c);

      const line = makeLaserLine();
      c.add(line);

      const rc = new THREE.Raycaster();
      rc.far = cfg.xrMaxRay;

      // attach select event
      c.addEventListener("selectstart", () => onSelectStart(i));

      state.xr.controllers[i] = c;
      state.xr.lines[i] = line;
      state.xr.raycasters[i] = rc;
    }
    log("XR controllers installed ✅");
  }

  function teardownXRControllers() {
    for (let i = 0; i < 2; i++) {
      const c = state.xr.controllers[i];
      if (!c) continue;
      scene.remove(c);
      state.xr.controllers[i] = null;
      state.xr.lines[i] = null;
      state.xr.raycasters[i] = null;
      state.xr.lastHit[i] = null;
    }
    log("XR controllers removed ✅");
  }

  function applyXRSnapTurn(dt) {
    state.xr.lastSnapT += dt;

    const session = getSession();
    if (!session) return;

    // Find any gamepad x axis
    const sources = session.inputSources || [];
    let xAxis = 0;

    for (const src of sources) {
      const gp = src?.gamepad;
      if (!gp?.axes?.length) continue;
      xAxis = gp.axes[0] ?? 0; // left stick X usually
      if (Math.abs(xAxis) > 0.65) break;
    }

    if (Math.abs(xAxis) < 0.65) return;
    if (state.xr.lastSnapT < cfg.xrSnapCooldown) return;

    state.xr.lastSnapT = 0;
    const angle = THREE.MathUtils.degToRad(cfg.xrSnapDeg);
    const dir = xAxis > 0 ? -1 : 1;
    playerRig.rotation.y += angle * dir;
  }

  // XR session hooks (this is the piece most cores forget)
  function bindXRSessionEvents() {
    renderer.xr.addEventListener("sessionstart", () => {
      state.inXR = true;
      refreshTeleportTargets();
      setupXRControllers();
      log("XR session start ✅");
    });

    renderer.xr.addEventListener("sessionend", () => {
      state.inXR = false;
      teardownXRControllers();
      log("XR session end ✅");
    });
  }

  // -----------------------
  // Android sticks (non-XR)
  // -----------------------
  function buildSticksUI() {
    if (!cfg.sticksEnabled) return;
    if (state.sticks.root) return;

    const root = document.createElement("div");
    root.style.position = "fixed";
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.pointerEvents = "none";
    root.style.zIndex = "99999";
    root.id = "scarlett-sticks";
    document.body.appendChild(root);
    state.sticks.root = root;

    function makeStick(side) {
      const pad = document.createElement("div");
      pad.style.position = "absolute";
      pad.style.bottom = "8%";
      pad.style.width = "170px";
      pad.style.height = "170px";
      pad.style.borderRadius = "999px";
      pad.style.background = "rgba(0,0,0,0.25)";
      pad.style.border = "2px solid rgba(255,255,255,0.18)";
      pad.style.pointerEvents = "auto";
      pad.style.touchAction = "none";
      pad.style.userSelect = "none";
      pad.style.webkitUserSelect = "none";

      if (side === "left") pad.style.left = "6%";
      else pad.style.right = "6%";

      const knob = document.createElement("div");
      knob.style.position = "absolute";
      knob.style.left = "50%";
      knob.style.top = "50%";
      knob.style.width = "70px";
      knob.style.height = "70px";
      knob.style.transform = "translate(-50%,-50%)";
      knob.style.borderRadius = "999px";
      knob.style.background = "rgba(85,170,255,0.25)";
      knob.style.border = "2px solid rgba(85,170,255,0.45)";
      pad.appendChild(knob);

      root.appendChild(pad);
      return { pad, knob };
    }

    const L = makeStick("left");
    const R = makeStick("right");

    state.sticks.left.el = L.pad;
    state.sticks.left.knob = L.knob;
    state.sticks.right.el = R.pad;
    state.sticks.right.knob = R.knob;

    const bindStick = (stick) => {
      const el = stick.el;
      const knob = stick.knob;

      function setKnob(dx, dy) {
        // clamp to circle radius 55
        const r = 55;
        const len = Math.hypot(dx, dy);
        if (len > r) {
          dx = (dx / len) * r;
          dy = (dy / len) * r;
        }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        stick.dx = dx / r;
        stick.dy = dy / r;
      }

      el.addEventListener("pointerdown", (e) => {
        stick.id = e.pointerId;
        el.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        stick.x = rect.left + rect.width / 2;
        stick.y = rect.top + rect.height / 2;
        setKnob(e.clientX - stick.x, e.clientY - stick.y);
      });

      el.addEventListener("pointermove", (e) => {
        if (stick.id !== e.pointerId) return;
        setKnob(e.clientX - stick.x, e.clientY - stick.y);
      });

      function end(e) {
        if (stick.id !== e.pointerId) return;
        stick.id = null;
        setKnob(0, 0);
      }

      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("lostpointercapture", () => {
        stick.id = null;
        setKnob(0, 0);
      });
    };

    bindStick(state.sticks.left);
    bindStick(state.sticks.right);

    log("Android sticks UI READY ✅");
  }

  function showSticks(yes) {
    if (!state.sticks.root) return;
    state.sticks.root.style.display = yes ? "block" : "none";
  }

  // -----------------------
  // Desktop keyboard
  // -----------------------
  function bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      state.keys.add(e.code);
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") state.shift = true;
    });
    window.addEventListener("keyup", (e) => {
      state.keys.delete(e.code);
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") state.shift = false;
    });
  }

  // -----------------------
  // Update loops
  // -----------------------
  function updateXR(dt) {
    // update rays + lasers
    for (let i = 0; i < 2; i++) {
      const c = state.xr.controllers[i];
      const line = state.xr.lines[i];
      if (!c || !line) continue;

      const res = intersectTeleport(i);
      setLaserVisual(i, res);
    }

    applyXRSnapTurn(dt);
  }

  function updateAndroid(dt) {
    if (!cfg.sticksEnabled) return;

    const lx = state.sticks.left.dx;
    const ly = state.sticks.left.dy;   // forward is -dy (screen up is negative)
    const rx = state.sticks.right.dx;
    const ry = state.sticks.right.dy;

    // Look with right stick (yaw only)
    if (Math.abs(rx) > 0.06) {
      playerRig.rotation.y += (-rx) * cfg.lookSpeed * dt;
    }

    // Move with left stick relative to camera yaw (or rig yaw)
    const forward = -ly;
    const strafe = lx;

    const yaw = getRigYaw();
    const s = Math.sin(yaw);
    const c = Math.cos(yaw);

    const speed = cfg.moveSpeed;
    const vx = (strafe * c + forward * s) * speed;
    const vz = (forward * c - strafe * s) * speed;

    if (Math.abs(vx) > 0.001 || Math.abs(vz) > 0.001) {
      moveRigXZ(vx, vz, dt);
    }
  }

  function updateDesktop(dt) {
    if (state.inXR) return;

    const speed = state.shift ? cfg.runSpeed : cfg.moveSpeed;

    const forward =
      (state.keys.has("KeyW") || state.keys.has("ArrowUp") ? 1 : 0) +
      (state.keys.has("KeyS") || state.keys.has("ArrowDown") ? -1 : 0);

    const strafe =
      (state.keys.has("KeyD") ? 1 : 0) +
      (state.keys.has("KeyA") ? -1 : 0);

    const turn =
      (state.keys.has("ArrowRight") ? -1 : 0) +
      (state.keys.has("ArrowLeft") ? 1 : 0);

    if (turn) playerRig.rotation.y += turn * cfg.lookSpeed * dt;

    if (!forward && !strafe) return;

    const yaw = getRigYaw();
    const s = Math.sin(yaw);
    const c = Math.cos(yaw);

    const vx = (strafe * c + forward * s) * speed;
    const vz = (forward * c - strafe * s) * speed;

    moveRigXZ(vx, vz, dt);
  }

  function update(dt = 0.016) {
    if (!state.enabled) return;

    // detect XR live session each frame
    const session = getSession();
    const nowInXR = !!session;
    if (nowInXR !== state.inXR) {
      // if session started/ended but events didn’t fire (rare), sync
      state.inXR = nowInXR;
      if (state.inXR) {
        refreshTeleportTargets();
        setupXRControllers();
      } else {
        teardownXRControllers();
      }
    }

    // show sticks only when not in XR
    showSticks(!state.inXR);

    if (state.inXR) updateXR(dt);
    else {
      updateAndroid(dt);
      updateDesktop(dt);
    }
  }

  function dispose() {
    state.enabled = false;
    teardownXRControllers();
    if (state.sticks.root) state.sticks.root.remove();
    state.sticks.root = null;
  }

  // -----------------------
  // Boot
  // -----------------------
  refreshTeleportTargets();
  bindXRSessionEvents();
  bindKeyboard();
  buildSticksUI();

  log("core controls ready ✅", "xr=", !!renderer.xr, "sticks=", !!state.sticks.root);

  return { update, dispose, refreshTeleportTargets, state };
}

// BOOT2 may call init()
export async function init(ctx = {}) {
  return initControls(ctx);
}

// Default export for compatibility
export default { initControls, init };

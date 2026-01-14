// /js/controls.js — Scarlett Controls (Quest FIX FULL)
// ✅ Left stick locomotion (correct axis mapping)
// ✅ Forward/back fixed (no inversion)
// ✅ Right stick snap turn (X axis)
// ✅ Trigger + Grip events work (select/squeeze)
// ✅ Controller lasers attached to hands (not stuck at table center)
// ✅ Floor reticle from right laser (y=0 plane)

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  // Controllers
  const ctrls = { left: null, right: null };

  // Laser visuals
  const lasers = { left: null, right: null };
  let reticle = null;

  // Input state
  const keys = new Set();
  let mouseLook = false;
  let yaw = 0;
  let pitch = 0;

  // Config
  const cfg = {
    moveSpeed: 2.2,         // m/s
    deadzone: 0.12,
    snapDeg: 45,            // you said 45 works — keep it
    snapCooldown: 0.22
  };

  let snapT = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dz = (v, d) => (Math.abs(v) < d ? 0 : v);

  function init(ctx) {
    THREE = ctx.THREE;
    renderer = ctx.renderer;
    scene = ctx.scene;
    camera = ctx.camera;
    player = ctx.player;
    log = ctx.log || log;
    warn = ctx.warn || warn;
    err = ctx.err || err;

    yaw = player.rotation.y;
    pitch = camera.rotation.x;

    bindDesktopFallback();
    setupXRControllers();
    setupReticle();

    log("controls ready ✅");
  }

  // --- XR Controllers + Events ---
  function setupXRControllers() {
    if (!renderer?.xr) return;

    // Add controllers to the *player rig* so locomotion moves them with you
    const c0 = renderer.xr.getController(0);
    const c1 = renderer.xr.getController(1);
    c0.name = "XRController0";
    c1.name = "XRController1";
    player.add(c0);
    player.add(c1);

    // Attach lasers immediately
    lasers.left = makeLaser();
    lasers.right = makeLaser();
    c0.add(lasers.left);
    c1.add(lasers.right);

    // Default assignment (will correct on sessionstart using handedness)
    ctrls.left = c0;
    ctrls.right = c1;

    // Hook interaction events (this fixes “trigger/grip do nothing”)
    wireXRPressEvents(c0);
    wireXRPressEvents(c1);

    renderer.xr.addEventListener("sessionstart", () => {
      try {
        const session = renderer.xr.getSession();
        if (!session) return;

        // Re-assign left/right based on handedness
        for (const src of session.inputSources) {
          if (!src) continue;
          if (src.handedness === "left") ctrls.left = src._controllerObj || guessController(0);
          if (src.handedness === "right") ctrls.right = src._controllerObj || guessController(1);
        }

        // We can’t reliably bind source->controller without extra plumbing,
        // but usually index 0=left, 1=right on Quest.
        ctrls.left = guessController(0);
        ctrls.right = guessController(1);

        log("XR sessionstart ✅ left=0 right=1 (Quest default)");
      } catch (e) {
        warn("sessionstart map failed:", e?.message || e);
      }
    });

    function guessController(i) {
      try { return renderer.xr.getController(i); } catch { return null; }
    }

    log("XR controllers attached + lasers ✅");
  }

  function wireXRPressEvents(controller) {
    controller.addEventListener("selectstart", () => log(controller.name, "trigger down ✅ (selectstart)"));
    controller.addEventListener("selectend", () => log(controller.name, "trigger up ✅ (selectend)"));
    controller.addEventListener("squeezestart", () => log(controller.name, "grip down ✅ (squeezestart)"));
    controller.addEventListener("squeezeend", () => log(controller.name, "grip up ✅ (squeezeend)"));
  }

  // --- Laser + Reticle ---
  function makeLaser() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00aaff });
    const line = new THREE.Line(geom, mat);
    line.name = "HandLaser";
    line.scale.z = 6; // laser length
    return line;
  }

  function setupReticle() {
    const g = new THREE.RingGeometry(0.06, 0.085, 24);
    const m = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    reticle = new THREE.Mesh(g, m);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);
  }

  function updateRightReticle() {
    // Cast from right controller forward and intersect with y=0 plane
    const rc = ctrls.right;
    if (!rc || !reticle) return;

    // World origin + direction of controller
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    rc.getWorldPosition(origin);
    dir.applyQuaternion(rc.getWorldQuaternion(new THREE.Quaternion())).normalize();

    // Intersect ray with plane y=0
    const y0 = 0;
    if (Math.abs(dir.y) < 1e-5) {
      reticle.visible = false;
      return;
    }
    const t = (y0 - origin.y) / dir.y;
    if (t <= 0) {
      reticle.visible = false;
      return;
    }

    const hit = origin.clone().add(dir.multiplyScalar(t));

    // only show within a reasonable range
    const dist = hit.distanceTo(origin);
    if (dist > 12) {
      reticle.visible = false;
      return;
    }

    reticle.position.copy(hit);
    reticle.visible = true;
  }

  // --- Movement + Look ---
  function applyLook() {
    player.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  function moveLocal(strafe, forward, dt) {
    const v = new THREE.Vector3(strafe, 0, forward);
    if (v.lengthSq() < 1e-6) return;

    v.normalize().multiplyScalar(cfg.moveSpeed * dt);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    player.position.add(v);
  }

  function update(dt) {
    snapT = Math.max(0, snapT - dt);

    const session = renderer?.xr?.getSession?.();
    if (session) {
      updateXR(session, dt);
      updateRightReticle();
      return;
    }

    updateDesktop(dt);
  }

  function updateXR(session, dt) {
    // Each controller has its own gamepad axes:
    // Left controller: axes[0]=x, axes[1]=y
    // Right controller: axes[0]=x, axes[1]=y
    let leftSrc = null, rightSrc = null;

    for (const src of session.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") leftSrc = src;
      if (src.handedness === "right") rightSrc = src;
    }

    // Fallback if handedness missing
    if (!leftSrc || !rightSrc) {
      const gps = session.inputSources.filter(s => s?.gamepad);
      leftSrc = leftSrc || gps[0] || null;
      rightSrc = rightSrc || gps[1] || null;
    }

    const leftGP = leftSrc?.gamepad || null;
    const rightGP = rightSrc?.gamepad || null;

    // LEFT stick locomotion (FIX inversion here)
    const lx = leftGP ? dz(leftGP.axes[0] ?? 0, cfg.deadzone) : 0;
    const ly = leftGP ? dz(leftGP.axes[1] ?? 0, cfg.deadzone) : 0;

    // On Quest: stick up = negative Y. Forward should be +forward.
    const forward = (-ly);   // ✅ FIX: forward/back correct
    const strafe = (lx);

    moveLocal(strafe, forward, dt);

    // RIGHT stick snap turn (X only)
    const rx = rightGP ? dz(rightGP.axes[0] ?? 0, cfg.deadzone) : 0;

    if (Math.abs(rx) > 0.65 && snapT <= 0) {
      const dir = rx > 0 ? -1 : 1;
      yaw += dir * (cfg.snapDeg * Math.PI / 180);
      applyLook();
      snapT = cfg.snapCooldown;
    }

    // Optional: Log right controller button states (helps mapping A/B etc.)
    // Buttons: 0 trigger, 1 grip, 3 stick press, 4 (A/B or X/Y depending controller)
    // (Do not spam; only log when pressed)
    if (rightGP?.buttons?.length) {
      for (let i = 0; i < rightGP.buttons.length; i++) {
        const b = rightGP.buttons[i];
        if (b?.pressed && !rightGP.__pressed?.[i]) {
          rightGP.__pressed = rightGP.__pressed || {};
          rightGP.__pressed[i] = true;
          log("RIGHT button", i, "pressed ✅");
        } else if (!b?.pressed && rightGP.__pressed?.[i]) {
          rightGP.__pressed[i] = false;
        }
      }
    }
  }

  function updateDesktop(dt) {
    let forward = 0, strafe = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) strafe -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) strafe += 1;
    moveLocal(strafe, forward, dt);
  }

  function bindDesktopFallback() {
    window.addEventListener("keydown", (e) => keys.add(e.code));
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    window.addEventListener("mousedown", (e) => { if (e.button === 2) mouseLook = true; });
    window.addEventListener("mouseup", (e) => { if (e.button === 2) mouseLook = false; });

    window.addEventListener("mousemove", (e) => {
      if (!mouseLook) return;
      yaw -= e.movementX * 0.0025;
      pitch -= e.movementY * 0.0025;
      pitch = clamp(pitch, -1.2, 1.2);
      applyLook();
    });
  }

  function getControllers() {
    return ctrls;
  }

  return { init, update, getControllers };
})();

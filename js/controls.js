// /js/controls.js — Scarlett Controls (FULL baseline)
// ✅ Quest: left stick move, right stick snap turn
// ✅ Desktop: WASD + RMB mouse look
// ✅ Mobile: 1-finger drag look, 2-finger drag move
// Exports: Controls { init(), update(), getControllers() }

export const Controls = (() => {
  let THREE, renderer, scene, camera, player;
  let log = console.log, warn = console.warn, err = console.error;

  // XR controllers (optional)
  let xrControllers = { left: null, right: null };

  // Desktop input
  const keys = new Set();
  let mouseLook = false;
  let yaw = 0;
  let pitch = 0;

  // Mobile touch
  let touch1 = null;
  let touch2 = null;

  // Movement config
  const cfg = {
    moveSpeed: 2.0,      // meters/sec
    turnSnapDeg: 30,     // snap degrees
    turnCooldown: 0.25,  // seconds
    deadzone: 0.15
  };

  let turnTimer = 0;

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

    // Seed yaw/pitch from current camera
    yaw = player.rotation.y;
    pitch = camera.rotation.x;

    bindDesktop();
    bindMobile();
    bindXRControllers();

    log("ready ✅");
  }

  function bindXRControllers() {
    if (!renderer?.xr) return;

    try {
      // Controller grips are optional; using getController for pose+gamepad
      const c0 = renderer.xr.getController(0);
      const c1 = renderer.xr.getController(1);

      c0.name = "XRController0";
      c1.name = "XRController1";

      player.add(c0);
      player.add(c1);

      // Map left/right dynamically later from handedness
      xrControllers.left = c0;
      xrControllers.right = c1;

      log("XR controllers attached ✅");
    } catch (e) {
      warn("XR controller attach failed:", e?.message || e);
    }

    // Re-map on session start (handedness info appears there)
    renderer.xr.addEventListener?.("sessionstart", () => {
      try {
        const session = renderer.xr.getSession();
        if (!session) return;
        // Attempt to map by handedness
        for (const src of session.inputSources) {
          if (!src?.gamepad) continue;
          if (src.handedness === "left") xrControllers.left = pickControllerForSource(src);
          if (src.handedness === "right") xrControllers.right = pickControllerForSource(src);
        }
        log("XR sessionstart ✅");
      } catch (e) {
        // ok
      }
    });

    function pickControllerForSource(src) {
      // We can’t directly map source->controller object without extra plumbing,
      // so we keep c0/c1 as best-effort. Movement still works.
      return src.handedness === "right" ? renderer.xr.getController(1) : renderer.xr.getController(0);
    }
  }

  function bindDesktop() {
    window.addEventListener("keydown", (e) => keys.add(e.code));
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    window.addEventListener("contextmenu", (e) => {
      // prevent long-press context menu from breaking look
      if (mouseLook) e.preventDefault();
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 2) { // RMB
        mouseLook = true;
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 2) mouseLook = false;
    });

    window.addEventListener("mousemove", (e) => {
      if (!mouseLook) return;
      yaw -= e.movementX * 0.0025;
      pitch -= e.movementY * 0.0025;
      pitch = clamp(pitch, -1.2, 1.2);
      applyLook();
    });
  }

  function bindMobile() {
    const getTouch = (t) => ({ id: t.identifier, x: t.clientX, y: t.clientY });

    window.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) touch1 = getTouch(e.touches[0]);
      if (e.touches.length >= 2) {
        touch1 = getTouch(e.touches[0]);
        touch2 = getTouch(e.touches[1]);
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && touch1) {
        const t = getTouch(e.touches[0]);
        const dx = t.x - touch1.x;
        const dy = t.y - touch1.y;

        yaw -= dx * 0.003;
        pitch -= dy * 0.003;
        pitch = clamp(pitch, -1.2, 1.2);
        applyLook();

        touch1 = t;
      } else if (e.touches.length >= 2 && touch1 && touch2) {
        const a = getTouch(e.touches[0]);
        const b = getTouch(e.touches[1]);

        // average movement for "move"
        const dx = ((a.x - touch1.x) + (b.x - touch2.x)) * 0.5;
        const dy = ((a.y - touch1.y) + (b.y - touch2.y)) * 0.5;

        // forward/back on dy, strafe on dx
        const forward = clamp(-dy / 200, -1, 1);
        const strafe = clamp(dx / 200, -1, 1);
        moveLocal(strafe, forward, 0.016); // approx; update() will also run

        touch1 = a;
        touch2 = b;
      }
    }, { passive: true });

    window.addEventListener("touchend", () => {
      touch1 = null;
      touch2 = null;
    }, { passive: true });
  }

  function applyLook() {
    player.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  function moveLocal(strafe, forward, dt) {
    const speed = cfg.moveSpeed;
    const v = new THREE.Vector3(strafe, 0, forward);
    if (v.lengthSq() < 1e-6) return;

    v.normalize().multiplyScalar(speed * dt);

    // Move relative to player yaw
    const m = new THREE.Matrix4().makeRotationY(player.rotation.y);
    v.applyMatrix4(m);

    player.position.add(v);
  }

  function update(dt) {
    turnTimer = Math.max(0, turnTimer - dt);

    // XR gamepad locomotion if in XR
    const session = renderer?.xr?.getSession?.();
    if (session) {
      updateXR(session, dt);
      return;
    }

    // Desktop fallback
    updateDesktop(dt);
  }

  function updateXR(session, dt) {
    // Find gamepads by handedness from session inputSources
    let leftGP = null, rightGP = null;

    for (const src of session.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") leftGP = src.gamepad;
      else if (src.handedness === "right") rightGP = src.gamepad;
    }

    // If handedness missing, just pick first two
    if (!leftGP || !rightGP) {
      const gps = session.inputSources.filter(s => s?.gamepad).map(s => s.gamepad);
      leftGP = leftGP || gps[0] || null;
      rightGP = rightGP || gps[1] || null;
    }

    // Typical Oculus mapping:
    // axes[2], axes[3] often left stick x,y; axes[2]/[3] OR axes[0]/[1] varies.
    // We'll try both patterns.
    const lx = leftGP ? dz(leftGP.axes[2] ?? leftGP.axes[0] ?? 0, cfg.deadzone) : 0;
    const ly = leftGP ? dz(leftGP.axes[3] ?? leftGP.axes[1] ?? 0, cfg.deadzone) : 0;

    // forward is -ly (stick up is negative)
    moveLocal(lx, -ly, dt);

    // Snap turn on right stick x
    const rx = rightGP ? dz(rightGP.axes[2] ?? rightGP.axes[0] ?? 0, cfg.deadzone) : 0;
    if (Math.abs(rx) > 0.6 && turnTimer <= 0) {
      const dir = rx > 0 ? -1 : 1;
      yaw += (dir * cfg.turnSnapDeg) * (Math.PI / 180);
      applyLook();
      turnTimer = cfg.turnCooldown;
    }
  }

  function updateDesktop(dt) {
    let forward = 0, strafe = 0;

    if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) strafe -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) strafe += 1;

    if (forward || strafe) moveLocal(strafe, forward, dt);
  }

  function getControllers() {
    return xrControllers;
  }

  return { init, update, getControllers };
})();

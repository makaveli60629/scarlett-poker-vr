// /js/input_hub.js — Scarlett Input Hub v1.0
// ✅ Quest/WebXR controllers (select/squeeze/thumbstick) + ray
// ✅ Android/desktop fallback: touch joystick + drag-to-look + WASD
// ✅ Debug HUD showing XR input + gamepad + locomotion state

export const InputHub = (() => {
  let THREE, renderer, scene, camera, player, log;

  const state = {
    enabled: true,
    isXR: false,
    controllers: { left: null, right: null },
    grips: { left: null, right: null },
    gp: { left: null, right: null },
    move: { x: 0, y: 0 },      // strafe, forward
    turn: 0,                  // snap/continuous
    teleport: { want: false, confirm: false },
    ui: { want: false },
    touch: {
      active: false,
      lookActive: false,
      joyId: null,
      lookId: null,
      joyStart: { x: 0, y: 0 },
      joyNow: { x: 0, y: 0 },
      lookStart: { x: 0, y: 0 },
      lookNow: { x: 0, y: 0 },
      move: { x: 0, y: 0 }
    },
    keys: new Set(),
    hud: null,
    hudLines: [],
    rays: { left: null, right: null }
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mkRay(color = 0x7fe7ff) {
    const geo = new THREE.CylinderGeometry(0.002, 0.002, 1, 8, 1, true);
    geo.translate(0, -0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = 999;
    return m;
  }

  function ensureHUD() {
    if (state.hud) return;
    const hud = document.createElement("div");
    hud.id = "scarlett-debug-hud";
    hud.style.cssText = `
      position:fixed; left:10px; top:10px; z-index:999999;
      background:rgba(8,10,16,.65); color:#e8ecff;
      padding:10px 12px; border-radius:12px;
      font:12px/1.25 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      max-width: 60vw; white-space: pre; pointer-events:none;
      border:1px solid rgba(127,231,255,.25);
    `;
    hud.textContent = "HUD…";
    document.body.appendChild(hud);
    state.hud = hud;
  }

  function hudSet(lines) {
    ensureHUD();
    state.hud.textContent = lines.join("\n");
  }

  function bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      state.keys.add(e.code);
      if (e.code === "KeyT") state.teleport.want = true;   // debug teleport request
      if (e.code === "KeyU") state.ui.want = true;         // debug UI toggle request
    });
    window.addEventListener("keyup", (e) => state.keys.delete(e.code));
  }

  function bindTouch() {
    // Touch move (left half) + touch look (right half)
    window.addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        const x = t.clientX, y = t.clientY;
        const isLeft = x < window.innerWidth * 0.5;
        if (isLeft && state.touch.joyId == null) {
          state.touch.joyId = t.identifier;
          state.touch.active = true;
          state.touch.joyStart.x = x; state.touch.joyStart.y = y;
          state.touch.joyNow.x = x; state.touch.joyNow.y = y;
        } else if (!isLeft && state.touch.lookId == null) {
          state.touch.lookId = t.identifier;
          state.touch.lookActive = true;
          state.touch.lookStart.x = x; state.touch.lookStart.y = y;
          state.touch.lookNow.x = x; state.touch.lookNow.y = y;
        }
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === state.touch.joyId) {
          state.touch.joyNow.x = t.clientX;
          state.touch.joyNow.y = t.clientY;
        }
        if (t.identifier === state.touch.lookId) {
          state.touch.lookNow.x = t.clientX;
          state.touch.lookNow.y = t.clientY;
        }
      }
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === state.touch.joyId) {
          state.touch.joyId = null;
          state.touch.active = false;
          state.touch.move.x = 0;
          state.touch.move.y = 0;
        }
        if (t.identifier === state.touch.lookId) {
          state.touch.lookId = null;
          state.touch.lookActive = false;
        }
      }
    }, { passive: true });
  }

  function bindXRControllers() {
    const xr = renderer.xr;

    function setupController(i) {
      const c = xr.getController(i);
      c.name = `xr_controller_${i}`;
      scene.add(c);

      const ray = mkRay(i === 0 ? 0x7fe7ff : 0xff2d7a);
      c.add(ray);

      const g = xr.getControllerGrip(i);
      g.name = `xr_grip_${i}`;
      scene.add(g);

      // Events
      c.addEventListener("selectstart", () => { state.teleport.want = true; });
      c.addEventListener("selectend", () => { state.teleport.confirm = true; });

      c.addEventListener("squeezestart", () => { state.ui.want = true; });
      c.addEventListener("squeezeend", () => { /* noop */ });

      return { c, g, ray };
    }

    const a0 = setupController(0);
    const a1 = setupController(1);

    state.rays.left = a0.ray;
    state.rays.right = a1.ray;

    // Assign left/right by handedness when XR input sources change
    const onSources = () => {
      state.isXR = true;
      const sources = xr.getSession()?.inputSources || [];

      state.controllers.left = null; state.controllers.right = null;
      state.grips.left = null; state.grips.right = null;

      // WebXR inputSources align to controller indices in most browsers, but we still map by handedness.
      sources.forEach((src, idx) => {
        const handed = src.handedness || (idx === 0 ? "left" : "right");
        const controller = idx === 0 ? a0.c : a1.c;
        const grip = idx === 0 ? a0.g : a1.g;

        if (handed === "left") { state.controllers.left = controller; state.grips.left = grip; }
        if (handed === "right") { state.controllers.right = controller; state.grips.right = grip; }
      });
    };

    xr.addEventListener("sessionstart", () => {
      onSources();
      xr.getSession()?.addEventListener("inputsourceschange", onSources);
      log?.("[input] XR sessionstart ✅ controllers wired");
    });

    xr.addEventListener("sessionend", () => {
      state.isXR = false;
      log?.("[input] XR sessionend");
    });
  }

  function readGamepads() {
    // For XR: pull axes from inputSources.gamepad
    const session = renderer.xr.getSession?.();
    if (!session) return;

    const sources = session.inputSources || [];
    state.gp.left = null;
    state.gp.right = null;

    for (const src of sources) {
      if (!src.gamepad) continue;
      const h = src.handedness || "none";
      if (h === "left") state.gp.left = src.gamepad;
      if (h === "right") state.gp.right = src.gamepad;
    }

    // Thumbstick move: prefer left stick
    const lgp = state.gp.left;
    if (lgp?.axes?.length >= 2) {
      const x = lgp.axes[0] || 0;
      const y = lgp.axes[1] || 0;
      state.move.x = clamp(x, -1, 1);
      state.move.y = clamp(-y, -1, 1);
    } else {
      state.move.x = 0;
      state.move.y = 0;
    }

    // Turn: right stick x
    const rgp = state.gp.right;
    if (rgp?.axes?.length >= 2) {
      state.turn = clamp(rgp.axes[0] || 0, -1, 1);
    } else {
      state.turn = 0;
    }
  }

  function readKeyboardAndTouch() {
    // WASD
    let mx = 0, my = 0;
    if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) mx -= 1;
    if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) mx += 1;
    if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) my += 1;
    if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) my -= 1;

    // Touch joystick
    if (state.touch.active) {
      const dx = state.touch.joyNow.x - state.touch.joyStart.x;
      const dy = state.touch.joyNow.y - state.touch.joyStart.y;
      const r = 70; // px
      state.touch.move.x = clamp(dx / r, -1, 1);
      state.touch.move.y = clamp(-dy / r, -1, 1);
    }

    // Blend keyboard + touch
    state.move.x = clamp(mx + state.touch.move.x, -1, 1);
    state.move.y = clamp(my + state.touch.move.y, -1, 1);
  }

  function applyNonXRLook(dt) {
    // Drag on right side rotates camera/player yaw/pitch
    if (!state.touch.lookActive) return;
    const dx = state.touch.lookNow.x - state.touch.lookStart.x;
    const dy = state.touch.lookNow.y - state.touch.lookStart.y;

    // Reset start each frame for smooth incremental drag
    state.touch.lookStart.x = state.touch.lookNow.x;
    state.touch.lookStart.y = state.touch.lookNow.y;

    const yawSpeed = 1.6;    // rad per screen width
    const pitchSpeed = 1.2;

    const yawDelta = (dx / window.innerWidth) * yawSpeed;
    const pitchDelta = (dy / window.innerHeight) * pitchSpeed;

    // rotate player (yaw) and camera (pitch)
    player.rotation.y -= yawDelta;

    camera.rotation.x = clamp(camera.rotation.x - pitchDelta, -1.2, 1.2);
  }

  function applyMovement(dt) {
    // This only moves the "player" object when NOT XR
    // In XR, you typically move your XR rig (player) the same way; so we keep it unified.
    const speed = state.isXR ? 1.8 : 2.4; // m/s
    const vx = state.move.x * speed * dt;
    const vz = state.move.y * speed * dt;

    if (Math.abs(vx) < 0.0001 && Math.abs(vz) < 0.0001) return;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    fwd.y = 0; fwd.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
    right.y = 0; right.normalize();

    player.position.addScaledVector(right, vx);
    player.position.addScaledVector(fwd, vz);
  }

  function applyTurn(dt) {
    // Turn on right stick in XR; in non-XR you can still use it if connected.
    const turnSpeed = 2.2; // rad/s
    if (Math.abs(state.turn) < 0.12) return;
    player.rotation.y -= state.turn * turnSpeed * dt;
  }

  function tick(dt) {
    if (!state.enabled) return;

    state.isXR = !!renderer.xr.getSession?.();

    if (state.isXR) {
      readGamepads();
    } else {
      readKeyboardAndTouch();
      applyNonXRLook(dt);
    }

    applyTurn(dt);
    applyMovement(dt);

    // HUD
    hudSet([
      `InputHub`,
      `XR: ${state.isXR ? "YES" : "no"}  enabled:${state.enabled}`,
      `move: x=${state.move.x.toFixed(2)} y=${state.move.y.toFixed(2)}  turn=${state.turn.toFixed(2)}`,
      `teleport: want=${state.teleport.want} confirm=${state.teleport.confirm}   ui=${state.ui.want}`,
      `GP L:${state.gp.left ? "yes" : "no"}  R:${state.gp.right ? "yes" : "no"}`,
      `Touch joy:${state.touch.active ? "on" : "off"} look:${state.touch.lookActive ? "on" : "off"}`
    ]);
  }

  function consumeActions() {
    // Call this from main/world to trigger your teleport/UI
    const out = {
      teleportWant: state.teleport.want,
      teleportConfirm: state.teleport.confirm,
      uiWant: state.ui.want
    };
    state.teleport.want = false;
    state.teleport.confirm = false;
    state.ui.want = false;
    return out;
  }

  return {
    init(opts) {
      ({ THREE, renderer, scene, camera, player, log } = opts);
      ensureHUD();
      bindKeyboard();
      bindTouch();
      bindXRControllers();
      log?.("[input] InputHub init ✅");
      return this;
    },
    tick,
    consumeActions,
    state
  };
})();

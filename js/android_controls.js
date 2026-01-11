// /js/android_controls.js — Touch Dual-Stick (Android/Non-XR diagnostic locomotion)
// ✅ ONLY runs when NOT in XR
// ✅ Doesn’t modify your VR pipeline
// ✅ Left stick = move, Right stick = look
// Usage:
//   const ac = AndroidControls.init({ renderer, player, camera, log });
//   in loop: ac.update(dt);

export const AndroidControls = (() => {
  function init({ renderer, player, camera, log = console.log }) {
    const state = {
      enabled: true,
      inXR: false,

      // movement tuning
      moveSpeed: 2.2,      // meters/sec
      strafeSpeed: 2.0,
      lookSpeed: 1.8,      // radians/sec scale
      dead: 0.08,

      // sticks
      left: makeStick("ac_left", 18, "Move"),
      right: makeStick("ac_right", 18, "Look"),

      yaw: 0,
      pitch: 0,

      // internal
      tmpV: null
    };

    state.tmpV = new (camera.constructor === Function ? camera.constructor : Object)(); // not used; harmless

    // Overlay container
    const root = document.createElement("div");
    root.id = "ac_root";
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "99998"
    });

    root.appendChild(state.left.el);
    root.appendChild(state.right.el);
    document.body.appendChild(root);

    // Disable selection/scroll while touching sticks
    const prevent = (e) => { e.preventDefault?.(); };
    root.addEventListener("touchmove", prevent, { passive: false });

    function setVisible(v) {
      const d = v ? "block" : "none";
      state.left.el.style.display = d;
      state.right.el.style.display = d;
    }

    // XR session toggles
    const onStart = () => {
      state.inXR = true;
      setVisible(false);
      log("[android] controls disabled (XR session)");
    };
    const onEnd = () => {
      state.inXR = false;
      setVisible(true);
      log("[android] controls enabled (non-XR)");
    };

    // These events exist even on phone; harmless.
    try {
      renderer.xr.addEventListener("sessionstart", onStart);
      renderer.xr.addEventListener("sessionend", onEnd);
    } catch {}

    // initial visibility
    setVisible(true);

    // Initialize yaw/pitch from current camera
    // We'll rotate PLAYER (yaw) and CAMERA (pitch) to avoid messing with rig transforms.
    state.yaw = player.rotation.y || 0;
    state.pitch = clamp(camera.rotation.x || 0, -1.2, 1.2);

    log("[android] dual-stick ready ✅");

    function update(dt) {
      if (!state.enabled) return;
      if (state.inXR) return; // never touch VR
      if (dt > 0.1) dt = 0.1;

      // --- LOOK (right stick) ---
      const rx = applyDead(state.right.value.x, state.dead);
      const ry = applyDead(state.right.value.y, state.dead);

      // x = yaw, y = pitch (invert y)
      state.yaw += rx * state.lookSpeed * dt;
      state.pitch += (-ry) * state.lookSpeed * dt;
      state.pitch = clamp(state.pitch, -1.2, 1.2);

      player.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;

      // --- MOVE (left stick) ---
      const mx = applyDead(state.left.value.x, state.dead);
      const my = applyDead(state.left.value.y, state.dead);

      // forward/back = -my, strafe = mx
      const forward = -my * state.moveSpeed * dt;
      const strafe = mx * state.strafeSpeed * dt;

      // movement in player yaw space
      const sin = Math.sin(state.yaw);
      const cos = Math.cos(state.yaw);

      // Forward vector (0,0,-1) rotated by yaw
      const dxF = sin * forward;
      const dzF = cos * forward;

      // Right vector (1,0,0) rotated by yaw
      const dxR = cos * strafe;
      const dzR = -sin * strafe;

      player.position.x += (dxF + dxR);
      player.position.z += (dzF + dzR);

      // Optional: keep head height stable for phone diagnostics
      if (player.position.y < 0) player.position.y = 0;
    }

    function destroy() {
      state.enabled = false;
      state.left.destroy();
      state.right.destroy();
      root.remove();
    }

    return { update, destroy, state };
  }

  function makeStick(id, margin, label) {
    const el = document.createElement("div");
    el.id = id;
    Object.assign(el.style, {
      position: "fixed",
      bottom: `${margin}px`,
      width: "160px",
      height: "160px",
      borderRadius: "999px",
      background: "rgba(0,0,0,.18)",
      border: "1px solid rgba(127,231,255,.22)",
      boxShadow: "0 12px 40px rgba(0,0,0,.35)",
      pointerEvents: "auto",
      touchAction: "none",
      userSelect: "none",
      WebkitUserSelect: "none"
    });

    // left or right placement
    if (id.includes("left")) el.style.left = `${margin}px`;
    else el.style.right = `${margin}px`;

    const cap = document.createElement("div");
    Object.assign(cap.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: "64px",
      height: "64px",
      borderRadius: "999px",
      transform: "translate(-50%,-50%)",
      background: "rgba(127,231,255,.14)",
      border: "1px solid rgba(127,231,255,.35)"
    });
    el.appendChild(cap);

    const txt = document.createElement("div");
    txt.textContent = label;
    Object.assign(txt.style, {
      position: "absolute",
      left: "0",
      right: "0",
      top: "-26px",
      textAlign: "center",
      fontSize: "12px",
      color: "rgba(232,236,255,.75)"
    });
    el.appendChild(txt);

    const value = { x: 0, y: 0 };
    let activeId = null;

    const rectCenter = () => {
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: r.width / 2 };
    };

    function setCap(nx, ny) {
      // clamp to circle
      const len = Math.hypot(nx, ny) || 0;
      const max = 0.85;
      if (len > max) { nx = nx / len * max; ny = ny / len * max; }
      value.x = nx;
      value.y = ny;

      cap.style.transform = `translate(-50%,-50%) translate(${nx * 60}px, ${ny * 60}px)`;
    }

    function onStart(e) {
      if (activeId !== null) return;
      const t = e.changedTouches[0];
      activeId = t.identifier;
      onMove(e);
    }

    function onMove(e) {
      if (activeId === null) return;
      const t = Array.from(e.touches).find(tt => tt.identifier === activeId);
      if (!t) return;
      const { cx, cy, radius } = rectCenter();
      const dx = (t.clientX - cx) / radius;
      const dy = (t.clientY - cy) / radius;
      setCap(dx, dy);
      e.preventDefault?.();
    }

    function onEnd(e) {
      if (activeId === null) return;
      const ended = Array.from(e.changedTouches).some(tt => tt.identifier === activeId);
      if (!ended) return;
      activeId = null;
      setCap(0, 0);
      e.preventDefault?.();
    }

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onEnd, { passive: false });

    return {
      el,
      value,
      destroy() {
        el.removeEventListener("touchstart", onStart);
        el.removeEventListener("touchmove", onMove);
        el.removeEventListener("touchend", onEnd);
        el.removeEventListener("touchcancel", onEnd);
        el.remove();
      }
    };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function applyDead(v, d) { return Math.abs(v) < d ? 0 : v; }

  return { init };
})();

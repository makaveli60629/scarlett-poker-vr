// /js/scarlett1/spine_android.js — Scarlett Android Sticks (FULL • SAFE • PERMANENT)
// ✅ Shows Android sticks on phones/tablets EVEN if navigator.xr=true
// ✅ Auto-hides ONLY when XR is ACTUALLY PRESENTING (Quest session)
// ✅ Renders ABOVE Scarlett Diagnostics HUD (z-index fix)
// ✅ Does NOT interfere with Oculus/Quest controls
//
// Usage (boot2 or world):
//   import { initAndroidSticks } from "./spine_android.js";
//   const android = initAndroidSticks({ THREE, camera, rig, renderer, onMove, onTurn, onAction, log });
//
// Required in your world:
//  - rig: the PlayerRig/group you move (camera parent)
//  - camera: THREE camera
//  - renderer: THREE.WebGLRenderer
//
// Optional callbacks:
//  - onMove({x,z, speed})    // continuous
//  - onTurn({yawDelta})      // continuous or snap
//  - onAction({type})        // "teleport" etc
//
// If you don't pass callbacks, module will apply movement to rig directly.

export function initAndroidSticks(opts = {}) {
  const {
    THREE,
    camera,
    rig,
    renderer,
    log = (...a) => console.log("[android]", ...a),

    // movement tuning
    moveSpeed = 1.65,        // meters/sec
    strafeSpeed = 1.35,      // meters/sec
    turnSpeed = 1.75,        // rad/sec
    deadZone = 0.12,

    // behavior
    snapTurn = false,
    snapAngleDeg = 45,
    showToggleButton = true,

    // callbacks
    onMove = null,
    onTurn = null,
    onAction = null,
  } = opts;

  if (!THREE || !camera || !rig || !renderer) {
    log("initAndroidSticks missing required {THREE,camera,rig,renderer} — skipping");
    return null;
  }

  // ---------------------------
  // XR Detection (FIX)
  // ---------------------------
  const ua = navigator.userAgent || "";
  const isQuestUA = /OculusBrowser|Quest|Oculus/i.test(ua);

  function isXRPresenting() {
    // IMPORTANT: we only hide sticks if XR is actually presenting,
    // not just supported (navigator.xr=true on Android Chrome).
    try {
      return !!(renderer && renderer.xr && renderer.xr.isPresenting === true && isQuestUA);
    } catch (e) {
      return false;
    }
  }

  // ---------------------------
  // DOM + Styles (Z-INDEX FIX)
  // ---------------------------
  const root = document.createElement("div");
  root.id = "scarlett_android_sticks";
  root.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 1000001; /* ABOVE Scarlett Diagnostics HUD */
  `;
  document.body.appendChild(root);

  const makePad = (side) => {
    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position: fixed;
      ${side === "left" ? "left: 16px" : "right: 16px"};
      bottom: 18px;
      width: 170px;
      height: 170px;
      pointer-events: none;
      z-index: 1000002;
    `;

    const base = document.createElement("div");
    base.style.cssText = `
      position: absolute;
      left: 0; top: 0;
      width: 170px; height: 170px;
      border-radius: 26px;
      background: rgba(20, 26, 44, 0.35);
      border: 1px solid rgba(120, 160, 255, 0.25);
      box-shadow: 0 14px 50px rgba(0,0,0,0.35);
      pointer-events: auto;
      touch-action: none;
      backdrop-filter: blur(6px);
    `;

    const nub = document.createElement("div");
    nub.style.cssText = `
      position: absolute;
      left: 50%; top: 50%;
      width: 74px; height: 74px;
      margin-left: -37px; margin-top: -37px;
      border-radius: 22px;
      background: rgba(70, 90, 140, 0.55);
      border: 1px solid rgba(180, 210, 255, 0.35);
      box-shadow: 0 10px 30px rgba(0,0,0,0.30);
      pointer-events: none;
    `;

    base.appendChild(nub);
    wrap.appendChild(base);
    root.appendChild(wrap);

    return { wrap, base, nub };
  };

  const left = makePad("left");
  const right = makePad("right");

  // optional toggle button (helps if you want to hide sticks to see world)
  let toggleBtn = null;
  const state = {
    visible: true,
    activeLeft: false,
    activeRight: false,
    leftId: null,
    rightId: null,
    leftVec: { x: 0, y: 0 },
    rightVec: { x: 0, y: 0 },
    lastSnapTime: 0,
  };

  if (showToggleButton && showToggleButton !== "off") {
    toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Hide Sticks";
    toggleBtn.style.cssText = `
      position: fixed;
      left: 16px;
      top: 80px;
      z-index: 1000003;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(120, 160, 255, 0.25);
      background: rgba(40, 60, 120, 0.55);
      color: #eaf2ff;
      font-weight: 800;
      letter-spacing: 0.2px;
      pointer-events: auto;
    `;
    toggleBtn.onclick = () => {
      state.visible = !state.visible;
      left.wrap.style.display = state.visible ? "block" : "none";
      right.wrap.style.display = state.visible ? "block" : "none";
      toggleBtn.textContent = state.visible ? "Hide Sticks" : "Show Sticks";
      log(`sticks visible=${state.visible}`);
    };
    document.body.appendChild(toggleBtn);
  }

  function setHidden(hidden) {
    const vis = !hidden && state.visible;
    left.wrap.style.display = vis ? "block" : "none";
    right.wrap.style.display = vis ? "block" : "none";
    if (toggleBtn) toggleBtn.style.display = hidden ? "none" : "block";
  }

  // ---------------------------
  // Touch Helpers
  // ---------------------------
  function normFromTouch(baseEl, touch) {
    const r = baseEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (touch.clientX - cx) / (r.width / 2);
    const dy = (touch.clientY - cy) / (r.height / 2);
    const mag = Math.sqrt(dx * dx + dy * dy);
    const clampMag = Math.min(1, mag);
    const nx = mag > 0 ? (dx / mag) * clampMag : 0;
    const ny = mag > 0 ? (dy / mag) * clampMag : 0;
    // deadzone
    const dz = deadZone;
    const outMag = clampMag < dz ? 0 : (clampMag - dz) / (1 - dz);
    return { x: nx * outMag, y: ny * outMag };
  }

  function setNub(nubEl, v) {
    const max = 42;
    const x = v.x * max;
    const y = v.y * max;
    nubEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    // keep center alignment correct
    nubEl.style.left = "50%";
    nubEl.style.top = "50%";
  }

  function resetPad(pad, which) {
    pad.nub.style.transform = `translate(-50%, -50%)`;
    if (which === "left") state.leftVec = { x: 0, y: 0 };
    if (which === "right") state.rightVec = { x: 0, y: 0 };
  }

  // ---------------------------
  // Touch Events (Left = strafe / Right = move+turn)
  // You can swap later, but this is your requested layout:
  //   Right stick: forward/back + 45° angles (movement) + teleport on tap/trigger equivalent
  //   Left stick: left/right strafe (later menu button)
  // ---------------------------

  // tap on right pad = action (teleport request)
  let rightTapTimer = 0;

  function onTouchStart(e) {
    if (isXRPresenting()) return; // don't interfere in XR
    if (!state.visible) return;

    for (const t of Array.from(e.changedTouches)) {
      const tX = t.clientX;
      const half = window.innerWidth / 2;
      const isLeftSide = tX < half;

      if (isLeftSide && !state.activeLeft) {
        state.activeLeft = true;
        state.leftId = t.identifier;
        const v = normFromTouch(left.base, t);
        state.leftVec = v;
        setNub(left.nub, v);
      } else if (!isLeftSide && !state.activeRight) {
        state.activeRight = true;
        state.rightId = t.identifier;
        const v = normFromTouch(right.base, t);
        state.rightVec = v;
        setNub(right.nub, v);
        rightTapTimer = performance.now();
      }
    }
  }

  function onTouchMove(e) {
    if (isXRPresenting()) return;
    if (!state.visible) return;

    for (const t of Array.from(e.changedTouches)) {
      if (state.activeLeft && t.identifier === state.leftId) {
        const v = normFromTouch(left.base, t);
        state.leftVec = v;
        setNub(left.nub, v);
      }
      if (state.activeRight && t.identifier === state.rightId) {
        const v = normFromTouch(right.base, t);
        state.rightVec = v;
        setNub(right.nub, v);
      }
    }
  }

  function onTouchEnd(e) {
    if (isXRPresenting()) return;
    if (!state.visible) return;

    for (const t of Array.from(e.changedTouches)) {
      if (state.activeLeft && t.identifier === state.leftId) {
        state.activeLeft = false;
        state.leftId = null;
        resetPad(left, "left");
      }
      if (state.activeRight && t.identifier === state.rightId) {
        state.activeRight = false;
        state.rightId = null;
        resetPad(right, "right");

        // quick tap on right pad = teleport request
        const dt = performance.now() - rightTapTimer;
        if (dt < 180) {
          onAction && onAction({ type: "teleport" });
        }
      }
    }
  }

  // attach to bases
  left.base.addEventListener("touchstart", onTouchStart, { passive: false });
  left.base.addEventListener("touchmove", onTouchMove, { passive: false });
  left.base.addEventListener("touchend", onTouchEnd, { passive: false });
  left.base.addEventListener("touchcancel", onTouchEnd, { passive: false });

  right.base.addEventListener("touchstart", onTouchStart, { passive: false });
  right.base.addEventListener("touchmove", onTouchMove, { passive: false });
  right.base.addEventListener("touchend", onTouchEnd, { passive: false });
  right.base.addEventListener("touchcancel", onTouchEnd, { passive: false });

  // prevent page scroll when touching pads
  const prevent = (e) => {
    if (e.target === left.base || e.target === right.base) e.preventDefault();
  };
  document.addEventListener("touchmove", prevent, { passive: false });

  // ---------------------------
  // Apply Movement Each Frame
  // ---------------------------
  const vForward = new THREE.Vector3();
  const vRight = new THREE.Vector3();
  const qYaw = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  function applyMove(dt) {
    // Hide if XR presenting (Quest session)
    setHidden(isXRPresenting());

    if (isXRPresenting()) return;
    if (!state.visible) return;

    // camera yaw basis (always move relative to where you look)
    const cam = camera;
    const yaw = getYawFromQuaternion(cam.quaternion);
    qYaw.setFromAxisAngle(up, yaw);

    vForward.set(0, 0, -1).applyQuaternion(qYaw).normalize();
    vRight.set(1, 0, 0).applyQuaternion(qYaw).normalize();

    // Right stick = forward/back & strafe diagonal via x
    const rx = state.rightVec.x;
    const ry = state.rightVec.y;

    // left stick = strafe only
    const lx = state.leftVec.x;

    // movement values
    const forwardAmt = (-ry) * moveSpeed; // up is -Z forward
    const strafeAmt = (rx * strafeSpeed) + (lx * strafeSpeed);

    // turning (optional): if you want, use leftVec.y or a second gesture.
    // For now: NO TURN on Android sticks (keeps it simple + no nausea)
    const yawDelta = 0;

    if (onMove) {
      onMove({ x: strafeAmt, z: forwardAmt, speed: moveSpeed });
    } else {
      // default move rig
      rig.position.addScaledVector(vForward, forwardAmt * dt);
      rig.position.addScaledVector(vRight, strafeAmt * dt);
    }

    if (yawDelta !== 0) {
      if (onTurn) onTurn({ yawDelta });
      else rig.rotation.y += yawDelta;
    }
  }

  function getYawFromQuaternion(q) {
    // yaw extraction
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    return e.y;
    // (Euler alloc each frame is fine at this scale; can optimize later)
  }

  // ---------------------------
  // Public API
  // ---------------------------
  let lastT = performance.now();
  let running = true;

  function tick() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    applyMove(dt);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // initial hide decision
  setHidden(isXRPresenting());

  log("Android sticks READY ✅ (visible on phone, hidden only during XR presenting)");

  return {
    root,
    setVisible: (v) => {
      state.visible = !!v;
      left.wrap.style.display = state.visible ? "block" : "none";
      right.wrap.style.display = state.visible ? "block" : "none";
      if (toggleBtn) toggleBtn.textContent = state.visible ? "Hide Sticks" : "Show Sticks";
    },
    destroy: () => {
      running = false;
      document.removeEventListener("touchmove", prevent);
      if (toggleBtn) toggleBtn.remove();
      root.remove();
    },
  };
}
```0

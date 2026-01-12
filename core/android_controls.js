// /core/android_controls.js
// Dual-stick UI ALWAYS visible in non-XR (Android dev). Left=move, Right=look.
// Highest z-index, pointer-events enabled, no hidden overlays.

export function installAndroidControls({ THREE, renderer, camera, player, log }) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    return { update() {} };
  }

  const ui = document.createElement("div");
  ui.id = "android-dualstick";
  ui.style.cssText = `
    position:fixed; inset:0;
    z-index:999999;
    pointer-events:none;
    user-select:none;
  `;
  document.body.appendChild(ui);

  const L = makeStick(ui, "left", log);
  const R = makeStick(ui, "right", log);

  const state = { yaw: 0, pitch: 0 };

  // Make sure canvas doesn't block touches on sticks
  renderer.domElement.style.touchAction = "none";

  log("[android] dual-stick UI mounted ✅");

  function update(dt, { isXR }) {
    if (isXR) { ui.style.display = "none"; return; }
    ui.style.display = "block";

    // Move
    const speed = 2.6;
    const strafe = L.ax;
    const forward = -L.ay;

    const move = new THREE.Vector3(strafe, 0, forward);
    if (move.lengthSq() > 0.0001) {
      move.normalize().multiplyScalar(speed * dt);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      move.applyQuaternion(q);
      player.position.add(move);
    }

    // Look
    const lookSpeed = 2.4;
    state.yaw += R.ax * lookSpeed * dt;
    state.pitch += (-R.ay) * lookSpeed * dt;
    state.pitch = clamp(state.pitch, -1.1, 1.1);

    player.rotation.y = state.yaw;
    camera.rotation.set(state.pitch, 0, 0, "YXZ");
  }

  return { update };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeStick(root, side, log) {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position:absolute;
    bottom:18px;
    ${side === "left" ? "left:18px" : "right:18px"};
    width:170px; height:170px;
    border-radius:999px;
    background:rgba(255,255,255,0.07);
    border:1px solid rgba(255,255,255,0.18);
    backdrop-filter: blur(8px);
    pointer-events:auto;
    touch-action:none;
  `;

  const nub = document.createElement("div");
  nub.style.cssText = `
    position:absolute; left:50%; top:50%;
    width:64px; height:64px;
    margin-left:-32px; margin-top:-32px;
    border-radius:999px;
    background:rgba(127,231,255,0.18);
    border:1px solid rgba(255,255,255,0.25);
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    transform: translate(0px, 0px);
  `;

  const label = document.createElement("div");
  label.textContent = side === "left" ? "MOVE" : "LOOK";
  label.style.cssText = `
    position:absolute; left:0; right:0; top:-22px;
    text-align:center;
    font: 700 12px system-ui, -apple-system, Segoe UI, Roboto, Arial;
    color: rgba(232,236,255,0.9);
    letter-spacing: 0.08em;
    pointer-events:none;
  `;

  wrap.appendChild(label);
  wrap.appendChild(nub);
  root.appendChild(wrap);

  const s = { ax: 0, ay: 0, down: false, cx: 0, cy: 0, nub };
  const rad = 62;

  const down = (e) => {
    s.down = true;
    const t = e.touches ? e.touches[0] : e;
    s.cx = t.clientX;
    s.cy = t.clientY;
    e.preventDefault();
  };

  const move = (e) => {
    if (!s.down) return;
    const t = e.touches ? e.touches[0] : e;

    let dx = t.clientX - s.cx;
    let dy = t.clientY - s.cy;

    const len = Math.hypot(dx, dy);
    if (len > rad) { dx = (dx / len) * rad; dy = (dy / len) * rad; }

    s.nub.style.transform = `translate(${dx}px, ${dy}px)`;
    s.ax = dx / rad;
    s.ay = dy / rad;

    e.preventDefault();
  };

  const up = () => {
    s.down = false;
    s.nub.style.transform = `translate(0px, 0px)`;
    s.ax = 0;
    s.ay = 0;
  };

  wrap.addEventListener("touchstart", down, { passive: false });
  wrap.addEventListener("touchmove", move, { passive: false });
  wrap.addEventListener("touchend", up);
  wrap.addEventListener("touchcancel", up);

  // First time debug ping
  log(`[android] ${side} stick ready ✅`);

  return s;
}

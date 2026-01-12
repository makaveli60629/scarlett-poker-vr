// /core/controls.js — Scarlett Controls v4 (FULL)
// ✅ Android dual sticks (MOVE + LOOK) in flat mode
// ✅ XR lasers only in XR session
// ✅ Hide DOM HUD + sticks in XR to avoid overlap
// ✅ Teleport ring only visible while aiming (no random blue circle behind you)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deadzone = (v, dz = 0.12) => (Math.abs(v) < dz ? 0 : v);

function ensureSticksUI() {
  if (document.getElementById("sticks")) return;

  const wrap = document.createElement("div");
  wrap.id = "sticks";
  wrap.style.position = "fixed";
  wrap.style.left = "0";
  wrap.style.right = "0";
  wrap.style.bottom = "0";
  wrap.style.height = "45vh";
  wrap.style.pointerEvents = "none";
  wrap.style.zIndex = "9998";

  const stickBase = (side) => {
    const base = document.createElement("div");
    base.style.position = "absolute";
    base.style.bottom = "18px";
    base.style.width = "150px";
    base.style.height = "150px";
    base.style.borderRadius = "999px";
    base.style.border = "1px solid rgba(255,255,255,0.18)";
    base.style.background = "rgba(0,0,0,0.20)";
    base.style.backdropFilter = "blur(6px)";
    base.style.pointerEvents = "auto";
    base.style.touchAction = "none";
    base.style.userSelect = "none";
    base.style.webkitUserSelect = "none";
    base.style.left = side === "L" ? "18px" : "";
    base.style.right = side === "R" ? "18px" : "";

    const nub = document.createElement("div");
    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.width = "62px";
    nub.style.height = "62px";
    nub.style.marginLeft = "-31px";
    nub.style.marginTop = "-31px";
    nub.style.borderRadius = "999px";
    nub.style.border = "1px solid rgba(255,255,255,0.22)";
    nub.style.background = "rgba(127,231,255,0.14)";
    nub.style.pointerEvents = "none";
    base.appendChild(nub);

    const label = document.createElement("div");
    label.textContent = side === "L" ? "MOVE" : "LOOK";
    label.style.position = "absolute";
    label.style.left = "0";
    label.style.right = "0";
    label.style.top = "-22px";
    label.style.textAlign = "center";
    label.style.font = "700 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    label.style.color = "rgba(232,236,255,0.85)";
    base.appendChild(label);

    wrap.appendChild(base);
    return { base, nub };
  };

  const L = stickBase("L");
  const R = stickBase("R");
  document.body.appendChild(wrap);

  return { wrap, L, R };
}

function makeRing(THREE) {
  const g = new THREE.RingGeometry(0.22, 0.30, 28);
  const m = new THREE.MeshBasicMaterial({
    color: 0x7fe7ff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(g, m);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.name = "TeleportRing";
  return ring;
}

function makeLaser(THREE, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 14;
  line.name = "LaserLine";
  return line;
}

export function installControls(ctx) {
  const { THREE, renderer, camera, player, log } = ctx;

  ctx.__controls = {
    isXR: false,
    // Android sticks state
    mobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    L: { active: false, id: null, x: 0, y: 0, sx: 0, sy: 0 },
    R: { active: false, id: null, x: 0, y: 0, sx: 0, sy: 0 },
    yaw: 0,
    pitch: 0,
    // movement tuning
    moveSpeed: 3.2,
    strafeSpeed: 3.0,
    turnSpeed: 2.4,
    // teleport
    teleport: {
      ring: null,
      raycaster: new THREE.Raycaster(),
      target: null,
      valid: false,
      lastAt: 0,
      cooldown: 250,
      aiming: false, // IMPORTANT: ring only shows while aiming
    },
    // lasers
    laserL: null,
    laserR: null,
  };

  // DOM UI (sticks)
  const sticksUI = ctx.__controls.mobile ? ensureSticksUI() : null;

  // Create teleport ring (but keep hidden unless aiming)
  const ring = makeRing(THREE);
  ctx.scene.add(ring);
  ctx.__controls.teleport.ring = ring;

  // Hide DOM UI in XR (prevents overlap)
  const hud = document.getElementById("hud");
  const sticks = document.getElementById("sticks");
  function setUIForXR(isXR) {
    if (hud) hud.style.display = isXR ? "none" : "";
    if (sticks) sticks.style.display = isXR ? "none" : "";
  }

  // XR hooks + lasers only in XR
  renderer.xr.addEventListener("sessionstart", () => {
    ctx.__controls.isXR = true;
    setUIForXR(true);

    // attach lasers only now
    if (ctx.controllers?.left && !ctx.__controls.laserL) {
      ctx.__controls.laserL = makeLaser(THREE, 0x7fe7ff);
      ctx.controllers.left.add(ctx.__controls.laserL);
    }
    if (ctx.controllers?.right && !ctx.__controls.laserR) {
      ctx.__controls.laserR = makeLaser(THREE, 0xff2d7a);
      ctx.controllers.right.add(ctx.__controls.laserR);
    }
    log?.("[xr] sessionstart ✅ (UI hidden + lasers on)");
  });

  renderer.xr.addEventListener("sessionend", () => {
    ctx.__controls.isXR = false;
    setUIForXR(false);

    // detach lasers so they never show in flat mode
    try { ctx.__controls.laserL && ctx.controllers?.left?.remove(ctx.__controls.laserL); } catch {}
    try { ctx.__controls.laserR && ctx.controllers?.right?.remove(ctx.__controls.laserR); } catch {}
    ctx.__controls.laserL = null;
    ctx.__controls.laserR = null;

    log?.("[xr] sessionend ✅ (UI restored + lasers off)");
  });

  setUIForXR(false);

  // Android sticks input
  if (sticksUI) {
    const bindStick = (stickObj, state) => {
      const base = stickObj.base;
      const nub = stickObj.nub;

      const radius = 55;

      const onDown = (e) => {
        if (ctx.__controls.isXR) return;
        state.active = true;
        state.id = e.pointerId;
        base.setPointerCapture(e.pointerId);
        state.sx = e.clientX;
        state.sy = e.clientY;
        state.x = 0; state.y = 0;
      };

      const onMove = (e) => {
        if (!state.active || e.pointerId !== state.id) return;
        const dx = e.clientX - state.sx;
        const dy = e.clientY - state.sy;

        const nx = clamp(dx / radius, -1, 1);
        const ny = clamp(dy / radius, -1, 1);

        state.x = nx;
        state.y = ny;

        nub.style.transform = `translate(${nx * radius}px, ${ny * radius}px)`;
      };

      const onUp = (e) => {
        if (e.pointerId !== state.id) return;
        state.active = false;
        state.id = null;
        state.x = 0; state.y = 0;
        nub.style.transform = `translate(0px, 0px)`;
      };

      base.addEventListener("pointerdown", onDown);
      base.addEventListener("pointermove", onMove);
      base.addEventListener("pointerup", onUp);
      base.addEventListener("pointercancel", onUp);
      base.addEventListener("pointerleave", onUp);
    };

    bindStick(sticksUI.L, ctx.__controls.L);
    bindStick(sticksUI.R, ctx.__controls.R);

    log?.("[android] sticks ready ✅ (MOVE + LOOK)");
  }
}

function getYawQuat(THREE, camera) {
  const q = camera.getWorldQuaternion(new THREE.Quaternion());
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yaw = e.y;
  const out = new THREE.Quaternion();
  out.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return out;
}

export function updateControls(ctx, dt) {
  const { THREE, camera, player, log } = ctx;
  const C = ctx.__controls;
  if (!C) return;

  // ---- Flat mode Android movement/look ----
  if (!C.isXR && C.mobile) {
    const lx = deadzone(C.L.x, 0.12);
    const ly = deadzone(C.L.y, 0.12);
    const rx = deadzone(C.R.x, 0.12);
    const ry = deadzone(C.R.y, 0.12);

    // MOVE (left stick): forward is -y
    const forward = -ly * C.moveSpeed;
    const strafe = lx * C.strafeSpeed;

    // LOOK (right stick): yaw + pitch
    C.yaw -= rx * 2.3 * dt;
    C.pitch -= ry * 1.8 * dt;
    C.pitch = clamp(C.pitch, -1.1, 1.1);

    camera.rotation.set(C.pitch, C.yaw, 0, "YXZ");

    const yawQ = getYawQuat(THREE, camera);
    const dir = new THREE.Vector3(strafe, 0, forward).applyQuaternion(yawQ);
    player.position.addScaledVector(dir, dt);
  }

  // ---- Teleport ring visibility control ----
  // Never show ring unless aiming
  if (!C.teleport.aiming && C.teleport.ring) C.teleport.ring.visible = false;

  // diagnostics update hook (from logger)
  ctx.log?.diag?.(ctx, dt);
}

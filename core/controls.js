// /core/controls.js
// Unified controls: Android dual-stick + XR thumbsticks + Teleport aiming/ring.
// No optional-chain weirdness. Works on mobile & Quest.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function deadzone(v, dz) { return Math.abs(v) < dz ? 0 : v; }

function makeLaser(THREE, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 14;
  return line;
}

function ensureTeleportRing(ctx) {
  if (ctx.teleport.ring) return;
  const { THREE, scene } = ctx;
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
  scene.add(ring);
  ctx.teleport.ring = ring;
}

function getYawQuat(ctx) {
  const { THREE, camera } = ctx;
  const q = camera.getWorldQuaternion(new THREE.Quaternion());
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yaw = e.y;
  const out = new THREE.Quaternion();
  out.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return out;
}

// ---------- ANDROID STIX ----------
function installAndroidStix(ctx) {
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isMobile) return null;

  const root = document.createElement("div");
  root.id = "stix-ui";
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.right = "0";
  root.style.bottom = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = "9998";
  document.body.appendChild(root);

  function makePad(label, side) {
    const pad = document.createElement("div");
    pad.style.position = "absolute";
    pad.style.bottom = "26px";
    pad.style.width = "150px";
    pad.style.height = "150px";
    pad.style.borderRadius = "999px";
    pad.style.border = "2px solid rgba(255,255,255,0.20)";
    pad.style.background = "rgba(10,12,18,0.25)";
    pad.style.backdropFilter = "blur(6px)";
    pad.style.pointerEvents = "auto";
    pad.style.touchAction = "none";
    pad.style.userSelect = "none";

    if (side === "left") pad.style.left = "18px";
    else pad.style.right = "18px";

    const cap = document.createElement("div");
    cap.textContent = label;
    cap.style.position = "absolute";
    cap.style.left = "50%";
    cap.style.top = "-18px";
    cap.style.transform = "translateX(-50%)";
    cap.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    cap.style.fontSize = "12px";
    cap.style.color = "rgba(232,236,255,0.9)";
    cap.style.textShadow = "0 2px 10px rgba(0,0,0,0.7)";
    pad.appendChild(cap);

    const nub = document.createElement("div");
    nub.style.position = "absolute";
    nub.style.left = "50%";
    nub.style.top = "50%";
    nub.style.width = "56px";
    nub.style.height = "56px";
    nub.style.borderRadius = "999px";
    nub.style.transform = "translate(-50%,-50%)";
    nub.style.background = "rgba(127,231,255,0.22)";
    nub.style.border = "1px solid rgba(255,255,255,0.25)";
    nub.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
    pad.appendChild(nub);

    root.appendChild(pad);

    const state = { active: false, id: -1, x: 0, y: 0, cx: 0, cy: 0 };

    const setNub = (nx, ny) => {
      nub.style.transform = `translate(${nx}px, ${ny}px)`;
    };

    const centerNub = () => setNub(-28, -28);

    // init center
    centerNub();

    pad.addEventListener("pointerdown", (e) => {
      state.active = true;
      state.id = e.pointerId;
      pad.setPointerCapture(state.id);
      const r = pad.getBoundingClientRect();
      state.cx = r.left + r.width / 2;
      state.cy = r.top + r.height / 2;
    });

    pad.addEventListener("pointermove", (e) => {
      if (!state.active || e.pointerId !== state.id) return;
      const dx = e.clientX - state.cx;
      const dy = e.clientY - state.cy;
      const max = 54;

      const mag = Math.hypot(dx, dy);
      const s = mag > max ? (max / mag) : 1;

      const nx = dx * s;
      const ny = dy * s;

      // normalized -1..1
      state.x = clamp(nx / max, -1, 1);
      state.y = clamp(ny / max, -1, 1);

      // nub position inside pad (translate from center)
      setNub(-28 + nx, -28 + ny);
    });

    const end = () => {
      state.active = false;
      state.id = -1;
      state.x = 0; state.y = 0;
      centerNub();
    };

    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);

    return state;
  }

  const left = makePad("MOVE", "left");
  const right = makePad("LOOK", "right");

  ctx.log?.("[android] STIX mounted ✅ (MOVE + LOOK)");

  return { root, left, right };
}

// ---------- XR helpers ----------
function getXRInputSource(ctx, handedness) {
  const sess = ctx.renderer.xr.getSession();
  if (!sess) return null;
  const sources = sess.inputSources || [];
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (s && s.handedness === handedness) return s;
  }
  return null;
}

function getGamepadAxes(ctx, handedness) {
  const src = getXRInputSource(ctx, handedness);
  const gp = src ? src.gamepad : null;
  const a = gp ? gp.axes : null;
  if (!a || !a.length) return { x: 0, y: 0 };

  // Quest usually uses 2/3
  if (a.length >= 4) return { x: a[2] || 0, y: a[3] || 0 };
  return { x: a[0] || 0, y: a[1] || 0 };
}

// ---------- TELEPORT ----------
function computeTeleportTarget(ctx, fromObj) {
  const tp = ctx.teleport;
  tp.valid = false;
  tp.target = null;

  if (!fromObj) return;

  const { THREE } = ctx;
  const origin = fromObj.getWorldPosition(new THREE.Vector3());
  const dir = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(fromObj.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();

  tp.raycaster.set(origin, dir);
  tp.raycaster.far = 30;

  const colliders = ctx.worldState.colliders || [];
  const hits = tp.raycaster.intersectObjects(colliders, true);
  if (!hits || hits.length === 0) return;

  const hit = hits[0];
  const n = hit.face && hit.face.normal
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    : null;

  // reject steep walls
  if (n && n.y < 0.45) return;

  tp.valid = true;
  tp.target = hit.point.clone();
}

function showTeleportRing(ctx) {
  ensureTeleportRing(ctx);
  const tp = ctx.teleport;

  if (!tp.valid || !tp.target) {
    tp.ring.visible = false;
    return;
  }

  tp.ring.visible = true;
  tp.ring.position.copy(tp.target);
  tp.ring.position.y += 0.02;
}

function doTeleport(ctx) {
  const tp = ctx.teleport;
  const now = performance.now();
  if (now - tp.lastTeleportAt < tp.cooldown) return;
  if (!tp.valid || !tp.target) return;

  // move player so camera ends up on target (flat)
  const { THREE, camera, player } = ctx;
  const camWorld = camera.getWorldPosition(new THREE.Vector3());
  const delta = tp.target.clone().sub(camWorld);
  delta.y = 0;
  player.position.add(delta);

  tp.lastTeleportAt = now;
}

// ---------- MAIN EXPORTS ----------
export function installControls(ctx) {
  const { THREE, renderer, player } = ctx;

  ctx.isXR = false;

  // state
  ctx.controllers = { left: null, right: null };
  ctx.lasers = { left: null, right: null };

  ctx.teleport = {
    active: true,
    ring: null,
    target: null,
    valid: false,
    lastTeleportAt: 0,
    cooldown: 250,
    raycaster: new THREE.Raycaster(),
  };

  ctx.locomotion = {
    speed: 3.25,
    strafeSpeed: 3.0,
    turnSpeed: 2.6,
    snapTurn: false,
    snapAngle: Math.PI / 6,
    snapCooldown: 220,
    lastSnapAt: 0,
  };

  // XR controllers (laser follows rig)
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);
  ctx.controllers.left = c0;
  ctx.controllers.right = c1;

  ctx.lasers.left = makeLaser(THREE, 0x7fe7ff);
  ctx.lasers.right = makeLaser(THREE, 0xff2d7a);

  c0.add(ctx.lasers.left);
  c1.add(ctx.lasers.right);

  player.add(c0);
  player.add(c1);

  ctx.log?.("[xr] controllers installed ✅");

  const onSelect = () => {
    // allow teleport only when XR and not seated
    if (!ctx.isXR) return;
    if (window.__SEATED_MODE) return;
    if (ctx.teleport.valid) doTeleport(ctx);
  };

  c0.addEventListener("selectstart", onSelect);
  c1.addEventListener("selectstart", onSelect);

  // XR session flags
  renderer.xr.addEventListener("sessionstart", () => {
    ctx.isXR = true;
    ctx.log?.("[xr] sessionstart ✅");
  });
  renderer.xr.addEventListener("sessionend", () => {
    ctx.isXR = false;
    ctx.log?.("[xr] sessionend ✅");
  });

  // Android sticks
  ctx.android = { stix: installAndroidStix(ctx) };
  return ctx;
}

export function updateControls(ctx, dt) {
  // --- Teleport aim (XR only)
  if (ctx.isXR && ctx.teleport.active && !window.__SEATED_MODE) {
    const c = ctx.controllers.right || ctx.controllers.left;
    if (c) {
      computeTeleportTarget(ctx, c);
      showTeleportRing(ctx);
    }
  } else {
    if (ctx.teleport && ctx.teleport.ring) ctx.teleport.ring.visible = false;
  }

  // --- Movement source:
  // XR: left stick strafe, right stick forward/back + turn
  // Android: left pad move, right pad look (yaw), optional forward

  const yawQ = getYawQuat(ctx);

  let moveX = 0, moveZ = 0, turn = 0;

  if (ctx.isXR && !window.__SEATED_MODE) {
    const L = getGamepadAxes(ctx, "left");
    const R = getGamepadAxes(ctx, "right");

    const lx = deadzone(L.x, 0.15);
    const rx = deadzone(R.x, 0.15);
    const ry = deadzone(R.y, 0.15);

    // forward/back FIX: forward is +ry (Quest reports up/down)
    const forward = ry;
    const strafe = lx;

    moveZ = forward * ctx.locomotion.speed;
    moveX = strafe * ctx.locomotion.strafeSpeed;

    if (ctx.locomotion.snapTurn) {
      const now = performance.now();
      if (Math.abs(rx) > 0.65 && now - ctx.locomotion.lastSnapAt > ctx.locomotion.snapCooldown) {
        const sgn = rx > 0 ? -1 : 1;
        ctx.player.rotation.y += sgn * ctx.locomotion.snapAngle;
        ctx.locomotion.lastSnapAt = now;
      }
    } else {
      turn = -rx * ctx.locomotion.turnSpeed;
      ctx.player.rotation.y += turn * dt;
    }
  } else {
    // Android controls
    const st = ctx.android && ctx.android.stix;
    if (st && st.left && st.right) {
      const mx = deadzone(st.left.x, 0.10);
      const my = deadzone(st.left.y, 0.10);
      const rx = deadzone(st.right.x, 0.08);

      // left pad y is down-positive; invert so up = forward
      const forward = -my;
      const strafe = mx;

      moveZ = forward * 3.0;
      moveX = strafe * 2.8;

      ctx.player.rotation.y += (-rx * 2.4) * dt;
    }
  }

  // apply movement in camera yaw frame
  if (!window.__SEATED_MODE) {
    const { THREE } = ctx;
    const dir = new THREE.Vector3(moveX, 0, moveZ).applyQuaternion(yawQ);
    ctx.player.position.addScaledVector(dir, dt);
  }
        }

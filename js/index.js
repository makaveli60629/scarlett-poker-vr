// /js/index.js — Scarlett INDEX MASTER (FULL) v1.0.6 (Arc-based Teleport Targeting)
// ✅ Controllers parented to PlayerRig (laser follows you; teleport/move no longer leaves lasers behind)
// ✅ XR locomotion: Left stick strafe, Right stick forward/back, Right stick X turn
// ✅ Seated mode guard remains
// ✅ World loader + fallback
// ✅ Android: drag-look dev controls (non-XR)
// ✅ Android: dual-stick move+look (non-XR), auto-hides in XR
// ✅ Teleport: rainbow curved arc + RING TARGETING based on ARC COLLISION (NOT straight ray)

const BUILD = `INDEX_MASTER_${Date.now()}`;

const $log = (() => {
  const pad = (n) => String(n).padStart(2, "0");
  const now = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  const out = [];
  function push(m) {
    const line = `[${now()}] ${m}`;
    out.push(line);
    console.log(line);
    const el = document.getElementById("hud-log");
    if (el) el.textContent = out.slice(-40).join("\n");
  }
  push.copy = async () => {
    try {
      await navigator.clipboard.writeText(out.join("\n"));
      push("[HUD] copied ✅");
    } catch (e) {
      push("[HUD] copy failed ❌ " + (e?.message || e));
    }
  };
  return push;
})();

$log(`[index] runtime start ✅ build=${BUILD}`);
$log(`[env] href=${location.href}`);
$log(`[env] secureContext=${String(window.isSecureContext)}`);
$log(`[env] ua=${navigator.userAgent}`);
$log(`[env] navigator.xr=${String(!!navigator.xr)}`);

async function loadThree() {
  if (window.THREE && window.THREE.Scene) return window.THREE;
  const ver = "0.164.1";
  return await import(`https://unpkg.com/three@${ver}/build/three.module.js`);
}

async function loadVRButton() {
  try {
    const m = await import(`./VRButton.js?v=${Date.now()}`);
    return m.VRButton || m.default || m;
  } catch (e) {
    const ver = "0.164.1";
    const m = await import(`https://unpkg.com/three@${ver}/examples/jsm/webxr/VRButton.js`);
    return m.VRButton;
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function deadzone(v, dz = 0.12) { return Math.abs(v) < dz ? 0 : v; }

let THREE = null;
let scene = null;
let renderer = null;
let camera = null;
let player = null;
let clock = null;

let controllers = { left: null, right: null };
let lasers = { left: null, right: null };

let teleport = {
  active: true,
  ring: null,
  target: null,
  valid: false,
  lastTeleportAt: 0,
  cooldown: 250,
  raycaster: null,

  // ✅ Arc-based targeting settings
  useArcTargeting: true,
  arc: {
    // These control the curve (visual + collision use same numbers)
    speed: 11.0,     // forward velocity magnitude
    lift: 6.7,       // upward velocity
    gravity:  -14.0, // gravity (negative is down)
    timeMax:  1.75,  // arc duration in seconds
    steps:    38,    // collision samples along arc
  },
};

// ✅ Rainbow teleport arc state
let teleportArc = {
  mesh: null,
  points: 34,
  visible: false,
};

let locomotion = {
  speed: 3.25,
  strafeSpeed: 3.0,
  turnSpeed: 2.6,
  snapTurn: false,
  snapAngle: Math.PI / 6,
  snapCooldown: 220,
  lastSnapAt: 0,
};

let world = null;
let worldState = { colliders: [] };
let isXR = false;

// ✅ Android dual-stick instance (non-XR)
let androidSticks = null;

(function ensureHUD() {
  if (document.getElementById("hud-log")) return;

  const hud = document.createElement("div");
  hud.style.position = "fixed";
  hud.style.left = "10px";
  hud.style.bottom = "10px";
  hud.style.width = "min(520px, 92vw)";
  hud.style.maxHeight = "40vh";
  hud.style.background = "rgba(10,12,18,0.65)";
  hud.style.border = "1px solid rgba(255,255,255,0.12)";
  hud.style.borderRadius = "12px";
  hud.style.padding = "10px";
  hud.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  hud.style.fontSize = "12px";
  hud.style.color = "#e8ecff";
  hud.style.zIndex = "9999";
  hud.style.backdropFilter = "blur(6px)";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.alignItems = "center";
  row.style.marginBottom = "8px";

  const title = document.createElement("div");
  title.textContent = "Scarlett VR Poker — HUD";
  title.style.fontWeight = "700";
  title.style.flex = "1";

  const btn = document.createElement("button");
  btn.textContent = "Copy Log";
  btn.style.padding = "6px 10px";
  btn.style.borderRadius = "10px";
  btn.style.border = "1px solid rgba(255,255,255,0.18)";
  btn.style.background = "rgba(127,231,255,0.12)";
  btn.style.color = "#e8ecff";
  btn.style.cursor = "pointer";
  btn.onclick = () => $log.copy();

  row.appendChild(title);
  row.appendChild(btn);

  const pre = document.createElement("pre");
  pre.id = "hud-log";
  pre.style.margin = "0";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.lineHeight = "1.25";
  pre.style.maxHeight = "32vh";
  pre.style.overflow = "auto";

  hud.appendChild(row);
  hud.appendChild(pre);
  document.body.appendChild(hud);
})();

async function initThree() {
  THREE = await loadThree();
  $log("[index] three init ✅");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);

  player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 8);
  scene.add(player);

  player.add(camera);
  camera.position.set(0, 1.65, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  scene.add(new THREE.HemisphereLight(0xffffff, 0x05060a, 0.9));
  teleport.raycaster = new THREE.Raycaster();
}

function makeLaser(color = 0x7fe7ff) {
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

// ---------------- Rainbow Arc Helpers ----------------
function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r, g, b };
}

function makeRainbowArc(points = 34) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(points * 3);
  const col = new Float32Array(points * 3);

  for (let i = 0; i < points; i++) {
    pos[i * 3 + 0] = 0;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = -i * (1 / (points - 1));

    const h = i / (points - 1);
    const rgb = hsvToRgb(h, 0.95, 1.0);
    col[i * 3 + 0] = rgb.r;
    col[i * 3 + 1] = rgb.g;
    col[i * 3 + 2] = rgb.b;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
  });

  const line = new THREE.Line(geo, mat);
  line.frustumCulled = false;
  line.visible = false;
  line.name = "TeleportRainbowArc";
  return line;
}

function ensureTeleportArc() {
  if (teleportArc.mesh) return;
  teleportArc.mesh = makeRainbowArc(teleportArc.points);
  if (controllers.right) controllers.right.add(teleportArc.mesh);
}

function setArcVisible(v) {
  if (!teleportArc.mesh) return;
  teleportArc.mesh.visible = !!v;
  teleportArc.visible = !!v;
}

// ----------- Arc math (used by BOTH collision + visuals) -----------
function getControllerForward(controllerObj) {
  const q = controllerObj.getWorldQuaternion(new THREE.Quaternion());
  return new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();
}

function arcPointWorld(origin, forward, t) {
  // ballistic: p = origin + v*t + 0.5*g*t^2
  const A = teleport.arc;
  const v = forward.clone().multiplyScalar(A.speed);
  v.y += A.lift;

  const p = origin.clone().addScaledVector(v, t);
  p.y += 0.5 * A.gravity * t * t;
  return p;
}

function segmentCast(p0, p1, colliders) {
  const dir = p1.clone().sub(p0);
  const len = dir.length();
  if (len < 1e-6) return null;
  dir.multiplyScalar(1 / len);

  teleport.raycaster.ray.origin.copy(p0);
  teleport.raycaster.ray.direction.copy(dir);
  teleport.raycaster.far = len;

  const hits = teleport.raycaster.intersectObjects(colliders, true);
  if (!hits || hits.length === 0) return null;
  return hits[0];
}

// ✅ Arc-based teleport targeting (collision along curve)
function computeTeleportTargetArc(fromObj) {
  teleport.valid = false;
  teleport.target = null;

  if (!fromObj) return;
  const colliders = worldState.colliders || [];
  if (!colliders.length) return;

  const origin = fromObj.getWorldPosition(new THREE.Vector3());
  const forward = getControllerForward(fromObj);

  const A = teleport.arc;
  const steps = Math.max(10, A.steps | 0);
  const dt = A.timeMax / steps;

  let prev = arcPointWorld(origin, forward, 0);

  for (let i = 1; i <= steps; i++) {
    const t = i * dt;
    const cur = arcPointWorld(origin, forward, t);

    const hit = segmentCast(prev, cur, colliders);
    if (hit) {
      const n = hit.face?.normal
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
        : null;

      // reject steep/vertical surfaces
      if (n && n.y < 0.45) {
        // keep scanning (could hit floor after a wall skim)
        prev.copy(cur);
        continue;
      }

      teleport.valid = true;
      teleport.target = hit.point.clone();
      return;
    }

    prev.copy(cur);
  }
}

// (optional) Straight ray targeting retained as fallback
function computeTeleportTargetRay(fromObj) {
  teleport.valid = false;
  teleport.target = null;
  if (!fromObj) return;

  const origin = fromObj.getWorldPosition(new THREE.Vector3());
  const dir = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(fromObj.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();

  teleport.raycaster.set(origin, dir);
  teleport.raycaster.far = 30;

  const colliders = worldState.colliders || [];
  const hits = teleport.raycaster.intersectObjects(colliders, true);
  if (!hits || hits.length === 0) return;

  const hit = hits[0];
  const n = hit.face?.normal
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    : null;

  if (n && n.y < 0.45) return;
  teleport.valid = true;
  teleport.target = hit.point.clone();
}

// ✅ Rainbow arc visuals now use SAME ballistic curve (and can optionally clamp to target)
function updateTeleportArcShape(controllerObj) {
  if (!teleportArc.mesh || !controllerObj) return;

  if (!teleport.valid || !teleport.target) {
    setArcVisible(false);
    return;
  }

  setArcVisible(true);

  const origin = controllerObj.getWorldPosition(new THREE.Vector3());
  const forward = getControllerForward(controllerObj);

  const pts = teleportArc.points;
  const posAttr = teleportArc.mesh.geometry.getAttribute("position");

  const inv = controllerObj.matrixWorld.clone().invert();

  // We draw the same arc; when we have a target, we shorten the visible portion
  // by finding approximate time where arc gets closest to target.
  const A = teleport.arc;
  const steps = Math.max(12, A.steps | 0);
  const dt = A.timeMax / steps;

  let bestT = A.timeMax;
  let bestD = Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const p = arcPointWorld(origin, forward, t);
    const d = p.distanceTo(teleport.target);
    if (d < bestD) { bestD = d; bestT = t; }
  }

  const drawMax = clamp(bestT + dt * 0.5, 0.4, A.timeMax); // slight overshoot for nicer landing

  for (let i = 0; i < pts; i++) {
    const u = i / (pts - 1);
    const t = u * drawMax;
    const pW = arcPointWorld(origin, forward, t);

    // convert WORLD -> controller LOCAL (since arc is parented to controller)
    pW.applyMatrix4(inv);
    posAttr.setXYZ(i, pW.x, pW.y, pW.z);
  }

  posAttr.needsUpdate = true;
}

// ✅ BIG FIX: controllers must be parented to PlayerRig, not scene
function installControllers() {
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);

  controllers.left = c0;
  controllers.right = c1;

  lasers.left = makeLaser(0x7fe7ff);
  lasers.right = makeLaser(0xff2d7a);

  c0.add(lasers.left);
  c1.add(lasers.right);

  player.add(c0);
  player.add(c1);

  $log("[index] controllers ready ✅");

  ensureTeleportArc();
  $log("[teleport] rainbow arc ready ✅");

  c0.addEventListener("selectstart", () => onSelectStart("left"));
  c1.addEventListener("selectstart", () => onSelectStart("right"));
}

function ensureTeleportRing() {
  if (teleport.ring) return;
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
  teleport.ring = ring;
}

function showTeleportRing() {
  ensureTeleportRing();
  if (!teleport.valid || !teleport.target) {
    teleport.ring.visible = false;
    return;
  }
  teleport.ring.visible = true;
  teleport.ring.position.copy(teleport.target);
  teleport.ring.position.y += 0.02;
}

function doTeleport() {
  const now = performance.now();
  if (now - teleport.lastTeleportAt < teleport.cooldown) return;
  if (!teleport.valid || !teleport.target) return;

  const camWorld = camera.getWorldPosition(new THREE.Vector3());
  const delta = teleport.target.clone().sub(camWorld);
  delta.y = 0;

  player.position.add(delta);
  teleport.lastTeleportAt = now;
}

function onSelectStart(which) {
  if (!teleport.active) return;
  if (window.__SEATED_MODE) return;
  if (teleport.valid) doTeleport();
}

function getXRInputSource(handedness) {
  const sess = renderer.xr.getSession();
  const sources = sess?.inputSources || [];
  for (const s of sources) if (s?.handedness === handedness) return s;
  return null;
}

function getGamepadAxes(handedness) {
  const src = getXRInputSource(handedness);
  const gp = src?.gamepad;
  const a = gp?.axes || [];
  if (!a.length) return { x: 0, y: 0 };
  if (a.length >= 4) return { x: a[2] ?? 0, y: a[3] ?? 0 };
  return { x: a[0] ?? 0, y: a[1] ?? 0 };
}

function getYawQuat() {
  const q = camera.getWorldQuaternion(new THREE.Quaternion());
  const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yaw = e.y;
  const out = new THREE.Quaternion();
  out.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return out;
}

function updateLocomotion(dt) {
  if (window.__SEATED_MODE) return;
  if (!isXR) return;

  const L = getGamepadAxes("left");
  const R = getGamepadAxes("right");

  const lx = deadzone(L.x, 0.15);
  const rx = deadzone(R.x, 0.15);
  const ry = deadzone(R.y, 0.15);

  const forward = ry;
  const strafe = lx;

  const moveZ = forward * locomotion.speed;
  const moveX = strafe * locomotion.strafeSpeed;

  const yawQ = getYawQuat();
  const dir = new THREE.Vector3(moveX, 0, moveZ).applyQuaternion(yawQ);

  player.position.addScaledVector(dir, dt);

  if (locomotion.snapTurn) {
    const now = performance.now();
    if (Math.abs(rx) > 0.65 && now - locomotion.lastSnapAt > locomotion.snapCooldown) {
      const sgn = rx > 0 ? -1 : 1;
      player.rotation.y += sgn * locomotion.snapAngle;
      locomotion.lastSnapAt = now;
    }
  } else {
    const turn = -rx * locomotion.turnSpeed;
    player.rotation.y += turn * dt;
  }
}

function updateTeleportAim() {
  if (!teleport.active) return;

  if (window.__SEATED_MODE) {
    if (teleport.ring) teleport.ring.visible = false;
    setArcVisible(false);
    return;
  }

  const c = controllers.right || controllers.left;
  if (!c) return;

  // ✅ Target using arc collision (fallback to ray if disabled)
  if (teleport.useArcTargeting) computeTeleportTargetArc(c);
  else computeTeleportTargetRay(c);

  showTeleportRing();

  // ✅ rainbow arc visuals follow same ballistic curve
  ensureTeleportArc();
  updateTeleportArcShape(c);
}

// ---------------- Android Dev Controls (look only, non-XR) ----------------
let dev = { dragging: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 };
function installAndroidDevControls() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return;

  const el = renderer.domElement;
  el.style.touchAction = "none";

  el.addEventListener("pointerdown", (e) => {
    if (isXR) return;
    dev.dragging = true;
    dev.lastX = e.clientX;
    dev.lastY = e.clientY;
  });
  window.addEventListener("pointerup", () => (dev.dragging = false));
  window.addEventListener("pointermove", (e) => {
    if (isXR) return;
    if (!dev.dragging) return;

    const dx = e.clientX - dev.lastX;
    const dy = e.clientY - dev.lastY;
    dev.lastX = e.clientX;
    dev.lastY = e.clientY;

    dev.yaw -= dx * 0.004;
    dev.pitch -= dy * 0.003;
    dev.pitch = clamp(dev.pitch, -1.1, 1.1);

    camera.rotation.set(dev.pitch, dev.yaw, 0, "YXZ");
  });

  $log("[android] dev controls ready ✅");
}

// ---------------- Android Dual-Stick (move + look, non-XR) ----------------
function installAndroidDualStick() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return null;

  const ui = document.createElement("div");
  ui.id = "android-dualstick";
  ui.style.cssText = `
    position:fixed; inset:0; z-index:9998;
    pointer-events:none; user-select:none;
  `;
  document.body.appendChild(ui);

  function makeStick(side) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position:absolute; bottom:18px; ${side === "L" ? "left:18px" : "right:18px"};
      width:150px; height:150px; border-radius:999px;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.18);
      backdrop-filter: blur(6px);
      pointer-events:auto; touch-action:none;
    `;

    const nub = document.createElement("div");
    nub.style.cssText = `
      position:absolute; left:50%; top:50%;
      width:58px; height:58px; margin-left:-29px; margin-top:-29px;
      border-radius:999px;
      background:rgba(127,231,255,0.16);
      border:1px solid rgba(255,255,255,0.22);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    `;
    wrap.appendChild(nub);
    ui.appendChild(wrap);

    const s = { ax: 0, ay: 0, down: false, cx: 0, cy: 0, nub };
    const rad = 54;

    const down = (e) => {
      if (isXR) return;
      s.down = true;
      const t = e.touches ? e.touches[0] : e;
      s.cx = t.clientX;
      s.cy = t.clientY;
      e.preventDefault();
    };
    const move = (e) => {
      if (isXR) return;
      if (!s.down) return;
      const t = e.touches ? e.touches[0] : e;
      let dx = t.clientX - s.cx;
      let dy = t.clientY - s.cy;
      const len = Math.hypot(dx, dy);
      if (len > rad) { dx = dx / len * rad; dy = dy / len * rad; }
      s.nub.style.transform = `translate(${dx}px, ${dy}px)`;
      s.ax = dx / rad;
      s.ay = dy / rad;
      e.preventDefault();
    };
    const up = () => {
      s.down = false;
      s.nub.style.transform = `translate(0px, 0px)`;
      s.ax = 0; s.ay = 0;
    };

    wrap.addEventListener("touchstart", down, { passive: false });
    wrap.addEventListener("touchmove", move, { passive: false });
    wrap.addEventListener("touchend", up);
    wrap.addEventListener("touchcancel", up);

    return s;
  }

  const L = makeStick("L");
  const R = makeStick("R");

  const state = { L, R, yaw: 0, pitch: 0 };

  const api = {
    setVisible(v) { ui.style.display = v ? "block" : "none"; },
    tick(dt) {
      if (isXR) { api.setVisible(false); return; }
      api.setVisible(true);

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

      const lookSpeed = 2.2;
      state.yaw += R.ax * lookSpeed * dt;
      state.pitch += (-R.ay) * lookSpeed * dt;
      state.pitch = clamp(state.pitch, -1.1, 1.1);

      player.rotation.y = state.yaw;
      camera.rotation.set(state.pitch, 0, 0, "YXZ");
    },
    destroy() { ui.remove(); }
  };

  $log("[android] dual-stick installed ✅");
  return api;
}

// ---------------- World loader + fallback ----------------
async function loadWorld() {
  try {
    const mod = await import(`./world.js?v=${Date.now()}`);
    if (!mod?.World?.init) throw new Error("World module missing init()");
    return mod.World;
  } catch (e) {
    $log(`[index] world init failed ❌ ${e?.message || e}`);
    return null;
  }
}

function buildFallbackWorld() {
  const g = new THREE.Group();
  g.name = "FallbackWorld";
  scene.add(g);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 96),
    new THREE.MeshStandardMaterial({ color: 0x111326, roughness: 1, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);

  worldState.colliders = [floor];
  $log("[index] fallback world added ✅");
}

function installXRHooks() {
  renderer.xr.addEventListener("sessionstart", () => {
    isXR = true;
    $log("[xr] sessionstart ✅");
  });
  renderer.xr.addEventListener("sessionend", () => {
    isXR = false;
    $log("[xr] sessionend ✅");
  });
}

function animate() {
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    updateTeleportAim();
    updateLocomotion(dt);

    // ✅ mobile move/look when NOT in XR
    androidSticks?.tick?.(dt);

    try { world?.update?.(dt); }
    catch (e) { $log("[world] update error ❌ " + (e?.message || e)); world = null; }

    renderer.render(scene, camera);
  });
}

(async function boot() {
  try {
    await initThree();
    installXRHooks();

    const VRButton = await loadVRButton();
    document.body.appendChild(VRButton.createButton(renderer));
    $log("[index] VRButton appended ✅");

    installControllers();
    ensureTeleportRing();

    installAndroidDevControls();
    androidSticks = installAndroidDualStick();

    $log("[index] calling world.init() …");
    world = await loadWorld();

    if (world) {
      await world.init({ THREE, scene, renderer, camera, player, controllers, log: (m) => $log(m), BUILD });
      if (Array.isArray(world.colliders)) worldState.colliders = world.colliders;
      else if (typeof world.colliders === "function") worldState.colliders = world.colliders();
      else worldState.colliders = world.colliders || [];
      $log("[index] world init ✅");
    } else {
      buildFallbackWorld();
    }

    animate();
  } catch (e) {
    $log("[index] fatal boot error ❌ " + (e?.message || e));
  }
})();

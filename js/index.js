// /js/index.js — Scarlett INDEX MASTER (FULL) v1.0.1 (Quest-safe)
// ✅ FIXED: removed invalid `new Something?.()` optional-chain syntax (was breaking Android/Quest)
// ✅ No bare imports like "three"
// ✅ VRButton + WebXR
// ✅ PlayerRig movement + teleport ring + controller lasers
// ✅ Thumbstick locomotion + seated-mode guard
// ✅ Loads ./world.js and passes ctx; falls back if it fails

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

// ---------- loaders (no bare "three") ----------
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

// ---------- utils ----------
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function deadzone(v, dz = 0.12) { return Math.abs(v) < dz ? 0 : v; }

// ---------- globals ----------
let THREE = null;
let scene = null;
let renderer = null;
let camera = null;
let player = null; // PlayerRig
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
};

let locomotion = {
  speed: 3.25,
  strafeSpeed: 3.0,
  turnSpeed: 2.4,      // smooth turn rad/s
  snapTurn: false,
  snapAngle: Math.PI / 6,
  snapCooldown: 220,
  lastSnapAt: 0,
};

let world = null;
let worldState = { colliders: [] };
let isXR = false;

// ---------- HUD (lightweight) ----------
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

// ---------- init three ----------
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

  scene.add(new THREE.HemisphereLight(0xffffff, 0x05060a, 0.8));

  teleport.raycaster = new THREE.Raycaster();
}

// ---------- controllers + lasers ----------
function makeLaser(color = 0x7fe7ff) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  line.scale.z = 14;
  line.name = "LaserLine";
  return line;
}

function installControllers() {
  const c0 = renderer.xr.getController(0);
  const c1 = renderer.xr.getController(1);

  controllers.left = c0;
  controllers.right = c1;

  lasers.left = makeLaser(0x7fe7ff);
  lasers.right = makeLaser(0xff2d7a);

  c0.add(lasers.left);
  c1.add(lasers.right);

  scene.add(c0);
  scene.add(c1);

  $log("[index] controllers ready ✅");

  c0.addEventListener("selectstart", () => onSelectStart("left"));
  c1.addEventListener("selectstart", () => onSelectStart("right"));
}

// ---------- teleport ring ----------
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

function getXRInputSource(handedness) {
  const sess = renderer.xr.getSession();
  const sources = sess?.inputSources || [];
  for (const s of sources) if (s?.handedness === handedness) return s;
  return null;
}

function computeTeleportTarget(fromObj) {
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

  // floor-like only
  if (n && n.y < 0.45) return;

  teleport.valid = true;
  teleport.target = hit.point.clone();
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

// ---------- locomotion ----------
function getGamepadAxes(handedness) {
  const src = getXRInputSource(handedness);
  const gp = src?.gamepad;
  const a = gp?.axes;
  if (!a || !a.length) return { x: 0, y: 0 };

  // prefer last two axes if present
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
  // ✅ your seated-mode requirement
  if (window.__SEATED_MODE) return;
  if (!isXR) return;

  const left = getGamepadAxes("left");
  const right = getGamepadAxes("right");

  const lx = deadzone(left.x, 0.15);
  const ly = deadzone(left.y, 0.15);
  const rx = deadzone(right.x, 0.15);
  const ry = deadzone(right.y, 0.15);

  // Your mapping:
  // Right stick: forward/back + diagonal (so x strafe + y forward)
  // Left stick: left/right strafe (x) (y optional)
  const forward = -ry;
  const strafeR = rx;
  const strafeL = lx;

  const moveZ = forward * locomotion.speed;
  const moveX = (strafeR * locomotion.strafeSpeed) + (strafeL * locomotion.strafeSpeed);

  const yawQ = getYawQuat();
  const dir = new THREE.Vector3(moveX, 0, moveZ).applyQuaternion(yawQ);

  player.position.addScaledVector(dir, dt);

  // Turn
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
    return;
  }

  const c = controllers.right || controllers.left;
  if (!c) return;

  computeTeleportTarget(c);
  showTeleportRing();
}

// ---------- Android dev look (non-XR) ----------
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

// ---------- world loader ----------
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

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20, 8, 96, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d14,
      roughness: 1,
      metalness: 0.05,
      side: THREE.DoubleSide,
    })
  );
  wall.position.y = 4;
  g.add(wall);

  const l1 = new THREE.PointLight(0x7fe7ff, 12, 60);
  l1.position.set(0, 6, 10);
  scene.add(l1);

  const l2 = new THREE.PointLight(0xff2d7a, 10, 60);
  l2.position.set(-10, 5, 0);
  scene.add(l2);

  worldState.colliders = [floor];
  $log("[index] fallback world added ✅");
}

// ---------- XR hooks ----------
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

// ---------- main loop ----------
function animate() {
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();

    updateTeleportAim();
    updateLocomotion(dt);

    try {
      world?.update?.(dt);
    } catch (e) {
      $log("[world] update error ❌ " + (e?.message || e));
      world = null;
    }

    renderer.render(scene, camera);
  });
}

// ---------- boot ----------
(async function boot() {
  try {
    await initThree();
    installXRHooks();

    const VRButton = await loadVRButton();
    try {
      document.body.appendChild(VRButton.createButton(renderer));
      $log("[index] VRButton appended ✅");
    } catch (e) {
      $log("[index] VRButton append failed ❌ " + (e?.message || e));
    }

    installControllers();
    ensureTeleportRing();
    installAndroidDevControls();

    $log("[index] calling world.init() …");
    world = await loadWorld();

    if (world) {
      await world.init({
        THREE,
        scene,
        renderer,
        camera,
        player,
        controllers,
        log: (m) => $log(m),
        BUILD,
      });

      // colliders (World v7 exposes getter)
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

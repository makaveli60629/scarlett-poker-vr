// /js/main.js — Scarlett VR Poker (Main) V5.0 FULL WORLD RESTORE
// - Single boot guard
// - Clean logging for your DEBUG index (NO double spam)
// - VRButton + XR enabled
// - Smooth move + snap/smooth turn + Android dock support
// - Calls world.update(dt) + world.recenter()

const v = window.__BUILD_V || Date.now().toString();

function ui(m) {
  // IMPORTANT: event-only to avoid duplicate logs (your debug index mirrors console)
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
}

if (window.__SCARLETT_MAIN_BOOTED) {
  ui(`[main] ⏭️ main.js already booted — skipping (v=${v})`);
} else {
  window.__SCARLETT_MAIN_BOOTED = true;
  ui(`[main] boot ✅ v=${v}`);
  await boot();
}

async function boot() {
  const THREE = await import("three");
  const { VRButton } = await import("three/addons/webxr/VRButton.js");
  const { XRControllerModelFactory } = await import("three/addons/webxr/XRControllerModelFactory.js");

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // --- Scene / Camera ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);
  camera.position.set(0, 1.6, 6);

  // Rig (move rig, not camera)
  const player = new THREE.Group();
  player.name = "player";
  player.add(camera);
  scene.add(player);

  // Safety lights (even if world modules fail)
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7);
  dl.position.set(8, 12, 6);
  scene.add(dl);

  // --- Controllers ---
  const controllerModelFactory = new XRControllerModelFactory();

  const controller1 = renderer.xr.getController(0);
  const controller2 = renderer.xr.getController(1);
  scene.add(controller1, controller2);

  const grip1 = renderer.xr.getControllerGrip(0);
  const grip2 = renderer.xr.getControllerGrip(1);
  grip1.add(controllerModelFactory.createControllerModel(grip1));
  grip2.add(controllerModelFactory.createControllerModel(grip2));
  scene.add(grip1, grip2);

  const controllers = [controller1, controller2];
  const controllerGrips = [grip1, grip2];

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // VRButton
  const sessionInit = window.__XR_SESSION_INIT || {
    optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
  };

  try {
    if (!window.__SCARLETT_VRBUTTON_DONE) {
      window.__SCARLETT_VRBUTTON_DONE = true;
      const btn = VRButton.createButton(renderer, sessionInit);
      document.body.appendChild(btn);
      ui("[main] VRButton appended ✅");
    }
  } catch (e) {
    ui("[main] VRButton failed ⚠️ " + (e?.message || e));
  }

  // --- World init (guarded) ---
  const worldMod = await import("./world.js?v=" + encodeURIComponent(v));
  const World = worldMod.World || worldMod.default || worldMod;

  if (!window.__SCARLETT_WORLD_INITED) {
    window.__SCARLETT_WORLD_INITED = true;

    window.__SCARLETT_WORLD = await World.init({
      THREE, scene, renderer, camera, player, controllers, controllerGrips,
      log: ui
    });

    ui("[main] world init ✅");
  } else {
    ui("[main] ⏭️ world already inited — using existing");
  }

  const world = window.__SCARLETT_WORLD;

  // Ensure flag API exists
  if (typeof world.setFlag !== "function") {
    world.flags = world.flags || {};
    world.setFlag = (k, val) => (world.flags[k] = !!val);
    world.getFlag = (k) => !!world.flags[k];
    world.toggleFlag = (k) => (world.flags[k] = !world.flags[k]);
    ui("[main] ⚠️ world.setFlag missing — polyfilled");
  }

  // Apply saved flags
  const flags = window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true };
  world.setFlag("teleport", !!flags.teleport);
  world.setFlag("move", !!flags.move);
  world.setFlag("snap", !!flags.snap);
  world.setFlag("hands", !!flags.hands);

  // One-time event wiring
  if (!window.__SCARLETT_MAIN_EVENTS_WIRED) {
    window.__SCARLETT_MAIN_EVENTS_WIRED = true;

    window.addEventListener("scarlett-enter-vr", () => {
      ui("[main] HUD requested Enter VR");
    });

    window.addEventListener("scarlett-toggle-teleport", (e) => world.setFlag("teleport", !!e.detail));
    window.addEventListener("scarlett-toggle-move", (e) => world.setFlag("move", !!e.detail));
    window.addEventListener("scarlett-toggle-snap", (e) => world.setFlag("snap", !!e.detail));
    window.addEventListener("scarlett-toggle-hands", (e) => world.setFlag("hands", !!e.detail));

    window.addEventListener("scarlett-recenter", () => {
      ui("[main] recenter");
      world.recenter?.();
    });

    window.addEventListener("scarlett-touch", (e) => {
      window.__SCARLETT_TOUCH = e.detail || {};
    });
  }

  // --- Locomotion ---
  const move = {
    speed: 2.35,
    turnSpeed: 2.25,
    snapAngle: Math.PI / 4, // 45°
    snapCooldown: 0,
    yaw: 0
  };

  function getGamepads() {
    const session = renderer.xr.getSession?.();
    if (!session) return [];
    return session.inputSources.map(s => s.gamepad).filter(Boolean);
  }

  function applyMove(dt) {
    const seated = (world.mode === "table"); // table mode -> no walking unless you want later
    const f = world.flags || {};

    // Gamepads
    let axX = 0, axY = 0, turnX = 0;
    const pads = getGamepads();

    if (pads[0]?.axes?.length >= 2) {
      axX = pads[0].axes[2] ?? pads[0].axes[0] ?? 0;
      axY = pads[0].axes[3] ?? pads[0].axes[1] ?? 0;
    }
    if (pads[0]?.axes?.length >= 4) {
      turnX = pads[0].axes[2] ?? 0;
    }
    if (pads[1]?.axes?.length >= 2) {
      turnX = pads[1].axes[2] ?? pads[1].axes[0] ?? turnX;
    }

    // Mobile dock
    const t = window.__SCARLETT_TOUCH || {};
    const mf = t.f ? 1 : 0;
    const mb = t.b ? 1 : 0;
    const ml = t.l ? 1 : 0;
    const mr = t.r ? 1 : 0;

    let mx = axX + (mr - ml) * 0.85;
    let mz = axY + (mb - mf) * 0.85;

    const dz = 0.15;
    if (Math.abs(mx) < dz) mx = 0;
    if (Math.abs(mz) < dz) mz = 0;

    // Turn
    const wantSnap = !!f.snap;
    if (wantSnap) {
      move.snapCooldown -= dt;
      const snapLeft = (t.turnL ? 1 : 0) || (turnX < -0.65);
      const snapRight = (t.turnR ? 1 : 0) || (turnX > 0.65);
      if (move.snapCooldown <= 0) {
        if (snapLeft) { move.yaw += move.snapAngle; move.snapCooldown = 0.22; }
        if (snapRight) { move.yaw -= move.snapAngle; move.snapCooldown = 0.22; }
      }
    } else {
      const smoothTurn = (t.turnR ? 1 : 0) - (t.turnL ? 1 : 0);
      const tx = (smoothTurn * 0.9) + turnX;
      if (Math.abs(tx) > dz) move.yaw -= tx * move.turnSpeed * dt;
    }

    player.rotation.y = move.yaw;

    // Walk
    if (!!f.move && !seated) {
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), move.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), move.yaw);

      const vel = new THREE.Vector3();
      vel.addScaledVector(right, mx);
      vel.addScaledVector(forward, mz);

      if (vel.lengthSq() > 0.0001) {
        vel.normalize().multiplyScalar(move.speed * dt);
        player.position.add(vel);
      }
    }
  }

  // Animation loop
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    applyMove(dt);
    world?.update?.(dt);

    renderer.render(scene, camera);
  });

  ui("[main] ready ✅");
      }

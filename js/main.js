// /js/main.js — Scarlett VR Poker (Main) V4.2 SINGLE-BOOT FULL
// Fixes: double boot, double world.init, duplicate listeners.
// Works with your debug index (scarlett-enter-vr / toggles / recenter / touch).

const v = window.__BUILD_V || Date.now().toString();

function ui(m) {
  try { window.dispatchEvent(new CustomEvent("scarlett-log", { detail: String(m) })); } catch {}
  try { console.log(m); } catch {}
}

// ✅ HARD BOOT GUARD (stops double-running even if imported twice)
if (window.__SCARLETT_MAIN_BOOTED) {
  ui(`[main] ⏭️ main.js already booted — skipping (v=${v})`);
} else {
  window.__SCARLETT_MAIN_BOOTED = true;
  ui(`[main] boot ✅ v=${v}`);
  await boot();
}

async function boot() {
  // ---- Imports ----
  const THREE = await import("three");
  const { VRButton } = await import("three/addons/webxr/VRButton.js");
  const { XRControllerModelFactory } = await import("three/addons/webxr/XRControllerModelFactory.js");

  // ---- Renderer / Scene / Camera ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 6);

  // Player rig (move this, not camera)
  const player = new THREE.Group();
  player.name = "player";
  player.add(camera);
  scene.add(player);

  // ---- Basic lighting (in case world modules fail) ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(6, 10, 4);
  scene.add(dir);

  // ---- Controllers ----
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

  // ---- Resize ----
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- VRButton ----
  const sessionInit = window.__XR_SESSION_INIT || {
    optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"]
  };

  try {
    const btn = VRButton.createButton(renderer, sessionInit);
    document.body.appendChild(btn);
    ui("[main] VRButton appended ✅");
  } catch (e) {
    ui("[main] VRButton failed ⚠️ " + (e?.message || e));
  }

  // ---- World init (GUARDED) ----
  const worldMod = await import("./world.js?v=" + encodeURIComponent(v));
  const World = worldMod.World || worldMod.default || worldMod;

  // ✅ ensure we only init world once per page load
  if (window.__SCARLETT_WORLD_INITED) {
    ui("[main] ⏭️ world already inited — using existing");
  } else {
    window.__SCARLETT_WORLD_INITED = true;

    // init world
    window.__SCARLETT_WORLD = await World.init({
      THREE,
      scene,
      renderer,
      camera,
      player,
      controllers,
      log: ui
    });

    ui("[main] world init ✅");
  }

  const world = window.__SCARLETT_WORLD;

  // ---- Ensure flags API exists (should already now) ----
  if (typeof world.setFlag !== "function") {
    ui("[main] ⚠️ world.setFlag missing — polyfilled");
    world.flags = world.flags || {};
    world.setFlag = (k, val) => (world.flags[k] = !!val);
    world.getFlag = (k) => !!world.flags[k];
    world.toggleFlag = (k) => (world.flags[k] = !world.flags[k]);
  }

  // ---- Apply saved UI flags (from index debug HUD) ----
  const flags = window.__SCARLETT_FLAGS || { teleport: true, move: true, snap: true, hands: true };
  world.setFlag("teleport", !!flags.teleport);
  world.setFlag("move", !!flags.move);
  world.setFlag("snap", !!flags.snap);
  world.setFlag("hands", !!flags.hands);

  // ---- ONE-TIME event wiring guard ----
  if (!window.__SCARLETT_MAIN_EVENTS_WIRED) {
    window.__SCARLETT_MAIN_EVENTS_WIRED = true;

    // Enter VR request from HUD button
    window.addEventListener("scarlett-enter-vr", async () => {
      ui("[main] HUD requested Enter VR");
      // VRButton handles session start; this event is mainly for logging
    });

    // Toggles from HUD
    window.addEventListener("scarlett-toggle-teleport", (e) => world.setFlag("teleport", !!e.detail));
    window.addEventListener("scarlett-toggle-move", (e) => world.setFlag("move", !!e.detail));
    window.addEventListener("scarlett-toggle-snap", (e) => world.setFlag("snap", !!e.detail));
    window.addEventListener("scarlett-toggle-hands", (e) => world.setFlag("hands", !!e.detail));

    // Recenter from HUD
    window.addEventListener("scarlett-recenter", () => {
      ui("[main] recenter");
      world.recenter?.();
    });

    // Android touch dock movement (from index)
    window.addEventListener("scarlett-touch", (e) => {
      window.__SCARLETT_TOUCH = e.detail || {};
    });
  }

  // ---- Movement / Turn (Quest + Mobile) ----
  // We do minimal locomotion here so you're never “stuck”.
  // Your existing teleport/move systems can override later.

  const move = {
    speed: 2.25,
    turnSpeed: 2.2,
    snapAngle: Math.PI / 4, // 45°
    snapCooldown: 0,
    yaw: 0
  };

  function getGamepads() {
    const session = renderer.xr.getSession?.();
    if (!session) return [];
    return session.inputSources
      .map(s => s.gamepad)
      .filter(Boolean);
  }

  function applyMove(dt) {
    // If seated at table, allow only turning unless you want otherwise
    const seated = (world.mode === "table");
    const flags = world.flags || {};

    // Inputs (Quest gamepads)
    let axX = 0, axY = 0, turnX = 0;
    const pads = getGamepads();
    if (pads[0]?.axes?.length >= 2) {
      axX = pads[0].axes[2] ?? pads[0].axes[0] ?? 0; // left stick X (sometimes index differs)
      axY = pads[0].axes[3] ?? pads[0].axes[1] ?? 0; // left stick Y
    }
    if (pads[1]?.axes?.length >= 2) {
      turnX = pads[1].axes[2] ?? pads[1].axes[0] ?? 0; // right stick X
    } else if (pads[0]?.axes?.length >= 4) {
      // some devices put both sticks on one pad
      turnX = pads[0].axes[2] ?? 0;
    }

    // Mobile touch dock
    const t = window.__SCARLETT_TOUCH || {};
    const mf = t.f ? 1 : 0;
    const mb = t.b ? 1 : 0;
    const ml = t.l ? 1 : 0;
    const mr = t.r ? 1 : 0;

    // combine
    let mx = axX + (mr - ml) * 0.8;
    let mz = axY + (mb - mf) * 0.8;

    // deadzone
    const dz = 0.15;
    if (Math.abs(mx) < dz) mx = 0;
    if (Math.abs(mz) < dz) mz = 0;

    // Turning
    const wantSnap = !!flags.snap;
    if (wantSnap) {
      move.snapCooldown -= dt;
      const snapLeft = (t.turnL ? 1 : 0) || (turnX < -0.65);
      const snapRight = (t.turnR ? 1 : 0) || (turnX > 0.65);
      if (move.snapCooldown <= 0) {
        if (snapLeft) { move.yaw += move.snapAngle; move.snapCooldown = 0.25; }
        if (snapRight) { move.yaw -= move.snapAngle; move.snapCooldown = 0.25; }
      }
    } else {
      const smoothTurn = (t.turnR ? 1 : 0) - (t.turnL ? 1 : 0);
      const tx = (smoothTurn * 0.85) + turnX;
      if (Math.abs(tx) > dz) move.yaw -= tx * move.turnSpeed * dt;
    }

    player.rotation.y = move.yaw;

    // Smooth Move
    if (!!flags.move && !seated) {
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

  // ---- Animation loop ----
  let lastT = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    applyMove(dt);

    // Let world update run (VR panel follow, etc.)
    if (world?.update) {
      try { world.update(dt); } catch {}
    }

    renderer.render(scene, camera);
  });

  ui("[main] ready ✅");
  }

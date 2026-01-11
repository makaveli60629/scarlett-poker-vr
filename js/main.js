// /js/main.js — Scarlett Hybrid STABLE Boot v5.0
// Goals: never-stuck, HUD always-on, locomotion reliable, right-hand laser only, world loads even if optional modules fail.

const log = (...a) => (window.SCARLETT?.log ? window.SCARLETT.log(...a) : console.log(...a));
const err = (...a) => (window.SCARLETT?.err ? window.SCARLETT.err(...a) : console.error(...a));

const BUILD = window.SCARLETT?.BUILD || "Hybrid";

async function safeImport(path) {
  try {
    const m = await import(path);
    log("import ok:", path);
    return m;
  } catch (e) {
    err("import fail:", path, String(e?.stack || e));
    return null;
  }
}

(async function boot() {
  log("three via local wrapper ✅");
  const THREE = await (await import(`./three.js?v=${Date.now()}`));

  const { VRButton } = (await safeImport(`./VRButton.js?v=${Date.now()}`)) || {};
  if (!VRButton) err("VRButton missing");
  else log("VRButton ✅");

  // Scene basics
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  document.body.appendChild(renderer.domElement);

  // VR button
  try {
    const sessionInit = {
      optionalFeatures: [
        "local-floor","bounded-floor","local","viewer",
        "hand-tracking","layers","dom-overlay",
        "hit-test","anchors"
      ],
      domOverlay: { root: document.body }
    };
    document.body.appendChild(VRButton.createButton(renderer, sessionInit));
  } catch (e) {
    err("VRButton create failed", String(e?.stack || e));
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 12, 120);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 500);
  camera.position.set(0, 1.65, 0);

  // Player rig
  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.position.set(0, 0, 0);
  player.add(camera);
  scene.add(player);

  // Controllers group
  const controllers = new THREE.Group();
  controllers.name = "Controllers";
  player.add(controllers);
  log("Controllers parented to PlayerRig ✅");

  // XR hands group (optional)
  const handsGroup = new THREE.Group();
  handsGroup.name = "XRHands";
  player.add(handsGroup);
  log("XRHands parented to PlayerRig ✅");

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Minimal right-hand laser (always on right) ----
  const raycaster = new THREE.Raycaster();
  const tempMat = new THREE.Matrix4();
  const dir = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const hit = new THREE.Vector3();

  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
  const laserMat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.9 });
  const laserLine = new THREE.Line(laserGeom, laserMat);
  laserLine.scale.z = 10;

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.26, 40),
    new THREE.MeshBasicMaterial({ color: 0xff2d7a, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI/2;
  halo.visible = false;

  scene.add(halo);

  // Keep a reference to the RIGHT controller only
  const rightController = renderer.xr.getController(0);
  rightController.name = "RightController";
  rightController.add(laserLine);
  controllers.add(rightController);

  const leftController = renderer.xr.getController(1);
  leftController.name = "LeftController";
  controllers.add(leftController);

  // ---- Ultra-stable locomotion fallback (if your other systems fail) ----
  // Right stick: move, Left stick: snap turn (45°)
  const move = { x: 0, z: 0 };
  let snapCooldown = 0;

  function getGamepads() {
    const session = renderer.xr.getSession?.();
    if (!session) return [];
    return session.inputSources
      .map(s => s.gamepad)
      .filter(gp => gp && gp.axes && gp.buttons);
  }

  function applyLocomotion(dt) {
    const gps = getGamepads();
    if (!gps.length) return;

    // Find "right-hand" gamepad by heuristic: has more buttons and typically is first, but we also allow either.
    // We'll read both and prefer the one with larger axis movement.
    let best = null, bestMag = 0;
    for (const gp of gps) {
      const ax = gp.axes || [];
      const mx = Math.abs(ax[2] ?? ax[0] ?? 0);
      const mz = Math.abs(ax[3] ?? ax[1] ?? 0);
      const mag = mx + mz;
      if (mag > bestMag) { bestMag = mag; best = gp; }
    }
    const gp = best || gps[0];
    const ax = gp.axes || [];

    // Standard mapping: [0,1]=left stick, [2,3]=right stick (but varies)
    const lx = ax[0] ?? 0, ly = ax[1] ?? 0;
    const rx = ax[2] ?? 0, ry = ax[3] ?? 0;

    // Move on RIGHT stick (ry forward is usually -1). Fix inverted if needed.
    const dead = 0.18;
    const mX = (Math.abs(rx) > dead) ? rx : 0;
    const mZ = (Math.abs(ry) > dead) ? ry : 0;

    // Forward/back: we want pushing forward to move forward (toward -Z in rig local)
    // Most controllers report forward as -1, so we invert ry to make forward positive.
    move.x = mX;
    move.z = -mZ;

    // Snap turn on LEFT stick X
    if (snapCooldown > 0) snapCooldown -= dt;

    const turnX = (Math.abs(lx) > 0.7) ? lx : 0;
    if (turnX && snapCooldown <= 0) {
      const angle = (Math.PI / 4) * (turnX > 0 ? -1 : 1); // 45°
      player.rotation.y += angle;
      snapCooldown = 0.28;
    }

    const speed = 3.0; // m/s
    const vx = move.x * speed * dt;
    const vz = move.z * speed * dt;

    if (vx || vz) {
      // Move in camera-facing direction but on ground plane
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
      fwd.y = 0; right.y = 0;
      fwd.normalize(); right.normalize();

      const delta = new THREE.Vector3().addScaledVector(right, vx).addScaledVector(fwd, vz);
      player.position.add(delta);
    }
  }

  // ---- Load World (safe) ----
  const WorldMod = await safeImport(`./world.js?v=${Date.now()}`);
  const World = WorldMod?.World;

  const ctx = { THREE, scene, renderer, camera, player, controllers, log, BUILD };

  if (World?.init) {
    try {
      await World.init(ctx);
      log("world init ✅");
    } catch (e) {
      err("world init failed", String(e?.stack || e));
    }
  } else {
    err("World.init missing — check /js/world.js export");
  }

  // Room manager (optional)
  const RM = await safeImport(`./room_manager.js?v=${Date.now()}`);
  if (RM?.RoomManager?.init) {
    try { RM.RoomManager.init(ctx); } catch (e) { err("RoomManager init failed", String(e?.stack || e)); }
  }

  // ---- Render Loop (never stop) ----
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Locomotion fallback always available
    applyLocomotion(dt);

    // Right-hand halo pointer to floors/teleport surfaces
    try {
      // Use right controller pose
      tempMat.identity().extractRotation(rightController.matrixWorld);
      dir.set(0,0,-1).applyMatrix4(tempMat).normalize();
      origin.setFromMatrixPosition(rightController.matrixWorld);
      raycaster.set(origin, dir);

      const hits = raycaster.intersectObjects(scene.children, true);
      const floorHit = hits.find(h => h.object && (h.object.userData?.isFloor || h.object.userData?.teleportable));
      if (floorHit) {
        halo.position.copy(floorHit.point);
        halo.visible = true;
      } else {
        halo.visible = false;
      }
    } catch (_) {}

    renderer.render(scene, camera);
  });

  log(`Hybrid boot complete ✅ (${BUILD})`);
})().catch(e => err("boot fatal", String(e?.stack || e)));

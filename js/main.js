// /js/main.js — Scarlett Hybrid 4.6 (FULL)
// FIXES:
// ✅ Spawn faces HUB (opposite of teleporter). Uses SpawnPoint.userData.faceTargetName.
// ✅ Movement restored: left stick moves; if left stick missing, right stick Y moves.
// ✅ 45° snap stays on RIGHT stick X.
// ✅ Teleport is 1-leap per trigger press (no rapid sliding).
// ✅ Laser always hits floor plane and biases slightly toward hub.

(async function boot() {
  console.log("SCARLETT_MAIN=4.6");
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  // Prefer your local wrapper if you have it; fallback to importmap "three"
  let THREE = null;
  try {
    const m = await import("./three.js");
    THREE = m.default || m.THREE || m;
    console.log("[main] three via local wrapper ✅");
  } catch {
    THREE = await import("three");
    console.log("[main] three via importmap ✅");
  }

  // -------------------------
  // Scene / Camera / Renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c12);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1400);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth / 1, innerHeight / 1);
  renderer.xr.enabled = true;

  // Bright / readable on Quest
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.6;

  document.body.appendChild(renderer.domElement);

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // -------------------------
  // Player Rig
  // -------------------------
  const player = new THREE.Group();
  player.name = "PlayerRig";
  scene.add(player);

  camera.position.set(0, 1.65, 0);
  player.add(camera);

  // -------------------------
  // VRButton (LOCAL)
  // -------------------------
  try {
    const { VRButton } = await import("./VRButton.js");
    document.body.appendChild(VRButton.createButton(renderer));
    console.log("[main] VRButton ✅");
  } catch (e) {
    console.warn("[main] VRButton failed:", e);
  }

  // -------------------------
  // Overkill Lights (always visible)
  // -------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a3a, 2.35));

  const sun = new THREE.DirectionalLight(0xffffff, 4.5);
  sun.position.set(60, 120, 80);
  scene.add(sun);

  // Head-follow light so you NEVER see black
  const headLamp = new THREE.PointLight(0xffffff, 2.4, 50);
  headLamp.position.set(0, 1.4, 0.4);
  camera.add(headLamp);

  // Big “sky lamps” so outside isn’t pitch black
  const skyLampPositions = [
    [0, 18, 0],
    [0, 18, 60],
    [0, 18, -60],
    [60, 18, 0],
    [-60, 18, 0],
  ];
  for (const [x, y, z] of skyLampPositions) {
    const pl = new THREE.PointLight(0xffffff, 1.15, 220);
    pl.position.set(x, y, z);
    scene.add(pl);
  }

  // -------------------------
  // Controllers & Hands (parented to rig)
  // -------------------------
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  controllerL.name = "ControllerLeft";
  controllerR.name = "ControllerRight";
  player.add(controllerL, controllerR);

  try {
    const leftHand = renderer.xr.getHand(0);
    const rightHand = renderer.xr.getHand(1);
    leftHand.name = "XRHandLeft";
    rightHand.name = "XRHandRight";
    player.add(leftHand, rightHand);
  } catch {}

  // -------------------------
  // World
  // -------------------------
  const { World } = await import("./world.js");
  const ctx = { THREE, scene };
  await World.init(ctx);

  console.log("[main] world module loaded:", ctx?.worldVersion || "unknown");

  // -------------------------
  // Spawn: face HUB target (opposite of teleporter)
  // -------------------------
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  function applySpawnAndFacing() {
    const sp = scene.getObjectByName("SpawnPoint") || scene.getObjectByName("SpawnPad");
    if (!sp) return;

    // Position
    player.position.set(sp.position.x, 0, sp.position.z);

    // Face target: use name specified by world.js
    const targetName = sp.userData?.faceTargetName || "BossTable";
    const target = scene.getObjectByName(targetName) || scene.getObjectByName("BossTable") || scene.getObjectByName("HubCenter");

    if (target) {
      target.getWorldPosition(tmpA);
      tmpB.set(player.position.x, 0, player.position.z);
      const v = tmpA.sub(tmpB);
      v.y = 0;
      if (v.lengthSq() > 1e-6) {
        // yaw that makes player forward (-Z) point toward target
        const yaw = Math.atan2(v.x, v.z);
        player.rotation.set(0, yaw, 0);
      }
    } else {
      // fallback: face toward -Z (toward hub)
      player.rotation.set(0, 0, 0);
    }

    console.log(`[main] Spawn ✅ x=${player.position.x.toFixed(2)} z=${player.position.z.toFixed(2)}`);
  }

  applySpawnAndFacing();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawnAndFacing, 160));

  // -------------------------
  // Teleport: floor plane + hub-biased ray
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.frustumCulled = false;
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  function hubTarget() {
    return scene.getObjectByName("HubCenter") || scene.getObjectByName("BossTable") || null;
  }

  function updateTeleportRay() {
    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);
    if (o.lengthSq() < 0.0001) return false;

    // forward from controller
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

    // bias toward hub
    const h = hubTarget();
    if (h) {
      const t = new THREE.Vector3();
      h.getWorldPosition(t);
      const toHub = t.sub(o).normalize();
      fwd.lerp(toHub, 0.35).normalize();
    }

    // tilt downward so it hits floor
    dir.copy(fwd);
    dir.y -= 0.35;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.25 || t > 40) return false;

    hit.copy(o).addScaledVector(dir, t);

    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    ring.position.set(hit.x, 0.02, hit.z);
    ring.visible = true;
    laser.visible = true;
    return true;
  }

  // -------------------------
  // Quest gamepad mapping
  // -------------------------
  function getGamepads() {
    const session = renderer.xr.getSession();
    if (!session) return { gpL: null, gpR: null };

    let gpL = null, gpR = null;
    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      if (src.handedness === "left") gpL = src.gamepad;
      if (src.handedness === "right") gpR = src.gamepad;
    }
    return { gpL, gpR };
  }

  // Movement tuning (slower, elegant)
  const MOVE_SPEED = 1.25;

  // Snap turn: RIGHT stick X
  const SNAP_ANGLE = Math.PI / 4; // 45°
  let snapCooldown = 0;

  // Teleport: 1 leap per press
  let lastTeleportPressed = false;

  // -------------------------
  // Main loop
  // -------------------------
  let last = performance.now();

  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;

    try { World?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR } = getGamepads();

      // LEFT stick move (preferred)
      let moveX = 0, moveY = 0;

      if (gpL?.axes?.length >= 2) {
        const lx = gpL.axes[0] ?? 0;
        const ly = gpL.axes[1] ?? 0;
        if (Math.abs(lx) > 0.12 || Math.abs(ly) > 0.12) {
          moveX = lx;
          moveY = ly;
        }
      }

      // ✅ Right controller fallback if left stick doesn't exist / not sending
      // Use ONLY right stick Y for forward/back (prevents conflict with snap turn on X)
      if (moveX === 0 && moveY === 0 && gpR?.axes?.length >= 4) {
        const ry = gpR.axes[3] ?? 0;
        if (Math.abs(ry) > 0.12) {
          moveX = 0;
          moveY = ry;
        }
      }

      // Apply movement
      if (moveX !== 0 || moveY !== 0) {
        const yaw = player.rotation.y;

        const forward = (-moveY) * MOVE_SPEED * dt;
        const strafe  = ( moveX) * MOVE_SPEED * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Snap turn from RIGHT stick X (Quest: axes[2])
      snapCooldown = Math.max(0, snapCooldown - dt);
      let rx = 0;
      if (gpR?.axes?.length >= 4) rx = gpR.axes[2] ?? 0;
      else if (gpR?.axes?.length >= 1) rx = gpR.axes[0] ?? 0;

      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        player.rotation.y += (rx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCooldown = 0.28;
      }

      // Teleport ray
      const canTeleport = updateTeleportRay();

      // Right trigger: button[0]
      const pressed = !!gpR?.buttons?.[0]?.pressed;
      if (pressed && !lastTeleportPressed && canTeleport) {
        player.position.set(hit.x, 0, hit.z);
      }
      lastTeleportPressed = pressed;

    } else {
      laser.visible = false;
      ring.visible = false;
      ring.visible = false;
      lastTeleportPressed = false;
    }

    renderer.render(scene, camera);
  });

})();

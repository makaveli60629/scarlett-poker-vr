// /js/main.js — Scarlett Hybrid 3.5 (LOCKED MOVEMENT + DETERMINISTIC SPAWN)
// Authoritative controller + teleport + spawn logic
// Designed to work with World v3.5 (grid-aligned, sealed corridors)

(async function boot() {
  console.log("SCARLETT_MAIN=3.5");

  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  // -------------------------
  // THREE
  // -------------------------
  const THREE = await import("three");

  // -------------------------
  // Scene / Renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
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
  // VR Button
  // -------------------------
  const { VRButton } = await import("./VRButton.js");
  document.body.appendChild(VRButton.createButton(renderer));

  // -------------------------
  // Controllers & Hands
  // -------------------------
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  player.add(controllerL, controllerR);

  let leftHand = null, rightHand = null;
  try {
    leftHand = renderer.xr.getHand(0);
    rightHand = renderer.xr.getHand(1);
    player.add(leftHand, rightHand);
  } catch {}

  // -------------------------
  // World
  // -------------------------
  const { World } = await import("./world.js");
  await World.init({ THREE, scene });

  // -------------------------
  // Spawn (ABSOLUTE AUTHORITY)
  // -------------------------
  const spawn = scene.getObjectByName("SpawnPoint");
  if (spawn) {
    player.position.set(spawn.position.x, 0, spawn.position.z);
    player.rotation.set(0, spawn.rotation.y || Math.PI, 0);
    console.log("Spawn applied ✅");
  }

  renderer.xr.addEventListener("sessionstart", () => {
    if (spawn) {
      player.position.set(spawn.position.x, 0, spawn.position.z);
      player.rotation.set(0, spawn.rotation.y || Math.PI, 0);
      console.log("XR Spawn reapplied ✅");
    }
  });

  // -------------------------
  // Teleport Laser (RIGHT CONTROLLER)
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.35, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  const tmpPos = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const hit = new THREE.Vector3();

  function updateTeleportRay() {
    controllerR.getWorldPosition(tmpPos);
    controllerR.getWorldQuaternion(tmpQuat);

    tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat);
    tmpDir.y -= 0.25;
    tmpDir.normalize();

    const denom = floorPlane.normal.dot(tmpDir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(tmpPos) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 20) return false;

    hit.copy(tmpPos).addScaledVector(tmpDir, t);

    laser.geometry.setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -t),
    ]);

    ring.position.set(hit.x, 0.02, hit.z);
    laser.visible = ring.visible = true;
    return true;
  }

  // -------------------------
  // INPUT (LOCKED & SANE)
  // -------------------------
  const MOVE_SPEED = 1.25;        // slow & precise
  const SNAP_ANGLE = Math.PI / 4; // 45°
  let snapCooldown = 0;

  function getGamepad(handedness) {
    const session = renderer.xr.getSession();
    if (!session) return null;
    return [...session.inputSources].find(s => s.gamepad && s.handedness === handedness)?.gamepad;
  }

  // -------------------------
  // Animation Loop
  // -------------------------
  let last = performance.now();

  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;

    if (renderer.xr.isPresenting) {
      // -------- Movement --------
      const gpR = getGamepad("right");
      const gpL = getGamepad("left");

      if (gpR?.axes) {
        const [x, y] = gpR.axes;
        const yaw = player.rotation.y;

        const forward = -y * MOVE_SPEED * dt;
        const strafe = x * MOVE_SPEED * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // -------- Snap Turn (LEFT STICK ONLY) --------
      snapCooldown -= dt;
      if (gpL?.axes && snapCooldown <= 0) {
        const turn = gpL.axes[0];
        if (Math.abs(turn) > 0.75) {
          player.rotation.y += turn > 0 ? -SNAP_ANGLE : SNAP_ANGLE;
          snapCooldown = 0.3;
        }
      }

      // -------- Teleport --------
      const canTeleport = updateTeleportRay();
      if (gpR?.buttons?.[0]?.pressed && canTeleport) {
        player.position.set(hit.x, 0, hit.z);
      }
    } else {
      laser.visible = ring.visible = false;
    }

    renderer.render(scene, camera);
  });

})();

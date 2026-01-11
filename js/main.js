// /js/main.js — Scarlett Hybrid 3.6 (LIGHTS GUARANTEED + LOCKED MOVEMENT + DETERMINISTIC SPAWN)

(async function boot() {
  console.log("SCARLETT_MAIN=3.6");

  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  const THREE = await import("three");

  // -------------------------
  // Scene / Renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 800);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Make StandardMaterials brighter & more readable
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

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
  // ✅ FALLBACK LIGHT PACK (ALWAYS ON)
  // This guarantees you can see *even if world lighting fails*
  // -------------------------
  const lightRoot = new THREE.Group();
  lightRoot.name = "MainLightPack";
  scene.add(lightRoot);

  // Strong ambient fill (so nothing is pure black)
  lightRoot.add(new THREE.AmbientLight(0xffffff, 0.55));

  // Hemisphere "sky/ground" light
  lightRoot.add(new THREE.HemisphereLight(0xe8f3ff, 0x1a1a22, 1.25));

  // Sun light
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(30, 50, 20);
  lightRoot.add(sun);

  // Extra camera-follow fill (prevents dark corners when you turn)
  const camFill = new THREE.PointLight(0x9bdcff, 1.35, 18);
  camFill.position.set(0, 1.8, 0.2);
  camera.add(camFill);

  console.log("✅ LightPack ON");

  // -------------------------
  // Controllers & Hands
  // -------------------------
  const controllerL = renderer.xr.getController(0);
  const controllerR = renderer.xr.getController(1);
  controllerL.name = "ControllerLeft";
  controllerR.name = "ControllerRight";
  player.add(controllerL, controllerR);

  let leftHand = null, rightHand = null;
  try {
    leftHand = renderer.xr.getHand(0);
    rightHand = renderer.xr.getHand(1);
    leftHand.name = "XRHandLeft";
    rightHand.name = "XRHandRight";
    player.add(leftHand, rightHand);
  } catch {}

  // -------------------------
  // World
  // -------------------------
  let World = null;
  try {
    const mod = await import("./world.js");
    World = mod.World;
    await World.init({ THREE, scene }); // world adds its own lights too, but we don't rely on it
    console.log("✅ World init ok");
  } catch (e) {
    console.warn("⚠️ World init failed:", e?.message || e);
  }

  // -------------------------
  // Spawn (DETERMINISTIC)
  // -------------------------
  const spawn = scene.getObjectByName("SpawnPoint");
  function applySpawn() {
    if (!spawn) return;
    player.position.set(spawn.position.x, 0, spawn.position.z);
    player.rotation.set(0, spawn.rotation.y || Math.PI, 0);
    console.log("✅ Spawn applied");
  }
  applySpawn();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawn, 120));

  // -------------------------
  // Teleport Laser (RIGHT)
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  controllerR.add(laser);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.35, 48),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent:true, opacity:0.9 })
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

    // If controller pose is invalid (0,0,0), hide
    if (tmpPos.lengthSq() < 0.0001) return false;

    tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat);
    tmpDir.y -= 0.25;
    tmpDir.normalize();

    const denom = floorPlane.normal.dot(tmpDir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(tmpPos) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 25) return false;

    hit.copy(tmpPos).addScaledVector(tmpDir, t);

    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  // -------------------------
  // Input (LOCKED + SANE)
  // -------------------------
  const MOVE_SPEED = 1.15;        // slow & controllable
  const SNAP_ANGLE = Math.PI / 4; // 45 degrees
  let snapCooldown = 0;

  function getGamepad(handedness) {
    const session = renderer.xr.getSession();
    if (!session) return null;
    return [...session.inputSources].find(s => s.gamepad && s.handedness === handedness)?.gamepad;
  }

  // Teleport: single leap per press (debounced)
  let lastTeleportPressed = false;

  // -------------------------
  // Loop
  // -------------------------
  let last = performance.now();

  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;

    // Optional world update
    try { World?.update?.({ THREE, scene }, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const gpR = getGamepad("right");
      const gpL = getGamepad("left");

      // Move: RIGHT stick only
      if (gpR?.axes) {
        const x = gpR.axes[0] ?? 0;
        const y = gpR.axes[1] ?? 0;

        const yaw = player.rotation.y;
        const forward = (-y) * MOVE_SPEED * dt;
        const strafe  = ( x) * MOVE_SPEED * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Snap turn: LEFT stick only
      snapCooldown -= dt;
      if (gpL?.axes && snapCooldown <= 0) {
        const turn = gpL.axes[0] ?? 0;
        if (Math.abs(turn) > 0.75) {
          player.rotation.y += (turn > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
          snapCooldown = 0.28;
        }
      }

      // Teleport: RIGHT trigger = one leap (debounced)
      const canTeleport = updateTeleportRay();
      const pressed = !!gpR?.buttons?.[0]?.pressed;

      if (pressed && !lastTeleportPressed && canTeleport) {
        player.position.set(hit.x, 0, hit.z);
      }
      lastTeleportPressed = pressed;

    } else {
      laser.visible = false;
      ring.visible = false;
      lastTeleportPressed = false;
    }

    renderer.render(scene, camera);
  });

})();

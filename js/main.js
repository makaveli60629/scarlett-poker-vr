// /js/main.js — Scarlett Hybrid 3.7 (FULL BRIGHT + QUEST AXIS FIX + RIGHT STICK 45° SNAP + HUB-BIASED LASER)

(async function boot() {
  console.log("SCARLETT_MAIN=3.7");
  if (window.__SCARLETT_BOOTED__) return;
  window.__SCARLETT_BOOTED__ = true;

  const THREE = await import("three");

  // -------------------------
  // Scene / Camera / Renderer
  // -------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c12);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1200);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;

  // Make it BRIGHT on Quest:
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.35; // 🔥 big boost
  renderer.physicallyCorrectLights = false; // keep simple predictable intensities

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
  // VRButton
  // -------------------------
  const { VRButton } = await import("./VRButton.js");
  document.body.appendChild(VRButton.createButton(renderer));

  // -------------------------
  // ✅ GUARANTEED LIGHT PACK (OVERKILL)
  // -------------------------
  const lightRoot = new THREE.Group();
  lightRoot.name = "OverkillLightPack";
  scene.add(lightRoot);

  lightRoot.add(new THREE.AmbientLight(0xffffff, 1.05));           // huge fill
  lightRoot.add(new THREE.HemisphereLight(0xffffff, 0x2b2b40, 2.2)); // sky/ground

  const sun = new THREE.DirectionalLight(0xffffff, 4.0);
  sun.position.set(40, 90, 60);
  lightRoot.add(sun);

  // Camera-follow lamp so you ALWAYS see what you look at
  const headLamp = new THREE.PointLight(0xffffff, 2.2, 35);
  headLamp.position.set(0, 1.4, 0.3);
  camera.add(headLamp);

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

  // -------------------------
  // Spawn (AUTHORITATIVE)
  // -------------------------
  const spawn = scene.getObjectByName("SpawnPoint");
  function applySpawn() {
    if (!spawn) return;
    player.position.set(spawn.position.x, 0, spawn.position.z);
    player.rotation.set(0, spawn.rotation.y || Math.PI, 0);
  }
  applySpawn();
  renderer.xr.addEventListener("sessionstart", () => setTimeout(applySpawn, 120));

  // -------------------------
  // Floor plane for teleport
  // -------------------------
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Laser
  const laser = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]),
    new THREE.LineBasicMaterial({ color: 0x00ffff })
  );
  laser.frustumCulled = false;
  controllerR.add(laser);

  // Ring marker
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.37, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fe7ff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  // Teleport helpers
  const o = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const hit = new THREE.Vector3();

  // Hub bias target
  const hub = () => scene.getObjectByName("HubPlate") || scene.getObjectByName("BossTable") || null;

  function updateTeleportRay() {
    controllerR.getWorldPosition(o);
    controllerR.getWorldQuaternion(q);

    if (o.lengthSq() < 0.0001) return false;

    // Controller forward
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();

    // Bias toward hub center (so beam tends to point into the circle)
    const h = hub();
    if (h) {
      const target = new THREE.Vector3();
      h.getWorldPosition(target);
      const toHub = target.sub(o).normalize();
      // blend: mostly controller forward, partially toward hub
      fwd.lerp(toHub, 0.35).normalize();
    }

    // Aim downward a bit so it hits floor
    dir.copy(fwd);
    dir.y -= 0.35;
    dir.normalize();

    const denom = floorPlane.normal.dot(dir);
    if (Math.abs(denom) < 0.001) return false;

    const t = -(floorPlane.normal.dot(o) + floorPlane.constant) / denom;
    if (t < 0.2 || t > 35) return false;

    hit.copy(o).addScaledVector(dir, t);

    laser.geometry.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-t)]);
    ring.position.set(hit.x, 0.02, hit.z);

    laser.visible = true;
    ring.visible = true;
    return true;
  }

  // -------------------------
  // ✅ QUEST GAMEPAD AXIS FIX
  // Left stick: axes[0],[1]
  // Right stick: axes[2],[3] (on Quest)
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

  // Movement: LEFT stick
  const MOVE_SPEED = 1.35;

  // Snap turn: RIGHT stick X
  const SNAP_ANGLE = Math.PI / 4; // 45°
  let snapCooldown = 0;

  // Teleport: right trigger = 1 leap per press
  let lastTeleportPressed = false;

  // -------------------------
  // Loop
  // -------------------------
  let last = performance.now();

  renderer.setAnimationLoop((time) => {
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;

    try { World?.update?.(ctx, dt); } catch {}

    if (renderer.xr.isPresenting) {
      const { gpL, gpR } = getGamepads();

      // Movement (LEFT stick)
      if (gpL?.axes?.length >= 2) {
        const lx = gpL.axes[0] ?? 0;
        const ly = gpL.axes[1] ?? 0;

        const yaw = player.rotation.y;
        const forward = (-ly) * MOVE_SPEED * dt;
        const strafe  = ( lx) * MOVE_SPEED * dt;

        player.position.x += Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        player.position.z += Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      }

      // Snap turn (RIGHT stick X) — use axes[2] when present, else fallback
      snapCooldown = Math.max(0, snapCooldown - dt);
      let rx = 0;
      if (gpR?.axes?.length >= 4) rx = gpR.axes[2] ?? 0;
      else if (gpR?.axes?.length >= 1) rx = gpR.axes[0] ?? 0;

      if (snapCooldown <= 0 && Math.abs(rx) > 0.75) {
        player.rotation.y += (rx > 0 ? -SNAP_ANGLE : SNAP_ANGLE);
        snapCooldown = 0.28;
      }

      // Teleport
      const canTeleport = updateTeleportRay();
      const pressed = !!gpR?.buttons?.[0]?.pressed; // trigger
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

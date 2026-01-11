// /js/main.js — Scarlett Hybrid STABLE Boot v5.2
// Fixes: stick locomotion swap/invert, right-hand laser lock, never-stuck render loop

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

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  document.body.appendChild(renderer.domElement);

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

  const player = new THREE.Group();
  player.name = "PlayerRig";
  player.add(camera);
  scene.add(player);

  const controllers = new THREE.Group();
  controllers.name = "Controllers";
  player.add(controllers);
  log("Controllers parented to PlayerRig ✅");

  const handsGroup = new THREE.Group();
  handsGroup.name = "XRHands";
  player.add(handsGroup);
  log("XRHands parented to PlayerRig ✅");

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Right-hand laser (LOCKED RIGHT ONLY) ----------
  const raycaster = new THREE.Raycaster();
  const tempMat = new THREE.Matrix4();
  const dir = new THREE.Vector3();
  const origin = new THREE.Vector3();

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

  const xrRight = renderer.xr.getController(0);
  xrRight.name = "XRController0";
  xrRight.add(laserLine);
  controllers.add(xrRight);

  const xrLeft = renderer.xr.getController(1);
  xrLeft.name = "XRController1";
  controllers.add(xrLeft);

  // ---------- Handedness-safe gamepad binding ----------
  let gpLeft = null;
  let gpRight = null;

  function refreshGamepads() {
    gpLeft = null; gpRight = null;
    const session = renderer.xr.getSession?.();
    if (!session) return;

    for (const src of session.inputSources) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") gpLeft = src.gamepad;
      if (src.handedness === "right") gpRight = src.gamepad;
    }

    // Fallback: if handedness missing, use first two gamepads
    if (!gpLeft || !gpRight) {
      const gps = session.inputSources.map(s => s.gamepad).filter(Boolean);
      if (!gpRight) gpRight = gps[0] || null;
      if (!gpLeft) gpLeft = gps[1] || gps[0] || null;
    }
  }

  renderer.xr.addEventListener("sessionstart", () => {
    log("[xr] sessionstart ✅");
    refreshGamepads();
  });
  renderer.xr.addEventListener("sessionend", () => {
    log("[xr] sessionend ✅");
    gpLeft = gpRight = null;
  });

  // ---------- Locomotion: RIGHT stick move / LEFT stick snap ----------
  const move = { x: 0, z: 0 };
  let snapCooldown = 0;
  let dbgT = 0;

  function axis(gp, i) {
    const a = gp?.axes;
    if (!a || i < 0 || i >= a.length) return 0;
    const v = a[i];
    return Number.isFinite(v) ? v : 0;
  }

  function applyLocomotion(dt) {
    const session = renderer.xr.getSession?.();
    if (!session) return;

    // refresh occasionally (some browsers reorder sources)
    refreshGamepads();

    const dead = 0.18;

    // RIGHT stick (usually axes 2/3). If missing, try 0/1.
    const rx = axis(gpRight, 2) || axis(gpRight, 0);
    const ry = axis(gpRight, 3) || axis(gpRight, 1);

    // LEFT stick X for snap (usually axis 0). If missing, try 2.
    const lx = axis(gpLeft, 0) || axis(gpLeft, 2);

    const mX = (Math.abs(rx) > dead) ? rx : 0;
    const mY = (Math.abs(ry) > dead) ? ry : 0;

    // Forward/back: pushing forward should move forward.
    // In most XR pads: forward is -1, so invert.
    move.x = mX;
    move.z = -mY;

    if (snapCooldown > 0) snapCooldown -= dt;
    const turnX = (Math.abs(lx) > 0.7) ? lx : 0;
    if (turnX && snapCooldown <= 0) {
      const angle = (Math.PI / 4) * (turnX > 0 ? -1 : 1);
      player.rotation.y += angle;
      snapCooldown = 0.28;
    }

    const speed = 3.2;
    const vx = move.x * speed * dt;
    const vz = move.z * speed * dt;

    if (vx || vz) {
      const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
      fwd.y = 0; right.y = 0;
      fwd.normalize(); right.normalize();
      const delta = new THREE.Vector3().addScaledVector(right, vx).addScaledVector(fwd, vz);
      player.position.add(delta);
    }

    // debug to HUD every ~2s
    dbgT += dt;
    if (dbgT > 2.0) {
      dbgT = 0;
      log(`[input] L.axes=${gpLeft?.axes?.length || 0} R.axes=${gpRight?.axes?.length || 0} | rx=${rx.toFixed(2)} ry=${ry.toFixed(2)} lx=${lx.toFixed(2)}`);
    }
  }

  // ---------- Load World ----------
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

  const RM = await safeImport(`./room_manager.js?v=${Date.now()}`);
  if (RM?.RoomManager?.init) {
    try { RM.RoomManager.init(ctx); } catch (e) { err("RoomManager init failed", String(e?.stack || e)); }
  }

  // ---------- Render Loop ----------
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    applyLocomotion(dt);

    // Right-hand halo hit floors
    try {
      tempMat.identity().extractRotation(xrRight.matrixWorld);
      dir.set(0,0,-1).applyMatrix4(tempMat).normalize();
      origin.setFromMatrixPosition(xrRight.matrixWorld);
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

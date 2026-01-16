// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — Quest XR loop + controllers + lasers + locomotion fallback
export async function bootWorld({ DIAG, H }) {
  const log = (...a) => console.log("[world]", ...a);
  const warn = (...a) => console.warn("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);

  const stamp = () => new Date().toLocaleTimeString();
  const HUD = (s) => (typeof H === "function" ? H(s) : log(s));

  HUD(`world start ✅ ${stamp()}`);

  // --- Imports (NO bare specifiers; Quest-safe) ---
  let THREE, VRButton;
  try {
    THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
    VRButton = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");
    HUD("three + VRButton import ✅");
  } catch (e) {
    err(e);
    throw new Error("Failed to import three/VRButton from unpkg");
  }

  // --- Scene setup ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101214);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  document.getElementById("app")?.appendChild(renderer.domElement);

  // Add VR button
  try {
    const btn = VRButton.VRButton.createButton(renderer);
    btn.style.zIndex = "99998";
    document.body.appendChild(btn);
    HUD("VRButton appended ✅");
  } catch (e) {
    warn("VRButton failed", e);
  }

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8);
  dl.position.set(5, 10, 2);
  scene.add(dl);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x1b1f22, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // Table marker (so you ALWAYS see something)
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.9, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a7a5e, roughness: 0.95, metalness: 0.05 })
  );
  table.position.set(0, 0.85, 0);
  scene.add(table);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.03, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f0f12, roughness: 0.8 })
  );
  ring.position.set(0, 0.92, 0);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // Player rig (move this for locomotion)
  const rig = new THREE.Group();
  rig.add(camera);
  rig.position.set(0, 0, 3.2);
  scene.add(rig);

  // --- Controllers + lasers ---
  const controller0 = renderer.xr.getController(0);
  const controller1 = renderer.xr.getController(1);
  rig.add(controller0);
  rig.add(controller1);

  const grip0 = renderer.xr.getControllerGrip(0);
  const grip1 = renderer.xr.getControllerGrip(1);
  rig.add(grip0);
  rig.add(grip1);

  function makeLaser() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0xff3bd1 });
    const line = new THREE.Line(geom, mat);
    line.name = "laser";
    line.scale.z = 5;
    return line;
  }

  controller0.add(makeLaser());
  controller1.add(makeLaser());

  const tmpMat = new THREE.Matrix4();
  const ray = new THREE.Raycaster();

  // --- Locomotion fallback (Quest thumbstick move + snap turn) ---
  const moveState = {
    speed: 1.8, // m/s
    snap: Math.PI / 6, // 30deg
    snapCooldown: 0,
  };

  function getBestStickAxes(gamepad) {
    if (!gamepad || !gamepad.axes) return null;
    const a = gamepad.axes;
    // Common layouts:
    // - Some give [xL,yL,xR,yR]
    // - Others: [xL,yL] only
    // We'll choose the first pair with meaningful range.
    const pairs = [];
    for (let i = 0; i + 1 < a.length; i += 2) pairs.push([i, i + 1]);
    if (!pairs.length) return null;
    // pick pair with largest magnitude
    let best = pairs[0], bestMag = 0;
    for (const [i, j] of pairs) {
      const mag = Math.abs(a[i]) + Math.abs(a[j]);
      if (mag > bestMag) { bestMag = mag; best = [i, j]; }
    }
    return { x: a[best[0]] || 0, y: a[best[1]] || 0 };
  }

  function getSnapAxis(gamepad) {
    if (!gamepad || !gamepad.axes) return 0;
    // prefer right stick x if present, else any axis with movement
    const a = gamepad.axes;
    if (a.length >= 3) return a[2] || 0;
    return a[0] || 0;
  }

  // --- XR session diagnostics ---
  renderer.xr.addEventListener("sessionstart", () => {
    HUD("XR sessionstart ✅");
  });
  renderer.xr.addEventListener("sessionend", () => {
    HUD("XR sessionend ✅");
  });

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Render loop: THIS IS THE IMPORTANT PART FOR QUEST BLACK-SCREEN BUGS ---
  let lastT = performance.now();
  let tick = 0;

  renderer.setAnimationLoop((t) => {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    tick++;

    const session = renderer.xr.getSession?.();
    if (session && tick % 30 === 0) {
      // every ~0.5s at 60fps
      const src = session.inputSources || [];
      HUD(`XR inputSources=${src.length}`);
    }

    // locomotion from first gamepad we find (usually right controller)
    if (session) {
      const src = session.inputSources || [];
      let gp = null;
      for (const s of src) {
        if (s && s.gamepad) { gp = s.gamepad; break; }
      }

      if (gp) {
        const stick = getBestStickAxes(gp);
        if (stick) {
          // forward is -Z in camera space
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          forward.y = 0;
          forward.normalize();

          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          right.y = 0;
          right.normalize();

          const dead = 0.12;
          const sx = Math.abs(stick.x) > dead ? stick.x : 0;
          const sy = Math.abs(stick.y) > dead ? stick.y : 0;

          // stick.y usually up=-1, down=+1, so invert for forward
          const moveF = -sy;
          const moveR = sx;

          rig.position.addScaledVector(forward, moveF * moveState.speed * dt);
          rig.position.addScaledVector(right, moveR * moveState.speed * dt);
        }

        // snap turn from another axis
        moveState.snapCooldown = Math.max(0, moveState.snapCooldown - dt);
        const ax = getSnapAxis(gp);
        if (moveState.snapCooldown === 0 && Math.abs(ax) > 0.7) {
          rig.rotation.y += (ax > 0 ? -1 : 1) * moveState.snap;
          moveState.snapCooldown = 0.25;
        }
      }
    }

    // simple “laser hits floor” so you can see ray is alive
    const controllers = [controller0, controller1];
    for (const c of controllers) {
      tmpMat.identity().extractRotation(c.matrixWorld);
      ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
      ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);
      const hits = ray.intersectObject(floor, false);
      const line = c.getObjectByName("laser");
      if (line) line.scale.z = hits.length ? hits[0].distance : 5;
    }

    renderer.render(scene, camera);
  });

  HUD("render loop installed ✅");

  // Quick camera snap toward table
  camera.lookAt(0, 1.0, 0);
  HUD("camera snapped to table ✅");
}

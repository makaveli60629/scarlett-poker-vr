// /js/scarlett1/world.js
// SCARLETT1 WORLD ORCHESTRATOR (FULL) — Bulletproof render + XR + controllers + locomotion + always-visible scene
export async function bootWorld({ DIAG, H }) {
  const log = (...a) => console.log("[world]", ...a);
  const warn = (...a) => console.warn("[world]", ...a);
  const err = (...a) => console.error("[world]", ...a);
  const HUD = (s) => (typeof H === "function" ? H(s) : log(s));

  HUD("world start ✅");

  // --- Imports (Quest-safe: NO bare specifiers) ---
  let THREE, VRButton;
  try {
    THREE = await import("https://unpkg.com/three@0.158.0/build/three.module.js");
    VRButton = await import("https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js");
    HUD("imports ✅ three + VRButton");
  } catch (e) {
    err(e);
    throw new Error("Failed to import three/VRButton");
  }

  // --- Root container ---
  const app = document.getElementById("app") || document.body;

  // --- Renderer / Scene / Camera ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
  camera.position.set(0, 1.6, 3);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;

  // If something appended before, replace it cleanly
  const old = document.getElementById("scarlettCanvas");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  renderer.domElement.id = "scarlettCanvas";
  app.appendChild(renderer.domElement);

  // --- VR Button ---
  try {
    const btn = VRButton.VRButton.createButton(renderer);
    btn.style.zIndex = "99998";
    document.body.appendChild(btn);
    HUD("VRButton ✅");
  } catch (e) {
    warn("VRButton failed", e);
    HUD("VRButton ⚠️ failed (still ok in 2D)");
  }

  // --- Lights ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 3);
  scene.add(sun);

  // --- Always-visible “sanity world” ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.14, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a7a5e, roughness: 0.95, metalness: 0.05 })
  );
  table.position.set(0, 0.85, 0);
  scene.add(table);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, 0.03, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.8 })
  );
  ring.position.set(0, 0.93, 0);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // --- Rig (move this for locomotion) ---
  const rig = new THREE.Group();
  rig.position.set(0, 0, 3.2);
  rig.add(camera);
  scene.add(rig);

  camera.lookAt(0, 1.0, 0);
  HUD("camera lookAt table ✅");

  // --- Controllers + lasers ---
  const controller0 = renderer.xr.getController(0);
  const controller1 = renderer.xr.getController(1);
  rig.add(controller0);
  rig.add(controller1);

  const grip0 = renderer.xr.getControllerGrip(0);
  const grip1 = renderer.xr.getControllerGrip(1);
  rig.add(grip0);
  rig.add(grip1);

  function makeLaser(color = 0xff3bd1) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geom, mat);
    line.name = "laser";
    line.scale.z = 5;
    return line;
  }
  controller0.add(makeLaser(0xff3bd1));
  controller1.add(makeLaser(0x39b6ff));

  const ray = new THREE.Raycaster();
  const tmpMat = new THREE.Matrix4();

  // --- XR events ---
  renderer.xr.addEventListener("sessionstart", () => HUD("XR sessionstart ✅"));
  renderer.xr.addEventListener("sessionend", () => HUD("XR sessionend ✅"));

  // --- Resize ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Locomotion fallback (gamepad axes) ---
  const moveState = { speed: 1.8, snap: Math.PI / 6, snapCooldown: 0 };

  function getStick(gp) {
    if (!gp || !gp.axes || gp.axes.length < 2) return { x: 0, y: 0 };
    // prefer left stick if possible (axes 0/1), else best pair
    const a = gp.axes;
    let best = [0, 1], bestMag = Math.abs(a[0]) + Math.abs(a[1]);
    for (let i = 0; i + 1 < a.length; i += 2) {
      const mag = Math.abs(a[i]) + Math.abs(a[i + 1]);
      if (mag > bestMag) { best = [i, i + 1]; bestMag = mag; }
    }
    return { x: a[best[0]] || 0, y: a[best[1]] || 0 };
  }

  function getSnapAxis(gp) {
    if (!gp || !gp.axes) return 0;
    // try right stick x (axis 2), else axis 0
    return gp.axes.length >= 3 ? (gp.axes[2] || 0) : (gp.axes[0] || 0);
  }

  // --- HARD REQUIREMENT: always render in 2D even before VR ---
  // We'll run setAnimationLoop always (works for both 2D and XR)
  let last = performance.now();
  let tick = 0;

  renderer.setAnimationLoop((t) => {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    tick++;

    // XR input + movement
    const session = renderer.xr.getSession?.();
    if (session) {
      // periodic XR input report
      if (DIAG && tick % 60 === 0) {
        HUD(`XR inputSources=${(session.inputSources && session.inputSources.length) || 0}`);
      }

      // find a gamepad
      let gp = null;
      for (const s of session.inputSources || []) {
        if (s && s.gamepad) { gp = s.gamepad; break; }
      }

      if (gp) {
        const stick = getStick(gp);
        const dead = 0.12;
        const sx = Math.abs(stick.x) > dead ? stick.x : 0;
        const sy = Math.abs(stick.y) > dead ? stick.y : 0;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        right.y = 0; right.normalize();

        // typical: up=-1 => forward, so invert
        rig.position.addScaledVector(forward, (-sy) * moveState.speed * dt);
        rig.position.addScaledVector(right, (sx) * moveState.speed * dt);

        moveState.snapCooldown = Math.max(0, moveState.snapCooldown - dt);
        const ax = getSnapAxis(gp);
        if (moveState.snapCooldown === 0 && Math.abs(ax) > 0.7) {
          rig.rotation.y += (ax > 0 ? -1 : 1) * moveState.snap;
          moveState.snapCooldown = 0.25;
        }
      }

      // lasers hit floor (visual proof controllers alive)
      for (const c of [controller0, controller1]) {
        tmpMat.identity().extractRotation(c.matrixWorld);
        ray.ray.origin.setFromMatrixPosition(c.matrixWorld);
        ray.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat);
        const hits = ray.intersectObject(floor, false);
        const line = c.getObjectByName("laser");
        if (line) line.scale.z = hits.length ? hits[0].distance : 5;
      }
    }

    renderer.render(scene, camera);
  });

  HUD("render loop installed ✅ (2D + XR)");

  // One immediate render to avoid “blank first frame” on some browsers
  try { renderer.render(scene, camera); } catch (e) {}

  HUD("world ready ✅");
}

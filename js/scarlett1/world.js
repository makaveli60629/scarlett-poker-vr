// /js/scarlett1/world.js
// SCARLETT1_WORLD_FULL_v4_6_VISUAL_NAV_SAFE
// - Bright world (no black void)
// - Big floor + grid for orientation
// - Clear table landmark
// - Simple locomotion support
// - GestureControl tableHeight aligned

import GestureControl from "../modules/gestureControl.js";

export async function bootWorld({ THREE, scene, renderer, camera, engine }) {
  const log = (s) => {
    try { window.__scarlettDiagWrite?.(String(s)); } catch (_) {}
    console.log("[world]", s);
  };

  log("bootWorld… SCARLETT1_WORLD_FULL_v4_6_VISUAL_NAV_SAFE");

  /* =========================
     LIGHTING (CRITICAL)
  ========================= */
  scene.background = new THREE.Color(0x0b0e14);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 1.2);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(4, 8, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-4, 3, -4);
  scene.add(fill);

  /* =========================
     FLOOR + GRID (ORIENTATION)
  ========================= */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0x1a1f2b,
      roughness: 1,
      metalness: 0
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = "SCARLETT_FLOOR";
  scene.add(floor);

  const grid = new THREE.GridHelper(200, 200, 0x3a3f55, 0x23283a);
  grid.position.y = 0.01;
  scene.add(grid);

  /* =========================
     TABLE (VISUAL ANCHOR)
  ========================= */
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.15, 48),
    new THREE.MeshStandardMaterial({
      color: 0x145a32,
      roughness: 0.85
    })
  );
  table.position.set(0, 0.78, -1.5);
  table.name = "POKER_TABLE";
  scene.add(table);

  const tableRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.03, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0xc9a23f })
  );
  tableRing.rotation.x = Math.PI / 2;
  tableRing.position.set(0, 0.86, -1.5);
  scene.add(tableRing);

  /* =========================
     ALIGN GESTURE SYSTEM
  ========================= */
  GestureControl.tableHeight = table.position.y;
  window.SCARLETT = window.SCARLETT || {};
  window.SCARLETT.GestureControl = GestureControl;

  log(`GestureControl ✅ tableHeight=${GestureControl.tableHeight.toFixed(3)}`);

  /* =========================
     BASIC LOCOMOTION (RIGHT STICK)
     Forward / backward only (safe)
  ========================= */
  const rig = new THREE.Group();
  rig.position.set(0, 0, 0);
  rig.add(camera);
  scene.add(rig);

  const move = {
    speed: 1.8 // meters per second
  };

  renderer.xr.addEventListener("sessionstart", () => {
    const session = renderer.xr.getSession();
    if (!session) return;

    session.addEventListener("inputsourceschange", () => {
      log("XR input sources updated");
    });
  });

  function updateLocomotion(dt) {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const src of session.inputSources) {
      if (!src.gamepad || src.handedness !== "right") continue;

      const gp = src.gamepad;
      const yAxis = gp.axes[3] ?? gp.axes[1]; // forward/back

      if (Math.abs(yAxis) > 0.15) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();

        rig.position.addScaledVector(dir, -yAxis * move.speed * dt);
      }
    }
  }

  /* =========================
     UPDATE LOOP
  ========================= */
  return {
    tableHeight: table.position.y,
    update(dt) {
      updateLocomotion(dt);
    }
  };
    }

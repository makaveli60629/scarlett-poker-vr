export function createLocomotionModule(opts = {}) {
  const teleportEnabled = !!opts.teleportEnabled;

  let _ray = null;
  let _rayDot = null;
  let _move = { x: 0, y: 0 };
  let _turn = 0;
  let _cooldown = 0;

  function makeLaser(THREE) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(0,0,-1)
    ]);
    const m = new THREE.LineBasicMaterial({ color: 0xff3344 });
    const line = new THREE.Line(g, m);
    line.scale.z = 6;
    return line;
  }

  function getGamepad(controller) {
    // Three.js XRController has .gamepad on some browsers; else check inputSource
    return controller?.gamepad || null;
  }

  return {
    name: "locomotion_xr",
    async init(ctx) {
      const { THREE, scene, controller1, controller2 } = ctx;

      // Laser on left controller by default (your issue was “left does nothing”)
      _ray = makeLaser(THREE);
      controller2.add(_ray);

      // Dot on ground
      _rayDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xff3344, roughness: 0.4 })
      );
      _rayDot.visible = false;
      scene.add(_rayDot);

      // Events (Quest: trigger/grip)
      const onSelectStart = (e) => (e.target.userData.selecting = true);
      const onSelectEnd = (e) => (e.target.userData.selecting = false);
      const onSqueezeStart = (e) => (e.target.userData.squeezing = true);
      const onSqueezeEnd = (e) => (e.target.userData.squeezing = false);

      controller1.addEventListener("selectstart", onSelectStart);
      controller1.addEventListener("selectend", onSelectEnd);
      controller2.addEventListener("selectstart", onSelectStart);
      controller2.addEventListener("selectend", onSelectEnd);

      controller1.addEventListener("squeezestart", onSqueezeStart);
      controller1.addEventListener("squeezeend", onSqueezeEnd);
      controller2.addEventListener("squeezestart", onSqueezeStart);
      controller2.addEventListener("squeezeend", onSqueezeEnd);
    },

    update(dt, ctx) {
      const { THREE, renderer, scene, rig, camera, controller1, controller2 } = ctx;

      // Read sticks (Quest: left stick usually on controller1 in many mappings, but not always)
      const gp1 = getGamepad(controller1);
      const gp2 = getGamepad(controller2);

      // Heuristic: whichever gamepad has axes, use:
      // - Move from the one that feels like left stick (axes[2/3] or [0/1])
      // - Turn from the other or right stick
      const axes1 = gp1?.axes?.length ? gp1.axes : null;
      const axes2 = gp2?.axes?.length ? gp2.axes : null;

      // Default mapping: controller1 move, controller2 turn
      let mx = 0, my = 0, tx = 0;
      if (axes1) { mx = axes1[2] ?? axes1[0] ?? 0; my = axes1[3] ?? axes1[1] ?? 0; }
      if (axes2) { tx = axes2[2] ?? axes2[0] ?? 0; }

      // If one controller has no axes, swap
      if (!axes1 && axes2) { mx = axes2[2] ?? axes2[0] ?? 0; my = axes2[3] ?? axes2[1] ?? 0; tx = 0; }

      _move.x = mx;
      _move.y = my;
      _turn = tx;

      // Smooth move
      const dead = 0.16;
      const speed = 2.1; // m/s
      const sx = Math.abs(_move.x) > dead ? _move.x : 0;
      const sy = Math.abs(_move.y) > dead ? _move.y : 0;

      if (sx || sy) {
        // move in camera heading
        const yaw = new THREE.Euler(0, camera.rotation.y, 0, "YXZ");
        const fwd = new THREE.Vector3(0, 0, -1).applyEuler(yaw);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(yaw);
        const v = new THREE.Vector3()
          .addScaledVector(right, sx)
          .addScaledVector(fwd, sy)
          .multiplyScalar(speed * dt);
        rig.position.add(v);
      }

      // Snap turn
      _cooldown = Math.max(0, _cooldown - dt);
      const snap = 0.52;
      const snapAngle = THREE.MathUtils.degToRad(30);
      if (_cooldown <= 0 && Math.abs(_turn) > snap) {
        rig.rotation.y -= Math.sign(_turn) * snapAngle;
        _cooldown = 0.22;
      }

      // Teleport raycast (grip)
      _rayDot.visible = false;
      if (teleportEnabled) {
        const griping = !!(controller2.userData.squeezing || controller1.userData.squeezing);
        if (griping) {
          const from = new THREE.Vector3();
          const dir = new THREE.Vector3(0,0,-1);
          const c = controller2.userData.squeezing ? controller2 : controller1;
          c.getWorldPosition(from);
          dir.applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion()));

          // intersect with floor plane y=0
          if (Math.abs(dir.y) > 1e-4) {
            const t = (0 - from.y) / dir.y;
            if (t > 0 && t < 30) {
              const hit = from.clone().addScaledVector(dir, t);
              _rayDot.visible = true;
              _rayDot.position.copy(hit);
              // commit teleport on trigger while gripping
              const selecting = !!(controller2.userData.selecting || controller1.userData.selecting);
              if (selecting) {
                rig.position.x = hit.x;
                rig.position.z = hit.z;
              }
            }
          }
        }
      }
    }
  };
}

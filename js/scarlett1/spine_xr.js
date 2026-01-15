// js/scarlett1/spine_xr.js — Scarlett XR Controls (FULL • SAFE)
// Usage: XRSpine.install({ THREE, renderer, scene, rig, camera, floorMeshes, log })

export const XRSpine = (() => {
  function install(ctx) {
    const { THREE, renderer, scene, rig, camera } = ctx;
    const log = ctx.log || console.log;
    const floorMeshes = ctx.floorMeshes || [];

    if (!renderer || !renderer.xr) {
      log("[xr] no renderer.xr, skipping");
      return { update(){} };
    }

    log("[xr] installing ✅");

    // Controllers
    const c1 = renderer.xr.getController(0);
    const c2 = renderer.xr.getController(1);
    rig.add(c1);
    rig.add(c2);

    // Simple laser line
    function makeLaser(color = 0xff77ff) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0,0,0),
        new THREE.Vector3(0,0,-1)
      ]);
      const m = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.9 });
      const line = new THREE.Line(g, m);
      line.scale.z = 12;
      return line;
    }

    const laserR = makeLaser(0xff55ff);
    const laserL = makeLaser(0x55aaff);
    c1.add(laserR);
    c2.add(laserL);

    // Teleport reticle + arc-ish marker
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x77bbff, transparent:true, opacity:0.9, side:THREE.DoubleSide })
    );
    reticle.rotation.x = -Math.PI/2;
    reticle.visible = false;
    scene.add(reticle);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const tmpMat = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpDir = new THREE.Vector3();

    // Movement state
    let snapCooldown = 0;
    const SNAP = Math.PI / 4; // 45 deg
    const MOVE_SPEED = 2.0;

    // Right-hand gamepad is usually controller(0) but varies; we'll detect by reading both.
    function getPads() {
      const s = renderer.xr.getSession?.();
      if (!s) return [];
      return s.inputSources || [];
    }

    function findGamepads() {
      const sources = getPads();
      return sources
        .map((src) => src.gamepad ? ({ src, gp: src.gamepad }) : null)
        .filter(Boolean);
    }

    // Teleport state
    let teleActive = false;
    let teleHit = null;

    function doTeleportHit(ctrl) {
      tmpMat.identity().extractRotation(ctrl.matrixWorld);
      tmpPos.setFromMatrixPosition(ctrl.matrixWorld);
      tmpDir.set(0,0,-1).applyMatrix4(tmpMat).normalize();

      raycaster.set(tmpPos, tmpDir);
      raycaster.far = 50;

      const hits = raycaster.intersectObjects(floorMeshes, true);
      if (hits && hits.length) {
        teleHit = hits[0].point.clone();
        reticle.position.copy(teleHit);
        reticle.visible = true;
        return true;
      }
      teleHit = null;
      reticle.visible = false;
      return false;
    }

    // Update loop
    function update(dt) {
      if (!renderer.xr.isPresenting) {
        reticle.visible = false;
        return;
      }

      // read gamepads
      const pads = findGamepads();

      // choose "right hand" pad: first pad with axes
      const gp = pads[0]?.gp;
      if (gp) {
        const ax0 = gp.axes?.[0] || 0; // left/right
        const ax1 = gp.axes?.[1] || 0; // forward/back

        // SNAP TURN on X
        snapCooldown -= dt;
        if (snapCooldown <= 0) {
          if (ax0 > 0.65) { rig.rotation.y -= SNAP; snapCooldown = 0.22; }
          if (ax0 < -0.65) { rig.rotation.y += SNAP; snapCooldown = 0.22; }
        }

        // MOVE on Y (camera-forward always)
        const move = -ax1; // pushing up usually negative
        if (Math.abs(move) > 0.18) {
          const yaw = camera.rotation.y + rig.rotation.y; // camera yaw inside rig + rig yaw
          const fwd = new THREE.Vector3(Math.sin(rig.rotation.y), 0, Math.cos(rig.rotation.y));
          rig.position.addScaledVector(fwd, move * MOVE_SPEED * dt);
        }
      }

      // Teleport: use RIGHT trigger from controller(0)
      // buttons[0] often trigger; some devices use [1]
      const gp0 = pads[0]?.gp;
      const trig = gp0?.buttons?.[0]?.pressed || gp0?.buttons?.[1]?.pressed || false;

      if (trig && !teleActive) {
        teleActive = true;
      }
      if (!trig && teleActive) {
        // release = teleport if valid hit
        teleActive = false;
        if (teleHit) {
          rig.position.set(teleHit.x, 1.65, teleHit.z);
          reticle.visible = false;
          teleHit = null;
        }
      }

      // while held: update target
      if (teleActive) {
        doTeleportHit(c1);
      } else {
        reticle.visible = false;
        teleHit = null;
      }
    }

    return { update };
  }

  return { install };
})();

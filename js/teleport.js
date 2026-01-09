// /js/teleport.js — Scarlett Teleport v2.0 (Pads + Enable Toggle)
export const Teleport = {
  init({ THREE, scene, renderer, camera, player, controllers, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const raycaster = new THREE.Raycaster();
    const tempMat = new THREE.Matrix4();
    const tempDir = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();

    const state = { enabled: true, lastHitOK: false, t: 0 };

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.44, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    // teleportable surfaces
    const teleTargets = [];
    if (world?.floor) teleTargets.push(world.floor);
    scene.traverse((o) => { if (o?.isMesh && (o.name === "Floor" || o.name === "floor")) teleTargets.push(o); });

    function controllerRay(controller) {
      tempMat.identity().extractRotation(controller.matrixWorld);
      tempDir.set(0, 0, -1).applyMatrix4(tempMat).normalize();
      const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      raycaster.set(origin, tempDir);
      raycaster.far = 30;
      return raycaster;
    }

    function updateMarker() {
      if (!state.enabled) { marker.visible = false; state.lastHitOK = false; return; }

      const c = controllers[1] || controllers[0];
      if (!c) return;

      const rc = controllerRay(c);
      const hits = rc.intersectObjects(teleTargets.length ? teleTargets : [world?.group || scene], true);

      if (hits && hits.length) {
        hitPoint.copy(hits[0].point);
        marker.position.set(hitPoint.x, 0.02, hitPoint.z);
        marker.visible = true;
        state.lastHitOK = true;
      } else {
        marker.visible = false;
        state.lastHitOK = false;
      }
    }

    function doTeleportTo(pos) {
      player.position.set(pos.x, 0, pos.z);
      L("[teleport] moved ✅");
    }

    function doTeleport() {
      if (!state.enabled) return;

      // If aiming at pad: teleport to pad.dest
      const c = controllers[1] || controllers[0];
      if (c && world?.pads?.length) {
        const rc = controllerRay(c);
        const hits = rc.intersectObjects(world.pads, true);
        if (hits?.length) {
          const pad = hits[0].object?.parent;
          const dest = pad?.userData?.dest;
          if (dest) return doTeleportTo(dest);
        }
      }

      // Else: teleport to marker hit
      if (!state.lastHitOK) return;
      doTeleportTo(marker.position);
    }

    // trigger
    for (const c of controllers) {
      c.addEventListener("selectstart", doTeleport);
      c.addEventListener("squeezestart", doTeleport);
    }

    // Walk-on pads (no controller needed)
    function checkPadWalkOn() {
      if (!world?.pads?.length) return;
      for (const p of world.pads) {
        const r = p.userData?.r || 0.55;
        const dx = player.position.x - p.position.x;
        const dz = player.position.z - p.position.z;
        if ((dx*dx + dz*dz) <= (r*r)) {
          const dest = p.userData?.dest;
          if (dest) doTeleportTo(dest);
          break;
        }
      }
    }

    function setEnabled(v) {
      state.enabled = !!v;
      marker.visible = false;
    }

    L("[teleport] ready ✅");

    return {
      setEnabled,
      update() {
        state.t += 0.016;
        updateMarker();
        checkPadWalkOn();
        if (marker.visible) marker.material.opacity = 0.65 + Math.sin(state.t * 4.0) * 0.18;
      }
    };
  }
};

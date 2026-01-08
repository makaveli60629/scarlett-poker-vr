// /js/teleport.js — simple, reliable teleport for Quest/WebXR (v1.1)
// Adds: setEnabled(on/off) so HUD can disable teleport.

export const Teleport = {
  init({ THREE, scene, renderer, camera, player, controllers, log, world }) {
    const raycaster = new THREE.Raycaster();
    const tempMat = new THREE.Matrix4();
    const tempDir = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();

    const state = { enabled: true, lastHitOK: false };

    // Teleport marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    // Determine teleportable surfaces
    const teleTargets = [];
    if (world?.floor) teleTargets.push(world.floor);
    scene.traverse((o) => {
      if (o?.isMesh && (o.name === "Floor" || o.name === "floor")) teleTargets.push(o);
    });

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

    function doTeleport() {
      if (!state.enabled) return;
      if (!state.lastHitOK) return;
      player.position.set(marker.position.x, 0, marker.position.z);
      log("[teleport] moved ✅");
    }

    for (const c of controllers) {
      c.addEventListener("selectstart", doTeleport);
      c.addEventListener("squeezestart", doTeleport);
    }

    log("[teleport] ready ✅");

    return {
      setEnabled(v) {
        state.enabled = !!v;
        if (!state.enabled) marker.visible = false;
      },
      update() {
        updateMarker();
        if (!marker.visible) return;
        marker.userData.t = (marker.userData.t || 0) + 0.016;
        marker.material.opacity = 0.65 + Math.sin(marker.userData.t * 4.0) * 0.18;
      }
    };
  }
};

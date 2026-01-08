// /js/teleport.js — simple, reliable teleport for Quest/WebXR
export const Teleport = {
  init({ THREE, scene, renderer, camera, player, controllers, log, world }) {
    const raycaster = new THREE.Raycaster();
    const tempMat = new THREE.Matrix4();
    const tempDir = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();

    // Teleport marker
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    // Determine teleportable surfaces:
    // Prefer world.floor if provided; else find big plane-like meshes (fallback)
    const teleTargets = [];
    if (world?.floor) teleTargets.push(world.floor);
    // Fallback: anything named Floor
    scene.traverse((o) => {
      if (o?.isMesh && (o.name === "Floor" || o.name === "floor")) teleTargets.push(o);
    });

    let lastHitOK = false;

    function controllerRay(controller) {
      tempMat.identity().extractRotation(controller.matrixWorld);
      tempDir.set(0, 0, -1).applyMatrix4(tempMat).normalize();
      const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      raycaster.set(origin, tempDir);
      raycaster.far = 30;
      return raycaster;
    }

    function updateMarker() {
      // Use right hand by default if exists, else left
      const c = controllers[1] || controllers[0];
      if (!c) return;

      const rc = controllerRay(c);
      const hits = rc.intersectObjects(teleTargets.length ? teleTargets : [world?.group || scene], true);

      if (hits && hits.length) {
        hitPoint.copy(hits[0].point);
        marker.position.set(hitPoint.x, 0.02, hitPoint.z);
        marker.visible = true;
        lastHitOK = true;
      } else {
        marker.visible = false;
        lastHitOK = false;
      }
    }

    function doTeleport() {
      if (!lastHitOK) return;
      // Move rig to marker, preserving user height from XR
      player.position.set(marker.position.x, 0, marker.position.z);
      log("[teleport] moved ✅");
    }

    // Trigger teleport
    for (const c of controllers) {
      c.addEventListener("selectstart", doTeleport);
      // also allow squeeze
      c.addEventListener("squeezestart", doTeleport);
    }

    log("[teleport] ready ✅");

    return {
      update() {
        updateMarker();
        // Pulse marker
        marker.userData.t = (marker.userData.t || 0) + 0.016;
        marker.material.opacity = 0.65 + Math.sin(marker.userData.t * 4.0) * 0.18;
      }
    };
  }
};

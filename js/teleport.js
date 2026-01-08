// /js/teleport.js — Scarlett Teleport v1.2
// Teleport uses SQUEEZE (grip). SELECT is reserved for "Action" interactions.

export const Teleport = {
  init({ THREE, scene, renderer, player, controllers, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const raycaster = new THREE.Raycaster();
    const tempMat = new THREE.Matrix4();
    const tempDir = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();

    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);

    const teleTargets = [];
    if (world?.floor) teleTargets.push(world.floor);
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
      if (!world?.flags?.teleport) { marker.visible = false; lastHitOK = false; return; }

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
      if (!world?.flags?.teleport) return;
      if (!lastHitOK) return;

      // IMPORTANT: keep standing height; do NOT mess with camera.y here.
      player.position.set(marker.position.x, 0, marker.position.z);
      L("[teleport] moved ✅");
    }

    // Teleport = squeeze
    for (const c of controllers) {
      c.addEventListener("squeezestart", doTeleport);
    }

    L("[teleport] ready ✅ (squeeze=teleport, select=action)");

    return {
      update(dt = 0.016) {
        updateMarker();
        marker.userData.t = (marker.userData.t || 0) + dt;
        marker.material.opacity = 0.65 + Math.sin(marker.userData.t * 4.0) * 0.18;
      }
    };
  }
};

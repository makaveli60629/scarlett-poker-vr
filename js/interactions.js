// js/interactions.js
import * as THREE from "three";

export const Interactions = {
  init({ scene, camera, renderer, playerGroup, HUD }) {

    const raycaster = new THREE.Raycaster();
    const tempMatrix = new THREE.Matrix4();

    let reticle = null;

    // ===============================
    // RETICLE
    // ===============================
    const reticleGeo = new THREE.RingGeometry(0.08, 0.12, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide
    });

    reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);

    // ===============================
    // FLOOR DETECTION
    // ===============================
    function findFloor(intersections) {
      for (const hit of intersections) {
        if (hit.face && hit.face.normal.y > 0.7) {
          return hit;
        }
      }
      return null;
    }

    // ===============================
    // TELEPORT
    // ===============================
    function teleportTo(point) {
      playerGroup.position.set(point.x, 0, point.z);
    }

    // ===============================
    // UPDATE LOOP
    // ===============================
    function update() {

      // 🔒 ABSOLUTE SAFETY — NEVER CRASH
      if (!window || typeof window.actionId === "undefined") {
        window.actionId = null;
      }

      const action = window.actionId;

      // Desktop mouse teleport
      if (!renderer.xr.isPresenting) {
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
      } else {
        const controller = renderer.xr.getController(0);
        if (!controller) return;

        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      }

      const hits = raycaster.intersectObjects(scene.children, true);
      const floorHit = findFloor(hits);

      if (floorHit) {
        reticle.visible = true;
        reticle.position.copy(floorHit.point);

        // Teleport ONLY when explicitly requested
        if (action === "teleport") {
          teleportTo(floorHit.point);
          window.actionId = null; // reset after teleport
        }
      } else {
        reticle.visible = false;
      }
    }

    HUD?.log?.("Interactions ready.");

    return { update };
  }
};

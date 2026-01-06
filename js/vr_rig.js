// js/vr_rig.js — Scarlett Poker VR — CONTROLLER-LOCKED VR RIG (FINAL)
// Fixes:
// - Laser stuck in center
// - Teleport aiming wrong
// - Controller not visible
// - Raycast not following hand

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export const VRRig = {
  create({ renderer, scene, camera, player, hub }) {
    const rig = {};
    const tempMatrix = new THREE.Matrix4();

    // --- Controllers ---
    const controllerL = renderer.xr.getController(0);
    const controllerR = renderer.xr.getController(1);

    scene.add(controllerL);
    scene.add(controllerR);

    // --- Visible controller rays ---
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    const rayMat = new THREE.LineBasicMaterial({ color: 0x00ff88 });
    const rayL = new THREE.Line(rayGeo, rayMat);
    const rayR = new THREE.Line(rayGeo, rayMat);

    rayL.scale.z = 12;
    rayR.scale.z = 12;

    controllerL.add(rayL);
    controllerR.add(rayR);

    hub("VRRig: visuals ready");

    // --- Teleport Ring ---
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.35, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    // --- Raycaster ---
    const raycaster = new THREE.Raycaster();

    // --- Bounds ---
    let bounds = { minX: -999, maxX: 999, minZ: -999, maxZ: 999 };

    rig.setBounds = (b) => (bounds = b);

    // --- Height Lock ---
    let heightLock = 1.8;
    let lockHeight = true;

    rig.setHeightLock = (h, lock = true) => {
      heightLock = h;
      lockHeight = lock;
    };

    // --- Update Loop ---
    rig.update = () => {
      // lock player height
      if (lockHeight) player.position.y = 0;

      // RIGHT controller = teleport aim
      tempMatrix.identity().extractRotation(controllerR.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controllerR.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const hits = raycaster.intersectObjects(scene.children, true);

      let hitFloor = null;
      for (const h of hits) {
        if (h.object.userData.isFloor) {
          hitFloor = h;
          break;
        }
      }

      if (hitFloor) {
        ring.visible = true;
        ring.position.copy(hitFloor.point);
      } else {
        ring.visible = false;
      }
    };

    // --- Teleport on trigger ---
    controllerR.addEventListener("selectstart", () => {
      if (!ring.visible) return;

      const x = THREE.MathUtils.clamp(ring.position.x, bounds.minX, bounds.maxX);
      const z = THREE.MathUtils.clamp(ring.position.z, bounds.minZ, bounds.maxZ);

      player.position.set(x, 0, z);
    });

    return rig;
  },
};

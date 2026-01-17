// js/teleport.js — Teleport raycast to registered floor meshes
import * as THREE from 'three';

export const Teleport = (() => {
  const raycaster = new THREE.Raycaster();
  raycaster.far = 20;

  function create({ renderer, scene, camera, playerRig, floors, xrInput, diag }) {
    let enabled = false;
    let pending = false;

    const hitMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.22, 28),
      new THREE.MeshBasicMaterial({ transparent:true, opacity:0.85, side:THREE.DoubleSide })
    );
    hitMarker.rotation.x = -Math.PI/2;
    hitMarker.visible = false;
    scene.add(hitMarker);

    const tmpRay = new THREE.Ray();
    const hitPoint = new THREE.Vector3();

    function setEnabled(v) {
      enabled = !!v;
      hitMarker.visible = false;
      diag && diag.log(`[teleport] ${enabled ? 'ON' : 'OFF'}`);
      return enabled;
    }

    function toggle() { return setEnabled(!enabled); }

    function update() {
      if (!enabled) return;
      if (!floors || floors.length === 0) return;

      if (!xrInput.getRayFromRight(tmpRay)) return;
      raycaster.ray.copy(tmpRay);

      const hits = raycaster.intersectObjects(floors, true);
      if (hits && hits.length) {
        hitPoint.copy(hits[0].point);
        hitMarker.position.copy(hitPoint);
        hitMarker.visible = true;
      } else {
        hitMarker.visible = false;
      }
    }

    function doTeleport() {
      if (!enabled || !hitMarker.visible) return false;

      // Move rig so camera ends up at hit point (keep current head height)
      const camWorld = new THREE.Vector3();
      camera.getWorldPosition(camWorld);

      // Current rig world position
      const rigWorld = new THREE.Vector3();
      playerRig.getWorldPosition(rigWorld);

      const delta = new THREE.Vector3().subVectors(hitMarker.position, camWorld);
      // Only translate on XZ plane
      delta.y = 0;

      playerRig.position.add(delta);

      diag && diag.log(`[teleport] moved to x=${hitMarker.position.x.toFixed(2)} z=${hitMarker.position.z.toFixed(2)}`);
      return true;
    }

    function bindTriggers() {
      const c1 = renderer.xr.getController(1);
      c1.addEventListener('selectstart', () => { pending = true; });
      c1.addEventListener('selectend', () => {
        if (!pending) return;
        pending = false;
        doTeleport();
      });
    }
    bindTriggers();

    return { toggle, setEnabled, update, get enabled(){ return enabled; } };
  }

  return { create };
})();

// /js/scarlett1/modules/xr/xr_grab_module.js
// Grip = grab/release only. Cards are blocked by userData.grabbable=false.

export function createXRGrabModule({
  distance = 3.25,
  gripDown = 0.55,
  gripUp = 0.35,
} = {}) {
  const held = { left: null, right: null };
  const prev = { left: 0, right: 0 };

  return {
    name: "xr_grab",
    update(ctx, { input }) {
      if (!ctx.xrSession) return;

      const THREE = ctx.THREE;
      const raycaster = new THREE.Raycaster();

      function getCtrl(hand) {
        return hand === "left" ? ctx.controllers.left : ctx.controllers.right;
      }

      function rayFrom(hand) {
        const ctrl = getCtrl(hand);
        if (!ctrl) return null;

        const origin = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        ctrl.getWorldPosition(origin);
        ctrl.getWorldQuaternion(quat);

        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
        return { origin, dir };
      }

      function findHit(hand) {
        const r = rayFrom(hand);
        if (!r) return null;

        raycaster.set(r.origin, r.dir);
        raycaster.far = distance;

        const hits = raycaster.intersectObjects(ctx.interactables, true);
        for (const h of hits) {
          if (ctx.canGrab(h.object)) return h.object;
        }
        return null;
      }

      function attach(obj, hand) {
        const ctrl = getCtrl(hand);
        if (!ctrl) return;

        obj.updateMatrixWorld(true);
        const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
        const wq = new THREE.Quaternion(); obj.getWorldQuaternion(wq);

        ctrl.add(obj);
        obj.position.copy(ctrl.worldToLocal(wp));
        obj.quaternion.copy(wq);

        held[hand] = obj;
        obj.userData = obj.userData || {};
        obj.userData.heldBy = hand;
      }

      function release(hand) {
        const obj = held[hand];
        if (!obj) return;

        obj.updateMatrixWorld(true);
        const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
        const wq = new THREE.Quaternion(); obj.getWorldQuaternion(wq);

        ctx.scene.add(obj);
        obj.position.copy(wp);
        obj.quaternion.copy(wq);

        obj.userData.heldBy = null;
        held[hand] = null;
      }

      for (const hand of ["left", "right"]) {
        const g = input[hand].grip;
        const down = (g > gripDown && prev[hand] <= gripDown);
        const up = (g <= gripUp && prev[hand] > gripUp);

        if (down && !held[hand]) {
          const obj = findHit(hand);
          if (obj) attach(obj, hand);
        }
        if (up && held[hand]) release(hand);

        prev[hand] = g;
      }
    }
  };
}

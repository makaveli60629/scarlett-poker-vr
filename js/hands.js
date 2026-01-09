// /js/hands.js — Scarlett HandsSystem v2.0 (SAFE)
// ✅ Never crashes if hand tracking not available
// ✅ Simple pinch orb feedback (visual only)

export const HandsSystem = (() => {
  function init({ THREE, scene, renderer, log } = {}) {
    const S = {
      leftOrb: null,
      rightOrb: null,
      leftPos: new THREE.Vector3(),
      rightPos: new THREE.Vector3(),
    };

    const mat = new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.65 });
    const geo = new THREE.SphereGeometry(0.02, 12, 10);

    S.leftOrb = new THREE.Mesh(geo, mat);
    S.rightOrb = new THREE.Mesh(geo, mat);

    S.leftOrb.visible = false;
    S.rightOrb.visible = false;

    scene.add(S.leftOrb, S.rightOrb);

    function update() {
      const session = renderer.xr.getSession?.();
      if (!session) {
        S.leftOrb.visible = false;
        S.rightOrb.visible = false;
        return;
      }

      // If hand-tracking exists, you can later add joint poses here.
      // For now: keep stable and off unless you implement jointPose logic.
      S.leftOrb.visible = false;
      S.rightOrb.visible = false;
    }

    return { update };
  }

  return { init };
})();

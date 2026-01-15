// /js/core/controls.js — Scarlett XR Locomotion (FULL / GitHub Pages Safe)
// ❌ No import "three"
// ✅ uses window.THREE injected by boot2

export const Controls = (() => {

  function applyLocomotion(ctx, dt = 0.016) {
    const { renderer, player, controllers, camera } = ctx;
    if (!renderer?.xr?.isPresenting) return;

    const THREE = window.THREE;
    if (!THREE) return;

    // pick a controller that has a gamepad
    const src = controllers?.c0?.gamepad ? controllers.c0 : (controllers?.c1?.gamepad ? controllers.c1 : null);
    if (!src?.gamepad) return;

    const axes = src.gamepad.axes || [];
    let x = 0, z = 0;

    // Quest commonly: axes[2], axes[3] for right stick (or movement stick depending on mapping)
    if (axes.length >= 4) {
      x = axes[2] || 0;
      z = axes[3] || 0;
    } else if (axes.length >= 2) {
      x = axes[0] || 0;
      z = axes[1] || 0;
    }

    const dead = 0.15;
    if (Math.abs(x) < dead) x = 0;
    if (Math.abs(z) < dead) z = 0;
    if (!x && !z) return;

    const speed = 2.4; // m/s

    // Movement relative to camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const delta = new THREE.Vector3()
      .addScaledVector(forward, -z * speed * dt)
      .addScaledVector(right,   x * speed * dt);

    player.position.add(delta);
  }

  return { applyLocomotion };
})();

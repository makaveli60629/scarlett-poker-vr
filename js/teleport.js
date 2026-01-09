// /js/teleport.js — Scarlett Teleport v2.2
// - Teleport ray from controller
// - Teleport to pads by name (PadPoker, PadStore, PadStoreInside)
// - Uses HUD toggle scarlett-toggle-teleport

export const Teleport = (() => {
  function init({ THREE, scene, renderer, camera, player, controllers, log, world } = {}) {
    const state = {
      enabled: !!(window.__SCARLETT_FLAGS?.teleport ?? true),
      raycaster: new THREE.Raycaster(),
      tempMat: new THREE.Matrix4(),
      dir: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      marker: null,
      active: false,
      target: null
    };

    window.addEventListener("scarlett-toggle-teleport", (e) => state.enabled = !!e.detail);

    // Marker
    state.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    state.marker.rotation.x = -Math.PI/2;
    state.marker.visible = false;
    scene.add(state.marker);

    function getXRGamepads() {
      const s = renderer.xr.getSession?.();
      if (!s) return [];
      const out = [];
      for (const src of s.inputSources) if (src?.gamepad) out.push(src);
      return out;
    }

    function tryPadTeleport() {
      if (!state.target) return false;
      const name = state.target.name;

      if (name === "PadStore") {
        player.position.set(world?.destStore?.x ?? 0, 0, world?.destStore?.z ?? 0);
        return true;
      }
      if (name === "PadStoreInside") {
        player.position.set(world?.destStore?.x ?? 0, 0, world?.destStore?.z ?? 0);
        return true;
      }
      if (name === "PadPoker") {
        player.position.set(world?.destPoker?.x ?? 0, 0, world?.destPoker?.z ?? -4);
        return true;
      }
      return false;
    }

    function update() {
      const presenting = !!renderer.xr.isPresenting;
      if (!presenting || !state.enabled) {
        state.marker.visible = false;
        return;
      }

      // Use right controller if present, else left
      const ctrl = controllers?.[1] || controllers?.[0];
      if (!ctrl) return;

      // Build ray from controller
      state.tempMat.identity().extractRotation(ctrl.matrixWorld);
      state.dir.set(0, 0, -1).applyMatrix4(state.tempMat).normalize();

      const origin = new THREE.Vector3().setFromMatrixPosition(ctrl.matrixWorld);
      state.raycaster.set(origin, state.dir);

      // Intersect pads first
      const pads = ["PadPoker", "PadStore", "PadStoreInside"]
        .map(n => world?.findPadByName?.(n))
        .filter(Boolean);

      const hits = state.raycaster.intersectObjects(pads, true);
      if (hits?.length) {
        state.marker.visible = true;
        state.marker.position.copy(hits[0].point);
        state.target = hits[0].object;
      } else {
        // fallback: floor plane y=0
        const t = (0 - origin.y) / state.dir.y;
        if (t > 0 && isFinite(t)) {
          state.hit.copy(origin).addScaledVector(state.dir, t);
          state.marker.visible = true;
          state.marker.position.copy(state.hit);
          state.target = null;
        } else {
          state.marker.visible = false;
        }
      }

      // Confirm teleport on trigger
      const srcs = getXRGamepads();
      let trigger = false;
      for (const s of srcs) {
        if (s.handedness === "right") trigger = !!s.gamepad?.buttons?.[0]?.pressed;
      }

      if (trigger && state.marker.visible) {
        if (state.target && tryPadTeleport()) {
          // ok
        } else {
          player.position.set(state.marker.position.x, 0, state.marker.position.z);
        }
        state.marker.visible = false;
      }
    }

    return { update };
  }

  return { init };
})();

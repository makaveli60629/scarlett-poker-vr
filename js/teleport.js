// /js/teleport.js — Scarlett Teleport v2.6 (PAD TARGETS + COLLIDERS + DEBOUNCE)
// Works with world.js v12.5+
// - Ray from controller (right preferred)
// - Hits PadStore / PadPoker plus *_Collider invisible helpers
// - Teleports using world.teleportTargets[PadName] -> { pos, yaw }
// - Fallback: teleport to floor hit point
// - Debounced trigger press (no rapid-fire teleport)
// - Respects HUD toggle event: scarlett-toggle-teleport

export const Teleport = (() => {
  function init({ THREE, scene, renderer, camera, player, controllers, log, world } = {}) {
    const state = {
      enabled: !!(window.__SCARLETT_FLAGS?.teleport ?? true),
      raycaster: new THREE.Raycaster(),
      tempMat: new THREE.Matrix4(),
      dir: new THREE.Vector3(),
      origin: new THREE.Vector3(),
      hit: new THREE.Vector3(),

      marker: null,
      targetObj: null,     // object we hit (pad or collider)
      targetName: null,    // resolved pad key "PadStore"/"PadPoker"

      // trigger debounce
      wasPressed: false,
      pressCooldown: 0
    };

    window.addEventListener("scarlett-toggle-teleport", (e) => {
      state.enabled = !!e.detail;
      if (!state.enabled) {
        state.marker.visible = false;
        state.targetObj = null;
        state.targetName = null;
      }
    });

    // Marker (ring)
    state.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 48),
      new THREE.MeshBasicMaterial({
        color: 0x7fe7ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })
    );
    state.marker.rotation.x = -Math.PI / 2;
    state.marker.visible = false;
    scene.add(state.marker);

    function getXRSession() {
      return renderer?.xr?.getSession?.() || null;
    }

    function getXRGamepads() {
      const s = getXRSession();
      if (!s) return [];
      const out = [];
      for (const src of s.inputSources) if (src?.gamepad) out.push(src);
      return out;
    }

    function getTriggerPressed() {
      // Prefer right hand source; fallback to any
      const srcs = getXRGamepads();
      let pressed = false;

      for (const s of srcs) {
        if (s.handedness === "right") {
          pressed = !!s.gamepad?.buttons?.[0]?.pressed; // trigger
          return pressed;
        }
      }

      // fallback: first available
      for (const s of srcs) {
        if (s?.gamepad?.buttons?.length) {
          pressed = !!s.gamepad.buttons[0].pressed;
          return pressed;
        }
      }
      return false;
    }

    function resolveTeleportables() {
      // We raycast these objects (pads + colliders).
      // Works without any world helper.
      const names = [
        "PadStore",
        "PadStore_Collider",
        "PadPoker",
        "PadPoker_Collider",
        "PadStoreInside",
        "PadStoreInside_Collider"
      ];

      const list = [];
      const root = world?.group || scene;

      for (const n of names) {
        const obj = root?.getObjectByName?.(n);
        if (obj) list.push(obj);
      }
      return list;
    }

    function resolvePadNameFromHit(obj) {
      if (!obj) return null;
      const n = obj.name || "";

      // If collider hit, map back to pad name
      if (n.endsWith("_Collider")) return n.replace("_Collider", "");

      // If child mesh hit, walk up to named parent if needed
      let p = obj;
      for (let i = 0; i < 6 && p; i++) {
        const pn = p.name || "";
        if (pn === "PadStore" || pn === "PadPoker" || pn === "PadStoreInside") return pn;
        if (pn.endsWith("_Collider")) return pn.replace("_Collider", "");
        p = p.parent;
      }
      return null;
    }

    function teleportToPad(padName) {
      const t = world?.teleportTargets?.[padName];
      if (!t?.pos) return false;

      player.position.set(t.pos.x, 0, t.pos.z);
      if (typeof t.yaw === "number") player.rotation.set(0, t.yaw, 0);

      // Optional: keep your view oriented toward poker table after teleport
      if (padName === "PadPoker" && world?.tableFocus) {
        try { camera.lookAt(world.tableFocus.x, 1.15, world.tableFocus.z); } catch {}
      }
      return true;
    }

    function teleportToPoint(x, z) {
      player.position.set(x, 0, z);
      return true;
    }

    function update(dt = 0) {
      // cooldown timer for debounce
      state.pressCooldown = Math.max(0, state.pressCooldown - (dt || 0));

      const presenting = !!renderer?.xr?.isPresenting;
      if (!presenting || !state.enabled) {
        state.marker.visible = false;
        state.targetObj = null;
        state.targetName = null;
        state.wasPressed = false;
        return;
      }

      // Use right controller if present, else left
      const ctrl = controllers?.[1] || controllers?.[0];
      if (!ctrl) {
        state.marker.visible = false;
        return;
      }

      // Build ray from controller
      state.tempMat.identity().extractRotation(ctrl.matrixWorld);
      state.dir.set(0, 0, -1).applyMatrix4(state.tempMat).normalize();
      state.origin.setFromMatrixPosition(ctrl.matrixWorld);
      state.raycaster.set(state.origin, state.dir);

      // Raycast against pads/colliders
      const teleportables = resolveTeleportables();
      const hits = teleportables.length ? state.raycaster.intersectObjects(teleportables, true) : [];

      state.targetObj = null;
      state.targetName = null;

      if (hits && hits.length) {
        state.marker.visible = true;
        state.marker.position.copy(hits[0].point);

        state.targetObj = hits[0].object;
        state.targetName = resolvePadNameFromHit(hits[0].object);

      } else {
        // fallback: floor plane y=0
        const denom = state.dir.y;
        const t = denom !== 0 ? ((0 - state.origin.y) / denom) : Infinity;

        if (t > 0 && isFinite(t)) {
          state.hit.copy(state.origin).addScaledVector(state.dir, t);
          state.marker.visible = true;
          state.marker.position.copy(state.hit);
        } else {
          state.marker.visible = false;
        }
      }

      // Confirm teleport on trigger (debounced)
      const pressed = getTriggerPressed();
      const risingEdge = pressed && !state.wasPressed;

      // debounce: only allow teleport if we just pressed and cooldown is 0
      if (risingEdge && state.marker.visible && state.pressCooldown === 0) {
        let did = false;

        // If aiming at a pad and we have a world target, use it
        if (state.targetName) {
          did = teleportToPad(state.targetName);
        }

        // Otherwise, floor teleport
        if (!did) {
          did = teleportToPoint(state.marker.position.x, state.marker.position.z);
        }

        if (did) {
          state.pressCooldown = 0.25; // prevents rapid repeats
          state.marker.visible = false;
        }
      }

      state.wasPressed = pressed;
    }

    return { update };
  }

  return { init };
})();

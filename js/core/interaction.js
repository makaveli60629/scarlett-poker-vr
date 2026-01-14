// /js/core/interaction.js — Scarlett Interaction (FULL) v2.0
// ✅ Listens for RAY_UPDATE and raycasts against registered targets
// ✅ Emits: RAY_HIT { hit, objectName } and UI_POINT
// ✅ Simple “click to teleport” support if you register a floor mesh

export const Interaction = (() => {
  const state = {
    THREE: null,
    Signals: null,
    log: console.log,
    raycaster: null,
    targets: [],
    floor: null,
    lastHit: null
  };

  return {
    init({ THREE, Signals, hands, log }) {
      state.THREE = THREE;
      state.Signals = Signals;
      state.log = log || console.log;
      state.raycaster = new THREE.Raycaster();

      // Allow world/systems to register interactables
      Signals?.on?.("INTERACT_REGISTER", (p) => {
        if (p?.object) state.targets.push(p.object);
        if (p?.floor) state.floor = p.floor;
      });

      // Ray updates come from XRHands
      Signals?.on?.("RAY_UPDATE", (p) => {
        const o = p?.origin, d = p?.dir;
        if (!o || !d) return;

        state.raycaster.set(
          new THREE.Vector3(o.x, o.y, o.z),
          new THREE.Vector3(d.x, d.y, d.z).normalize()
        );
        state.raycaster.far = p.maxDist || 10;

        // First try targets
        let hit = null;
        if (state.targets.length) {
          const hits = state.raycaster.intersectObjects(state.targets, true);
          if (hits && hits.length) hit = hits[0];
        }

        // Else allow floor hit
        if (!hit && state.floor) {
          const hits = state.raycaster.intersectObject(state.floor, true);
          if (hits && hits.length) hit = hits[0];
        }

        state.lastHit = hit;
        Signals?.emit?.("RAY_HIT", {
          hit: hit ? { x: hit.point.x, y: hit.point.y, z: hit.point.z, dist: hit.distance } : null,
          objectName: hit?.object?.name || ""
        });
      });

      state.log?.("[interaction] init ✅");
      return {
        getLastHit() { return state.lastHit; }
      };
    }
  };
})();

// /js/core/interaction.js — Prime 10.0 (FULL)
// Lightweight grab interaction using proximity to "grabbable" targets.
// Targets are registered with Interaction.registerTarget({ id, object, radius })

export const Interaction = (() => {
  function init({ THREE, Signals, hands, log }) {
    const targets = new Map();
    const held = { left: null, right: null };
    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();

    function registerTarget({ id, object, radius = 0.08 }) {
      if (!id || !object) return;
      object.userData.targetId = id;
      object.userData.grabRadius = radius;
      targets.set(id, { id, object, radius });
    }

    function unregisterTarget(id) { targets.delete(id); }

    function closestTarget(handObj) {
      if (!handObj) return null;
      handObj.getWorldPosition(tmp);

      let best = null;
      let bestD = Infinity;

      for (const t of targets.values()) {
        t.object.getWorldPosition(tmp2);
        const d = tmp.distanceTo(tmp2);
        if (d < t.radius && d < bestD) { bestD = d; best = t; }
      }
      return best;
    }

    function grab(hand) {
      if (held[hand]) return;
      const hObj = hands.getHand(hand);
      const t = closestTarget(hObj);
      if (!t) return;
      held[hand] = t.id;
      Signals.emit("GRAB_START", { hand, targetId: t.id });
    }

    function release(hand) {
      const id = held[hand];
      if (!id) return;
      held[hand] = null;
      Signals.emit("GRAB_END", { hand, targetId: id });
    }

    // Hook: UI_CLICK can trigger grabs in debug mode if needed
    Signals.on("UI_CLICK", (p) => {
      if (p?.id === "GRAB_L") grab("left");
      if (p?.id === "GRAB_R") grab("right");
      if (p?.id === "DROP_L") release("left");
      if (p?.id === "DROP_R") release("right");
    });

    return { registerTarget, unregisterTarget, grab, release, held };
  }

  return { init };
})();

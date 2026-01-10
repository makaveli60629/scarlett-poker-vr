// /js/gesture_engine.js — GestureEngineModule v1.0
// ✅ Per-hand pinch detection (thumb-tip ↔ index-finger-tip)
// ✅ Emits events: pinchstart, pinchend
// ✅ update(frame, referenceSpace)

export const GestureEngine = (() => {
  let THREE = null, renderer = null, scene = null, camera = null, log = console.log;

  const listeners = new Map();
  const state = {
    enabled: true,
    hands: {
      left:  { pinch:false, last:false, strength:0, jointsOK:false },
      right: { pinch:false, last:false, strength:0, jointsOK:false },
    },
    tmpA: null,
    tmpB: null,
  };

  function on(evt, cb) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(cb);
    return () => listeners.get(evt)?.delete(cb);
  }

  function emit(evt, payload) {
    const set = listeners.get(evt);
    if (!set) return;
    for (const cb of set) {
      try { cb(payload); } catch (e) { log(`[GestureEngine] listener error: ${e?.message || e}`); }
    }
  }

  function getJointWorld(handObj, jointName, out) {
    const j = handObj?.joints?.[jointName];
    if (!j) return false;
    j.getWorldPosition(out);
    return true;
  }

  function updateOne(handedness, index) {
    const handObj = renderer?.xr?.getHand?.(index);
    const h = state.hands[handedness];

    h.last = h.pinch;

    if (!handObj) {
      h.pinch = false; h.strength = 0; h.jointsOK = false;
      return;
    }

    const okA = getJointWorld(handObj, "index-finger-tip", state.tmpA);
    const okB = getJointWorld(handObj, "thumb-tip", state.tmpB);

    h.jointsOK = !!(okA && okB);
    if (!h.jointsOK) {
      h.pinch = false; h.strength = 0;
      return;
    }

    const dist = state.tmpA.distanceTo(state.tmpB);
    h.pinch = dist < 0.028;
    h.strength = Math.max(0, Math.min(1, (0.05 - dist) / 0.05));

    if (h.pinch && !h.last) emit("pinchstart", { hand: handedness, strength: h.strength, dist });
    if (!h.pinch && h.last) emit("pinchend", { hand: handedness });
  }

  return {
    init(ctx) {
      THREE = ctx.THREE;
      renderer = ctx.renderer;
      scene = ctx.scene;
      camera = ctx.camera;
      log = ctx.log || ((m) => ctx.LOG?.push?.("log", m)) || console.log;

      state.tmpA = new THREE.Vector3();
      state.tmpB = new THREE.Vector3();

      log("[GestureEngine] init ✅");
    },

    on,
    setEnabled(v) { state.enabled = !!v; },
    getState() { return state; },

    update(frame, referenceSpace) {
      if (!state.enabled) return;
      updateOne("left", 0);
      updateOne("right", 1);
    }
  };
})();

// /js/gesture_engine.js — GestureEngineModule v1.0 (HANDS-ONLY FOUNDATION)
// ✅ Per-hand pinch detection (thumb-tip ↔ index-finger-tip)
// ✅ Emits events: pinchstart, pinchend
// ✅ Provides stable API for next modules (chips/cards/store interactions)
// Usage:
//   GestureEngine.init({ THREE, renderer, scene, camera, log })
//   GestureEngine.on("pinchstart", (e)=>{})
//   GestureEngine.update(frame, referenceSpace)

export const GestureEngine = (() => {
  let THREE = null, renderer = null, scene = null, camera = null, log = console.log;

  const listeners = new Map(); // event -> Set(cb)

  const state = {
    enabled: true,
    hands: {
      left:  { pinch:false, last:false, strength:0, jointsOK:false, tipA:null, tipB:null },
      right: { pinch:false, last:false, strength:0, jointsOK:false, tipA:null, tipB:null },
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

  function updateHand(handedness) {
    const handObj = handedness === "left" ? renderer?.xr?.getHand?.(0) : renderer?.xr?.getHand?.(1);
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
      log = ctx.log || ctx.LOG?.push?.bind(ctx.LOG, "log") || console.log;

      state.tmpA = new THREE.Vector3();
      state.tmpB = new THREE.Vector3();

      log("[GestureEngine] init ✅");
    },

    on,

    setEnabled(v) { state.enabled = !!v; },

    getState() { return state; },

    update(frame, referenceSpace) {
      if (!state.enabled) return;
      // frame/referenceSpace kept for future (grab rays, hover, etc.)
      updateHand("left");
      updateHand("right");
    }
  };
})();

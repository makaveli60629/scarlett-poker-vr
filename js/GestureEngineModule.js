// /js/gesture_engine.js — Scarlett GestureEngine v1.0 (FULL)
// Hands-only pinch detection using XRHand joints.
// Emits: pinchstart / pinchend / pinchhold
// Safe: if no hands, it stays idle.

export const GestureEngine = (() => {
  const state = {
    THREE: null,
    renderer: null,
    scene: null,
    camera: null,
    log: console.log,
    listeners: new Map(),
    hands: {
      left: { pinched: false, strength: 0, last: 0 },
      right:{ pinched: false, strength: 0, last: 0 },
    }
  };

  function on(evt, fn) {
    if (!state.listeners.has(evt)) state.listeners.set(evt, new Set());
    state.listeners.get(evt).add(fn);
  }

  function emit(evt, payload) {
    const set = state.listeners.get(evt);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) { state.log?.(`[gesture] listener error: ${e?.message || e}`); }
    }
  }

  function init({ THREE, renderer, scene, camera, log }) {
    state.THREE = THREE;
    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    if (log) state.log = log;
    state.log?.("[gesture] init ✅");
  }

  // Distance between thumb-tip and index-tip
  function pinchStrengthFromHand(inputSource, frame, refSpace) {
    const hand = inputSource.hand;
    if (!hand) return 0;

    const thumbTip = hand.get("thumb-tip");
    const indexTip = hand.get("index-finger-tip");
    if (!thumbTip || !indexTip) return 0;

    const pThumb = frame.getPose(thumbTip, refSpace);
    const pIndex = frame.getPose(indexTip, refSpace);
    if (!pThumb || !pIndex) return 0;

    const dx = pThumb.transform.position.x - pIndex.transform.position.x;
    const dy = pThumb.transform.position.y - pIndex.transform.position.y;
    const dz = pThumb.transform.position.z - pIndex.transform.position.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Map distance to strength: closer => stronger pinch
    // Typical pinch close distance ~ 0.01–0.02m; open ~ 0.05m
    const strength = clamp01(1 - (dist - 0.01) / 0.04);
    return strength;
  }

  function clamp01(v){ return Math.max(0, Math.min(1, v)); }

  function update(frame, refSpace) {
    const r = state.renderer;
    if (!r?.xr?.isPresenting) return;

    const session = r.xr.getSession?.();
    if (!session) return;

    for (const src of session.inputSources) {
      if (!src.hand) continue;

      const handName = (src.handedness === "left") ? "left" : "right";
      const h = state.hands[handName];

      const strength = pinchStrengthFromHand(src, frame, refSpace);
      h.strength = strength;

      const nowPinched = strength > 0.72;
      const wasPinched = h.pinched;

      if (nowPinched && !wasPinched) {
        h.pinched = true;
        h.last = performance.now();
        emit("pinchstart", { hand: handName, strength });
      } else if (!nowPinched && wasPinched) {
        h.pinched = false;
        emit("pinchend", { hand: handName, strength });
      } else if (nowPinched && wasPinched) {
        emit("pinchhold", { hand: handName, strength });
      }
    }
  }

  return { init, update, on };
})();

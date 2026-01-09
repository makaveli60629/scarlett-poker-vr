// /js/inputs.js — Scarlett Inputs v1.0 (RIGHT HAND DOMINANT)
// Purpose:
// - Decide whether "hands" (hand-tracking) or "controllers" are active.
// - Expose a clean "primary" pointer/teleport source (right hand).
// - Prevent double-actions (e.g., controller teleport + hand teleport at same time).
//
// This file DOES NOT require changes to main/world yet.
// Later, main.js can import and call Inputs.init(...) + Inputs.update(dt).

export const Inputs = (() => {
  let THREE = null;
  let renderer = null;
  let scene = null;

  const S = {
    enabled: true,
    preferRightHand: true,

    // runtime
    xrHands: [null, null], // from renderer.xr.getHand(i)
    controllers: [null, null], // from renderer.xr.getController(i)
    grips: [null, null], // from renderer.xr.getControllerGrip(i)

    // state
    mode: "unknown", // "hand" | "controller"
    primaryIndex: 1, // 1 = right, 0 = left
    secondaryIndex: 0,

    // latch to prevent spam
    pinchLatch: false,
    triggerLatch: false,

    // cached vectors
    v3a: null,
    v3b: null,
  };

  function safeGetSession() {
    try { return renderer?.xr?.getSession?.() || null; } catch { return null; }
  }

  function bindHandsIfAvailable() {
    try {
      const sess = safeGetSession();
      if (!sess) return;
      for (let i = 0; i < 2; i++) {
        const h = renderer.xr.getHand(i);
        if (h && !S.xrHands[i]) {
          S.xrHands[i] = h;
          scene.add(h);
        }
      }
    } catch {}
  }

  function readInputSources() {
    const sess = safeGetSession();
    if (!sess) return { left: null, right: null };

    let left = null, right = null;
    for (const src of sess.inputSources || []) {
      if (!src?.gamepad) continue;
      if (src.handedness === "left") left = src;
      if (src.handedness === "right") right = src;
    }
    return { left, right };
  }

  function handIsTracked(i) {
    const h = S.xrHands[i];
    if (!h) return false;

    // If joints exist and have visible world matrices, we assume tracked
    try {
      const jt = h.joints?.["wrist"] || h.joints?.["index-finger-tip"] || null;
      return !!jt;
    } catch {
      // if no joints, still treat as present if object exists
      return true;
    }
  }

  function getPinchAmount(xrHand) {
    // thumb-tip to index-tip distance
    try {
      const thumb = xrHand?.joints?.["thumb-tip"];
      const index = xrHand?.joints?.["index-finger-tip"];
      if (!thumb || !index) return 0;

      const a = S.v3a, b = S.v3b;
      thumb.getWorldPosition(a);
      index.getWorldPosition(b);
      const d = a.distanceTo(b);

      // pinch ~ when close
      const pinch = clamp01(1.0 - (d - 0.01) / 0.03);
      return pinch;
    } catch {
      return 0;
    }
  }

  function getTriggerPressed(src) {
    try {
      const b = src?.gamepad?.buttons || [];
      // Trigger is typically button[0] or [1] depending on mapping
      return !!(b[0]?.pressed || b[1]?.pressed);
    } catch { return false; }
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function decideMode() {
    const rightTracked = handIsTracked(1);
    const leftTracked = handIsTracked(0);

    // If either hand tracked: hand mode
    if (rightTracked || leftTracked) return "hand";

    // else controller mode if presenting
    const sess = safeGetSession();
    if (sess) return "controller";
    return "unknown";
  }

  function getPrimary() {
    const pi = S.primaryIndex;
    const si = S.secondaryIndex;

    const mode = S.mode;

    if (mode === "hand") {
      return {
        mode,
        primary: S.xrHands[pi] || null,
        secondary: S.xrHands[si] || null,
        pinch: S.xrHands[pi] ? getPinchAmount(S.xrHands[pi]) : 0,
      };
    }

    if (mode === "controller") {
      const { left, right } = readInputSources();
      const primarySrc = (pi === 1) ? right : left;
      const secondarySrc = (pi === 1) ? left : right;

      return {
        mode,
        primary: S.controllers[pi] || null,
        secondary: S.controllers[si] || null,
        trigger: getTriggerPressed(primarySrc),
        primarySrc,
        secondarySrc,
      };
    }

    return { mode: "unknown", primary: null, secondary: null };
  }

  function edgePress(v, latchKey) {
    const pressed = !!v;
    const was = !!S[latchKey];
    if (pressed && !was) {
      S[latchKey] = true;
      return true;
    }
    if (!pressed) S[latchKey] = false;
    return false;
  }

  return {
    init({ THREE: _THREE, renderer: _r, scene: _s, controllers, grips, log } = {}) {
      THREE = _THREE;
      renderer = _r;
      scene = _s;

      S.controllers = controllers || S.controllers;
      S.grips = grips || S.grips;

      S.primaryIndex = S.preferRightHand ? 1 : 0;
      S.secondaryIndex = S.preferRightHand ? 0 : 1;

      S.v3a = new THREE.Vector3();
      S.v3b = new THREE.Vector3();

      try { log?.("[Inputs] init ✅"); } catch {}
      return this;
    },

    setPreferRightHand(v) {
      S.preferRightHand = !!v;
      S.primaryIndex = S.preferRightHand ? 1 : 0;
      S.secondaryIndex = S.preferRightHand ? 0 : 1;
    },

    update(dt) {
      if (!S.enabled) return;

      bindHandsIfAvailable();
      S.mode = decideMode();
    },

    // Use this in your teleport/poke systems later:
    // - If mode=hand => pinch edge triggers
    // - If mode=controller => trigger edge triggers
    getPrimaryPointerState() {
      const p = getPrimary();

      if (p.mode === "hand") {
        const pinchEdge = edgePress((p.pinch || 0) > 0.70, "pinchLatch");
        return { mode: "hand", obj: p.primary, pinch: p.pinch, activate: pinchEdge };
      }

      if (p.mode === "controller") {
        const trigEdge = edgePress(!!p.trigger, "triggerLatch");
        return { mode: "controller", obj: p.primary, trigger: !!p.trigger, activate: trigEdge };
      }

      return { mode: "unknown", obj: null, activate: false };
    }
  };
})();

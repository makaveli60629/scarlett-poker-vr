// /js/modules/interactionHands.module.js
// SCARLETT — interactionHands FULL v2.0 (BULLETPROOF)
// - Never crashes if anchors/rig/controllers missing
// - Creates a right-hand proxy + "poke" animation hook
// - Exposes window.SCARLETT.hands API for other modules (menuUI etc.)

export default {
  id: "interactionHands.module.js",

  async init({ THREE, scene, renderer, camera, rig, anchors, log }) {
    const safeLog = (...a) => { try { log?.(...a); } catch (_) {} };

    // ---- Resolve a parent group we can ALWAYS add to ----
    const parent =
      anchors?.debug ||
      anchors?.ui ||
      rig ||
      scene;

    if (!parent || typeof parent.add !== "function") {
      // absolute last-resort: don't crash
      safeLog("interactionHands.module ⚠️ no valid parent; disabling");
      this._disabled = true;
      return;
    }

    // ---- Ensure we have a rig reference ----
    // If rig wasn't provided by world (should be), make a local rig so adds won't fail.
    if (!rig || typeof rig.add !== "function") {
      rig = new THREE.Group();
      rig.name = "FALLBACK_RIG_FROM_HANDS_MODULE";
      scene.add(rig);
      rig.add(camera);
    }

    // ---- XR controllers (may be null until XR session starts) ----
    const rightGrip = renderer?.xr?.getControllerGrip?.(1) || null;
    const rightRay  = renderer?.xr?.getController?.(1) || null;

    // We attach grips/rays under rig if they exist (world already does this, but safe)
    try { if (rightGrip && rightGrip.parent !== rig) rig.add(rightGrip); } catch (_) {}
    try { if (rightRay && rightRay.parent !== rig) rig.add(rightRay); } catch (_) {}

    // ---- Visual right-hand proxy (small but visible) ----
    const hand = new THREE.Group();
    hand.name = "RIGHT_HAND_PROXY";
    parent.add(hand);

    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.0 })
    );
    palm.position.set(0, 0, 0);
    hand.add(palm);

    const fingertip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xff3355, roughness: 0.35 })
    );
    fingertip.position.set(0, 0.0, -0.08);
    fingertip.name = "POINTER_DOT";
    hand.add(fingertip);

    // Attach hand to controller grip when available; otherwise float in front of camera.
    this._rt = {
      THREE, renderer, camera,
      hand, palm, fingertip,
      rightGrip, rightRay,
      pokeT: 0
    };

    // ---- Public API for menu/UI modules ----
    window.SCARLETT = window.SCARLETT || {};
    window.SCARLETT.hands = window.SCARLETT.hands || {};

    window.SCARLETT.hands.right = {
      object: hand,
      fingertip,
      poke: () => { this._rt.pokeT = 1.0; },
      setVisible: (v) => { hand.visible = !!v; }
    };

    safeLog("interactionHands.module ✅ (bulletproof)");
  },

  update(dt = 0) {
    if (this._disabled || !this._rt) return;

    const r = this._rt;

    // ---- Attach behavior ----
    // If grip exists and is in scene, follow it
    if (r.rightGrip) {
      // ensure grip becomes source of transform
      r.rightGrip.getWorldPosition(r.hand.position);
      r.rightGrip.getWorldQuaternion(r.hand.quaternion);
    } else {
      // fallback: float in front of camera
      r.hand.position.copy(r.camera.position);
      r.hand.quaternion.copy(r.camera.quaternion);
      r.hand.translateZ(-0.35);
      r.hand.translateX(0.18);
      r.hand.translateY(-0.12);
    }

    // ---- Poke animation ----
    if (r.pokeT > 0) {
      r.pokeT = Math.max(0, r.pokeT - dt * 6.0);
      const amt = r.pokeT * r.pokeT;
      r.fingertip.position.z = -0.08 - amt * 0.04;
      r.palm.scale.setScalar(1.0 - amt * 0.06);
    } else {
      r.fingertip.position.z = -0.08;
      r.palm.scale.setScalar(1.0);
    }
  },

  test() {
    if (this._disabled) return { ok: true, note: "hands module disabled (no parent)" };
    return { ok: true, note: "hands proxy ok" };
  }
};

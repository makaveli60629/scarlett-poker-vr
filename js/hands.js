// /js/hands.js — Scarlett Hands v1.0 (GitHub Pages safe)
// Exports: HandsSystem
// Purpose:
// - Provide visible "glove" hands for controller mode AND hand-tracking mode.
// - Never crash if hand-tracking isn't available.
// - Works with main.js importing:  import { HandsSystem } from "./hands.js";

export const HandsSystem = {
  init({ THREE, scene, renderer, log = console.log } = {}) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const root = new THREE.Group();
    root.name = "HandsSystem";
    scene.add(root);

    const state = {
      enabled: true,
      t: 0,
      hands: [
        { index: 0, obj: null, type: "unknown", pinch: 0 },
        { index: 1, obj: null, type: "unknown", pinch: 0 }
      ],
      // hand-tracking objects (if available)
      xrHands: [null, null],
      // fallback controller grips (if available)
      grips: [null, null],
    };

    // ---- Simple glove mesh ----
    function makeGlove(color = 0x0b0b0f, accent = 0xff2d7a) {
      const g = new THREE.Group();
      g.name = "Glove";

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.1,
        emissive: 0x000000,
        emissiveIntensity: 0.0
      });

      const accentMat = new THREE.MeshStandardMaterial({
        color: accent,
        roughness: 0.35,
        metalness: 0.2,
        emissive: accent,
        emissiveIntensity: 0.15
      });

      // palm
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.08), mat);
      palm.position.set(0, 0, 0);
      g.add(palm);

      // knuckle ridge
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.01, 0.05), accentMat);
      ridge.position.set(0, 0.012, 0.012);
      g.add(ridge);

      // fingers (4)
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.035, 6, 10), mat);
        f.rotation.x = Math.PI / 2;
        f.position.set(-0.018 + i * 0.012, 0.010, 0.042);
        g.add(f);
      }

      // thumb
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.03, 6, 10), mat);
      thumb.rotation.z = -0.6;
      thumb.rotation.x = Math.PI / 2;
      thumb.position.set(0.03, 0.003, 0.02);
      g.add(thumb);

      // tiny “pinch orb”
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 12, 10),
        new THREE.MeshStandardMaterial({
          color: accent,
          emissive: accent,
          emissiveIntensity: 0.35,
          roughness: 0.25
        })
      );
      orb.position.set(0.0, 0.015, 0.065);
      orb.name = "pinch_orb";
      orb.visible = false;
      g.add(orb);

      g.userData.pinchOrb = orb;
      return g;
    }

    // Create visible hands (always)
    const left = makeGlove(0x0b0b0f, 0xff2d7a);
    const right = makeGlove(0x0b0b0f, 0x7fe7ff);

    left.name = "HandLeft";
    right.name = "HandRight";

    root.add(left, right);

    state.hands[0].obj = left;
    state.hands[1].obj = right;

    // Slight offset so they sit nicely on controllers / tracked hands
    function applyDefaultPose(handObj, isLeft) {
      handObj.scale.setScalar(1.0);
      handObj.rotation.set(0, 0, 0);
      // Put palm slightly “forward”
      handObj.position.set(isLeft ? -0.02 : 0.02, -0.01, -0.03);
    }
    applyDefaultPose(left, true);
    applyDefaultPose(right, false);

    // Try to hook XRHands if available
    function bindXRHands() {
      try {
        const xr = renderer?.xr;
        const s = xr?.getSession?.();
        if (!s) return;

        // renderer.xr.getHand(i) exists in Three when WebXR hand-tracking is enabled
        for (let i = 0; i < 2; i++) {
          const h = renderer.xr.getHand(i);
          if (h && !state.xrHands[i]) {
            state.xrHands[i] = h;
            scene.add(h);
            L("[Hands] XR hand bound:", i);
          }
        }
      } catch {}
    }

    // Hook controller grips if possible (for controller mode)
    function bindGrips() {
      try {
        for (let i = 0; i < 2; i++) {
          const g = renderer.xr.getControllerGrip(i);
          if (g && !state.grips[i]) state.grips[i] = g;
        }
      } catch {}
    }

    // Pinch detection (very light heuristic)
    function updatePinchFromXRHand(xrHand, handState) {
      // If joints exist, use distance between thumb-tip and index-tip
      try {
        const thumb = xrHand.joints?.["thumb-tip"];
        const index = xrHand.joints?.["index-finger-tip"];
        if (!thumb || !index) return 0;

        const tp = new THREE.Vector3();
        const ip = new THREE.Vector3();
        thumb.getWorldPosition(tp);
        index.getWorldPosition(ip);

        const d = tp.distanceTo(ip);
        // pinch when close
        const pinch = clamp(1.0 - (d - 0.01) / 0.03, 0, 1);
        return pinch;
      } catch {
        return 0;
      }
    }

    function updateHandObjFromTarget(handObj, targetObj) {
      if (!handObj || !targetObj) return;
      // Copy world pose of target -> hand root (approx)
      targetObj.getWorldPosition(handObj.position);
      targetObj.getWorldQuaternion(handObj.quaternion);
      // Small offset so it sits like a glove on top
      handObj.translateZ(-0.03);
      handObj.translateY(-0.01);
    }

    function update(dt) {
      if (!state.enabled) return;
      state.t += dt;

      bindXRHands();
      bindGrips();

      // If XR hands are tracked, attach gloves to them.
      // Otherwise attach to grips (controller mode).
      for (let i = 0; i < 2; i++) {
        const handObj = state.hands[i].obj;
        const xrHand = state.xrHands[i];
        const grip = state.grips[i];

        if (xrHand) {
          state.hands[i].type = "hand-tracking";
          // Attach glove near the hand root (not joint-perfect, but stable)
          updateHandObjFromTarget(handObj, xrHand);

          // pinch highlight
          const p = updatePinchFromXRHand(xrHand, state.hands[i]);
          state.hands[i].pinch = p;
          if (handObj.userData.pinchOrb) {
            handObj.userData.pinchOrb.visible = p > 0.65;
            handObj.userData.pinchOrb.scale.setScalar(0.8 + p * 0.6);
          }
        } else if (grip) {
          state.hands[i].type = "controller";
          updateHandObjFromTarget(handObj, grip);

          // subtle idle “breathing”
          const bob = Math.sin(state.t * 2.2 + i) * 0.002;
          handObj.position.y += bob;

          if (handObj.userData.pinchOrb) handObj.userData.pinchOrb.visible = false;
        } else {
          state.hands[i].type = "unbound";
        }
      }
    }

    function setEnabled(v) {
      state.enabled = !!v;
      root.visible = state.enabled;
    }

    L("[Hands] init ✅");
    return { update, setEnabled, root };
  }
};

// /js/hands.js — Scarlett Hands v2.0 (GitHub Pages safe)
// Exports: HandsSystem AND Hands (compat forever)
// Purpose:
// - Visible glove hands for controller mode AND hand-tracking mode.
// - Never crash if hand-tracking isn't available.
// - Fixes missing clamp() bug from v1.0.
// - Works with main.js importing either:
//    import { HandsSystem } from "./hands.js";
//   OR older:
//    import { Hands } from "./hands.js";

function _clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function _makeGlove(THREE, color = 0x0b0b0f, accent = 0xff2d7a) {
  const g = new THREE.Group();
  g.name = "Glove";

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.10
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.35,
    metalness: 0.20,
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

  // pinch orb
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

function _applyDefaultPose(handObj, isLeft) {
  // Base placement relative to the tracked/controller target
  handObj.scale.setScalar(1.0);

  // mild rotation bias so glove reads better in VR
  handObj.rotation.set(0, 0, 0);

  // offset: left/right mirrored
  handObj.position.set(isLeft ? -0.02 : 0.02, -0.01, -0.03);
}

function _updateFromTarget(THREE, handObj, targetObj, isLeft) {
  if (!handObj || !targetObj) return;

  // world pose from target
  targetObj.getWorldPosition(handObj.position);
  targetObj.getWorldQuaternion(handObj.quaternion);

  // Small offset so glove sits nicely *in front* of target pose
  // Mirror x for left/right so they feel symmetric
  handObj.translateZ(-0.03);
  handObj.translateY(-0.01);
  handObj.translateX(isLeft ? -0.01 : 0.01);
}

function _updatePinch(THREE, xrHand) {
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
    return _clamp(1.0 - (d - 0.01) / 0.03, 0, 1);
  } catch {
    return 0;
  }
}

function _createSystem() {
  return {
    init({ THREE, scene, renderer, log = console.log } = {}) {
      const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

      const root = new THREE.Group();
      root.name = "HandsSystem";
      scene.add(root);

      const state = {
        enabled: true,
        t: 0,
        hands: [
          { index: 0, obj: null, type: "unknown", pinch: 0 }, // left
          { index: 1, obj: null, type: "unknown", pinch: 0 }  // right
        ],
        xrHands: [null, null],
        grips: [null, null],
        _addedHandsToScene: [false, false],
      };

      // Create gloves
      const left = _makeGlove(THREE, 0x0b0b0f, 0xff2d7a);
      const right = _makeGlove(THREE, 0x0b0b0f, 0x7fe7ff);
      left.name = "HandLeft";
      right.name = "HandRight";

      root.add(left, right);
      state.hands[0].obj = left;
      state.hands[1].obj = right;

      _applyDefaultPose(left, true);
      _applyDefaultPose(right, false);

      function bindXRHands() {
        try {
          const s = renderer?.xr?.getSession?.();
          if (!s) return;

          for (let i = 0; i < 2; i++) {
            const h = renderer.xr.getHand(i);
            if (h && !state.xrHands[i]) {
              state.xrHands[i] = h;

              // Only add if it isn't already parented somewhere
              // (Three sometimes returns an object already attached)
              if (!h.parent && !state._addedHandsToScene[i]) {
                scene.add(h);
                state._addedHandsToScene[i] = true;
              }

              L("[Hands] XR hand bound:", i);
            }
          }
        } catch {}
      }

      function bindGrips() {
        try {
          for (let i = 0; i < 2; i++) {
            const g = renderer.xr.getControllerGrip(i);
            if (g && !state.grips[i]) state.grips[i] = g;
          }
        } catch {}
      }

      function update(dt) {
        if (!state.enabled) return;
        state.t += dt;

        bindXRHands();
        bindGrips();

        // Left=0, Right=1 (Three convention for getHand/getControllerGrip)
        for (let i = 0; i < 2; i++) {
          const isLeft = (i === 0);
          const handObj = state.hands[i].obj;
          const xrHand = state.xrHands[i];
          const grip = state.grips[i];

          if (xrHand) {
            state.hands[i].type = "hand-tracking";

            _updateFromTarget(THREE, handObj, xrHand, isLeft);

            const p = _updatePinch(THREE, xrHand);
            state.hands[i].pinch = p;

            const orb = handObj?.userData?.pinchOrb;
            if (orb) {
              orb.visible = p > 0.65;
              orb.scale.setScalar(0.8 + p * 0.6);
            }
          } else if (grip) {
            state.hands[i].type = "controller";

            _updateFromTarget(THREE, handObj, grip, isLeft);

            // tiny idle
            const bob = Math.sin(state.t * 2.2 + i) * 0.002;
            handObj.position.y += bob;

            const orb = handObj?.userData?.pinchOrb;
            if (orb) orb.visible = false;
          } else {
            state.hands[i].type = "unbound";
            const orb = handObj?.userData?.pinchOrb;
            if (orb) orb.visible = false;
          }
        }
      }

      function setEnabled(v) {
        state.enabled = !!v;
        root.visible = state.enabled;
      }

      L("[Hands] init ✅ v2.0");
      return { update, setEnabled, root };
    }
  };
}

// Primary export (new)
export const HandsSystem = _createSystem();

// Compat export (old)
export const Hands = HandsSystem;

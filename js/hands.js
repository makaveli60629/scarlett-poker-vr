// /js/hands.js — Scarlett Hands v1.1 (GitHub Pages safe)
// Fixes:
// - Adds missing clamp() (prevents runtime errors)
// - Binds XR hands OR grips safely
// - Always shows gloves when bound (controller or hand tracking)

export const HandsSystem = {
  init({ THREE, scene, renderer, log = console.log } = {}) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
      xrHands: [null, null],
      grips: [null, null],
    };

    function makeGlove(color = 0x0b0b0f, accent = 0xff2d7a) {
      const g = new THREE.Group();
      g.name = "Glove";

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.1
      });

      const accentMat = new THREE.MeshStandardMaterial({
        color: accent,
        roughness: 0.35,
        metalness: 0.2,
        emissive: accent,
        emissiveIntensity: 0.12
      });

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.08), mat);
      g.add(palm);

      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.01, 0.05), accentMat);
      ridge.position.set(0, 0.012, 0.012);
      g.add(ridge);

      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.035, 6, 10), mat);
        f.rotation.x = Math.PI / 2;
        f.position.set(-0.018 + i * 0.012, 0.010, 0.042);
        g.add(f);
      }

      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.03, 6, 10), mat);
      thumb.rotation.z = -0.6;
      thumb.rotation.x = Math.PI / 2;
      thumb.position.set(0.03, 0.003, 0.02);
      g.add(thumb);

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

    const left = makeGlove(0x0b0b0f, 0xff2d7a);
    const right = makeGlove(0x0b0b0f, 0x7fe7ff);
    left.name = "HandLeft";
    right.name = "HandRight";
    root.add(left, right);

    state.hands[0].obj = left;
    state.hands[1].obj = right;

    function bindXRHands() {
      try {
        const s = renderer?.xr?.getSession?.();
        if (!s) return;
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

    function bindGrips() {
      try {
        for (let i = 0; i < 2; i++) {
          const g = renderer.xr.getControllerGrip(i);
          if (g && !state.grips[i]) state.grips[i] = g;
        }
      } catch {}
    }

    function updatePinchFromXRHand(xrHand) {
      try {
        const thumb = xrHand.joints?.["thumb-tip"];
        const index = xrHand.joints?.["index-finger-tip"];
        if (!thumb || !index) return 0;

        const tp = new THREE.Vector3();
        const ip = new THREE.Vector3();
        thumb.getWorldPosition(tp);
        index.getWorldPosition(ip);

        const d = tp.distanceTo(ip);
        return clamp(1.0 - (d - 0.01) / 0.03, 0, 1);
      } catch {
        return 0;
      }
    }

    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();

    function updateHandObjFromTarget(handObj, targetObj) {
      if (!handObj || !targetObj) return;

      targetObj.getWorldPosition(tmpPos);
      targetObj.getWorldQuaternion(tmpQuat);

      handObj.position.copy(tmpPos);
      handObj.quaternion.copy(tmpQuat);

      // Slight glove offset
      handObj.translateZ(-0.03);
      handObj.translateY(-0.01);
    }

    function update(dt) {
      if (!state.enabled) return;
      state.t += dt;

      bindXRHands();
      bindGrips();

      for (let i = 0; i < 2; i++) {
        const handObj = state.hands[i].obj;
        const xrHand = state.xrHands[i];
        const grip = state.grips[i];

        if (xrHand) {
          state.hands[i].type = "hand-tracking";
          updateHandObjFromTarget(handObj, xrHand);

          const p = updatePinchFromXRHand(xrHand);
          state.hands[i].pinch = p;

          if (handObj.userData.pinchOrb) {
            handObj.userData.pinchOrb.visible = p > 0.65;
            handObj.userData.pinchOrb.scale.setScalar(0.8 + p * 0.6);
          }
        } else if (grip) {
          state.hands[i].type = "controller";
          updateHandObjFromTarget(handObj, grip);

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

    L("[Hands] init ✅ v1.1");
    return { update, setEnabled, root };
  }
};

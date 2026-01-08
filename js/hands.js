// /js/hands.js — Scarlett VR Hands v1.0 (visible in controllers + hand tracking)
// No "three" import. main passes THREE.

export const Hands = {
  init({ THREE, renderer, xrPivot, controllers = [], log = console.log }) {
    const L = (...a) => { try { log(...a); } catch {} };

    const state = {
      hands: [],
      controllerGloves: [],
      t: 0
    };

    // ---- controller gloves (always show) ----
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.35,
      metalness: 0.05,
      emissive: 0x060606,
      emissiveIntensity: 0.35
    });

    function makeGlove() {
      const g = new THREE.Group();
      g.name = "Glove";

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.10), gloveMat);
      palm.position.set(0, -0.01, -0.035);
      g.add(palm);

      const kn = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.06), gloveMat);
      kn.position.set(0, 0.01, -0.015);
      g.add(kn);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.038, 0.03, 16), gloveMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(0, 0.0, 0.035);
      g.add(cuff);

      return g;
    }

    controllers.forEach((c, i) => {
      const glove = makeGlove();
      glove.position.set(0, 0, 0);
      glove.rotation.x = -0.2;
      c.add(glove);
      state.controllerGloves.push(glove);
    });

    // ---- WebXR hand tracking palms (simple visible) ----
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      hand.name = "XRHand" + i;

      const palm = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 18, 14),
        new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          roughness: 0.35,
          emissive: 0x0b0b0b,
          emissiveIntensity: 0.4
        })
      );
      palm.name = "PalmMesh";
      palm.position.set(0, 0, 0);

      hand.add(palm);
      xrPivot.add(hand);
      state.hands.push({ hand, palm });
    }

    L("[Hands] ready ✅");
    return {
      update(dt) {
        state.t += dt;
        // tiny pulse so you can see them
        for (const g of state.controllerGloves) {
          const s = 1.0 + Math.sin(state.t * 2.2) * 0.01;
          g.scale.setScalar(s);
        }
        for (const h of state.hands) {
          const s = 1.0 + Math.sin(state.t * 2.0) * 0.01;
          h.palm.scale.setScalar(s);
        }
      }
    };
  }
};

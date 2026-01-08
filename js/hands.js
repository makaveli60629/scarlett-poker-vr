// /js/hands.js — simple visible gloves for controllers (Quest-friendly)
// No three import. main.js passes THREE in.

export const Hands = {
  init({ THREE, renderer, grips, log = console.log }) {
    const L = (...a) => { try { log(...a); } catch {} };

    const group = new THREE.Group();
    group.name = "HandsRoot";

    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.05,
      emissive: 0x0b0b10,
      emissiveIntensity: 0.15
    });

    // Simple glove model: palm + fingers (placeholder but looks like a glove)
    function buildGlove(isLeft) {
      const g = new THREE.Group();
      g.name = isLeft ? "Glove_L" : "Glove_R";

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.08), gloveMat);
      palm.position.set(0, 0, -0.03);
      g.add(palm);

      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.035), gloveMat);
        finger.position.set(-0.018 + i * 0.012, 0.006, -0.075);
        g.add(finger);
      }

      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.03), gloveMat);
      thumb.position.set(isLeft ? -0.04 : 0.04, 0.0, -0.05);
      thumb.rotation.y = isLeft ? 0.55 : -0.55;
      g.add(thumb);

      // Align to typical controller grip pose
      g.rotation.x = -0.35;
      g.rotation.y = isLeft ? Math.PI : 0;
      g.position.set(0, -0.01, 0.02);

      return g;
    }

    // Attach to each grip (controller model follows grip, glove follows too)
    if (grips?.length >= 2) {
      const left = buildGlove(true);
      const right = buildGlove(false);

      grips[0].add(left);
      grips[1].add(right);

      L("[Hands] gloves attached ✅");
    } else {
      L("[Hands] ⚠️ grips missing, cannot attach gloves");
    }

    return { group };
  }
};

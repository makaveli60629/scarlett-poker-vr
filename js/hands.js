// /js/hands.js — Simple VR Gloves (GitHub Pages SAFE)

export const Hands = {
  init({ THREE, controllers, scene }) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.85
    });

    controllers.forEach((c, i) => {
      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.10, 0.02),
        mat
      );
      hand.position.set(0, -0.04, -0.06);
      hand.name = "GloveHand_" + i;
      c.add(hand);
    });

    console.log("[Hands] gloves attached ✅");
  }
};

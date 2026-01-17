// /js/modules/interactionHands.module.js
// Right-hand proxy + poke animation on UI press (FULL)

export default {
  id: "interactionHands.module.js",

  async init({ THREE, rightGrip, log }) {
    const hand = new THREE.Group();
    hand.name = "RIGHT_HAND_PROXY";
    rightGrip.add(hand);

    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.02, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    palm.position.set(0, -0.02, -0.05);
    hand.add(palm);

    const finger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    finger.rotation.x = Math.PI / 2;
    finger.position.set(0.02, -0.01, -0.10);
    finger.name = "INDEX_FINGER";
    hand.add(finger);

    let pokeT = 0;
    let poking = false;

    const onPress = () => { poking = true; pokeT = 0; };
    window.addEventListener("SCARLETT_UI_PRESS", onPress);

    this._rt = { finger, pokeT, poking };
    log?.("interactionHands.module ✅ (poke animation)");
  },

  update(dt) {
    const r = this._rt;
    if (!r || !r.poking) return;

    r.pokeT += dt;
    const p = Math.min(r.pokeT / 0.12, 1.0);
    const k = p < 0.5 ? (p / 0.5) : (1 - (p - 0.5) / 0.5);
    r.finger.position.z = -0.10 - k * 0.03;

    if (r.pokeT >= 0.12) {
      r.poking = false;
      r.pokeT = 0;
      r.finger.position.z = -0.10;
    }
  },

  test() { return { ok: true, note: "hand proxy present" }; }
};

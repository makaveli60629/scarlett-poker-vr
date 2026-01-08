// /js/dealingMix.js — Scarlett Poker VR DealingMix v1.2
// Fixes:
// - community cards centered on TABLE, always visible
// - uses TABLE-LOCAL placement when cards are parented to table
// - hover animation clearly visible

export const DealingMix = {
  init({ THREE, scene, log = console.log, world }) {
    const L = (...a) => { try { log(...a); } catch { console.log(...a); } };

    const table = world?.table || world?.group || scene;
    const focus = world?.tableFocus || new THREE.Vector3(0, 0, -6.5);

    // Authoritative heights
    const TABLE_Y = 0.92;
    const HOVER_Y = TABLE_Y + 0.16; // ✅ higher than before

    const CARD_W = 0.11;
    const CARD_H = 0.15;

    // Community positions (WORLD)
    const commW = [
      new THREE.Vector3(focus.x - 0.33, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x - 0.16, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.01, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.18, HOVER_Y, focus.z + 0.02),
      new THREE.Vector3(focus.x + 0.35, HOVER_Y, focus.z + 0.02),
    ];

    // Convert to TABLE-LOCAL once (prevents drifting into walls)
    const commL = commW.map((p) => table.worldToLocal(p.clone()));

    function makeCardMesh() {
      const g = new THREE.Group();
      g.name = "CommunityCard";

      const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);

      const face = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.55,
        emissive: 0x111111,
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide
      });

      const back = new THREE.MeshStandardMaterial({
        color: 0xff2d7a,
        roughness: 0.55,
        emissive: 0x220010,
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide
      });

      const f = new THREE.Mesh(geo, face);
      const b = new THREE.Mesh(geo, back);
      b.rotation.y = Math.PI;
      f.position.z = 0.001;
      b.position.z = -0.001;

      g.add(f, b);

      // tilt slightly toward spawn/camera direction (more readable)
      g.rotation.x = -Math.PI / 2 + 0.35;

      return g;
    }

    const cards = [];
    for (let i = 0; i < 5; i++) {
      const c = makeCardMesh();
      c.position.copy(commL[i]);   // ✅ table-local
      c.scale.setScalar(0.001);
      table.add(c);
      cards.push(c);
    }

    const state = { t: 0 };

    function startHand() {
      state.t = 0;
      for (const c of cards) c.scale.setScalar(0.001);
      L("[DealingMix] startHand ✅ (community only)");
    }

    function update(dt) {
      state.t += dt;

      // deal in sequence
      const step = 0.55;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const appear = Math.max(0, Math.min(1, (state.t - i * step) / 0.30));
        const s = 0.001 + appear * 1.0;
        c.scale.setScalar(s);

        // hover up/down in TABLE-LOCAL y
        c.position.y = commL[i].y + Math.sin(state.t * 2.4 + i) * 0.012;

        // tiny sideways shimmer
        c.position.x = commL[i].x + Math.sin(state.t * 1.7 + i) * 0.004;
      }
    }

    return { startHand, update };
  }
};

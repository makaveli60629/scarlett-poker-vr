// /js/bots_demo.js — seated bots + chip toss demo (NO bouncing)
export const BotsDemo = (() => {
  let THREE = null, world = null;

  let t = 0;
  const state = { bots: [], chips: [], pot: null, active: true };

  function init(ctx) {
    THREE = ctx.THREE;
    world = ctx.world;

    const demo = world.getDemo?.();
    if (!demo?.tableAnchor || !demo?.seatPoints?.length) return;

    state.bots = demo.bots || [];
    state.pot = demo.tableAnchor.localToWorld(new THREE.Vector3(0, 0.25, 0));

    // Build chips (colored casino chips) near each bot seat
    const chipMats = [
      new THREE.MeshStandardMaterial({ color: 0xd62b2b, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x2a6bff, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x22aa55, roughness: 0.4, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.05 }),
    ];

    state.chips = [];
    for (let i = 0; i < demo.seatPoints.length; i++) {
      const wp = demo.seatPoints[i].clone();
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 18), chipMats[i % chipMats.length]);
      chip.position.copy(wp).add(new THREE.Vector3(0, 0.12, 0));
      chip.userData.home = chip.position.clone();
      chip.userData.phase = Math.random() * 10;
      demo.tableAnchor.parent.add(chip);
      state.chips.push(chip);
    }
  }

  function update(dt) {
    if (!state.active) return;
    t += dt;

    // NO bot bobbing — bots stay seated.
    // Only animate chips into the pot rhythmically.
    for (let i = 0; i < state.chips.length; i++) {
      const c = state.chips[i];
      const beat = (t + c.userData.phase) % 3.0;

      if (beat < 0.55) {
        const k = beat / 0.55;
        c.position.lerpVectors(c.userData.home, state.pot, easeInOut(k));
        c.position.y += Math.sin(k * Math.PI) * 0.08;
      } else {
        const k = (beat - 0.55) / 2.45;
        c.position.lerpVectors(state.pot, c.userData.home, easeInOut(k));
      }
    }
  }

  function easeInOut(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  return { init, update, state };
})();

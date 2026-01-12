// /js/bots_demo.js — lightweight “bots playing” demo (no full poker rules yet)
export const BotsDemo = (() => {
  let THREE = null, world = null, scene = null;
  let t = 0;

  const state = {
    bots: [],
    chips: [],
    pot: null,
    active: true,
  };

  function init(ctx) {
    THREE = ctx.THREE;
    world = ctx.world;
    scene = ctx.scene;

    const demo = world.getDemo?.();
    if (!demo?.tableAnchor) return;

    // Create 6 simple bots around table if not already present
    const botMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7a, roughness: 0.65, metalness: 0.1 });

    const bots = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 4.1;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;

      const g = new THREE.Group();
      g.name = "BotDemo";
      g.position.set(x, demo.tableAnchor.position.y + 0.15, z);
      g.lookAt(0, g.position.y, 0);

      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 6, 12), botMat);
      body.position.set(0, 0.62, 0);
      g.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), botMat);
      head.position.set(0, 1.15, 0);
      g.add(head);

      demo.tableAnchor.parent.add(g);
      bots.push(g);
    }
    state.bots = bots;

    // Pot position (center)
    state.pot = new THREE.Vector3(0, demo.tableAnchor.position.y + 0.25, 0);

    // Create a few chip stacks near each bot
    const chipMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.55, metalness: 0.08, emissive: 0x0, emissiveIntensity: 0 });
    for (let i = 0; i < 6; i++) {
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 18), chipMat);
      chip.position.copy(state.bots[i].position).add(new THREE.Vector3(0, 0.10, 0));
      chip.userData.home = chip.position.clone();
      chip.userData.phase = Math.random() * 10;
      demo.tableAnchor.parent.add(chip);
      state.chips.push(chip);
    }
  }

  function update(dt) {
    if (!state.active) return;
    t += dt;

    // bot idle “breathing”
    for (let i = 0; i < state.bots.length; i++) {
      const b = state.bots[i];
      const ph = (i * 0.7) + t;
      b.position.y = b.position.y * 0.98 + (Math.sin(ph) * 0.02 + (b.position.y - b.position.y * 0.98));
      b.rotation.y += Math.sin(ph * 0.6) * 0.0008;
    }

    // chip “bet” animation every ~3 seconds
    for (let i = 0; i < state.chips.length; i++) {
      const c = state.chips[i];
      const beat = (t + c.userData.phase) % 3.2;

      if (beat < 0.6) {
        // slide toward pot
        const k = beat / 0.6;
        c.position.lerpVectors(c.userData.home, state.pot, easeInOut(k));
        c.position.y += Math.sin(k * Math.PI) * 0.08;
      } else {
        // return home
        const k = (beat - 0.6) / 2.6;
        c.position.lerpVectors(state.pot, c.userData.home, easeInOut(k));
      }
    }
  }

  function easeInOut(x) {
    return x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2)/2;
  }

  return { init, update, state };
})();

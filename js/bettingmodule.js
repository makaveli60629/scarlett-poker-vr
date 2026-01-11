// /js/betting_module.js — Scarlett BettingModule v1.0 (FULL)
// Minimal "bet zone" + physical chip spawn. Safe and extendable.
// Works with controllers OR pinch later.

export const BettingModule = (() => {
  const state = {
    THREE: null,
    scene: null,
    log: console.log,
    root: null,
    betZone: null,
    chips: [],
    wallet: { chips: 100000 },
  };

  function init(ctx) {
    state.THREE = ctx.THREE;
    state.scene = ctx.scene;
    state.log = (m) => ctx.LOG?.push?.("log", m) || console.log(m);

    state.root = new state.THREE.Group();
    state.root.name = "BettingModule";
    state.scene.add(state.root);

    // Place a simple bet zone near the BossTable if it exists
    const table = state.scene.getObjectByName("BossTable");
    const basePos = new state.THREE.Vector3(0, 0.82, 0.0);
    if (table) table.getWorldPosition(basePos);

    const zone = new state.THREE.Mesh(
      new state.THREE.CircleGeometry(0.55, 32),
      new state.THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.28 })
    );
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(basePos.x, 0.82, basePos.z - 1.35);
    zone.name = "BetZone";
    state.root.add(zone);
    state.betZone = zone;

    // Spawn a few demo chips on the table edge
    spawnChip(10, basePos.x - 0.35, 0.86, basePos.z - 0.95);
    spawnChip(100, basePos.x - 0.25, 0.86, basePos.z - 1.05);
    spawnChip(1000, basePos.x - 0.15, 0.86, basePos.z - 1.15);

    state.log("[bet] init ✅ (bet zone + demo chips)");
  }

  function spawnChip(value, x, y, z) {
    const THREE = state.THREE;

    let color = 0xffffff;
    let scale = 1.0;
    if (value >= 1000) { color = 0xffd700; scale = 1.25; }
    else if (value >= 100) { color = 0xff0000; scale = 1.10; }
    else if (value >= 10) { color = 0x0000ff; scale = 1.00; }

    const geo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.012 * scale, 14);
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      metalness: 0.35,
      roughness: 0.35
    });

    const chip = new THREE.Mesh(geo, mat);
    chip.position.set(x, y, z);
    chip.rotation.x = Math.PI / 2;
    chip.userData.value = value;

    state.root.add(chip);
    state.chips.push(chip);
    return chip;
  }

  function update(ctx, dt) {
    // tiny idle animation so you can SEE it's alive
    const t = performance.now() * 0.001;
    for (let i = 0; i < state.chips.length; i++) {
      const c = state.chips[i];
      c.rotation.z = t * 0.4 + i * 0.2;
    }
  }

  return { init, update };
})();

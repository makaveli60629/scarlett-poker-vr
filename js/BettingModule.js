// /js/betting_module.js — BettingModule v1.0 (FULL)
// Minimal bet zone + whale alert (safe, optional)

export const BettingModule = (() => {
  const state = {
    root: null,
    zone: null,
    zoneRadius: 0.55,
    zoneCenter: null,
    potValue: 0,
    lastWhale: false,
    flashT: 0
  };

  function inZone(pos) {
    if (!state.zoneCenter) return false;
    const dx = pos.x - state.zoneCenter.x;
    const dz = pos.z - state.zoneCenter.z;
    return (dx*dx + dz*dz) <= (state.zoneRadius * state.zoneRadius);
  }

  return {
    init(ctx) {
      const { THREE, scene, LOG } = ctx;
      const log = (m) => LOG?.push?.("log", m) || console.log(m);

      state.root = new THREE.Group();
      state.root.name = "BettingModule";
      scene.add(state.root);

      const table = scene.getObjectByName("BossTable");
      const center = new THREE.Vector3();
      if (table) table.getWorldPosition(center);
      else center.set(0, 0, 0);

      const zoneCenter = center.clone();
      zoneCenter.z += 0.95;
      zoneCenter.y = 0;
      state.zoneCenter = zoneCenter;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.38, state.zoneRadius, 48),
        new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(zoneCenter.x, 0.021, zoneCenter.z);
      ring.name = "BetZone";
      ring.renderOrder = 9998;
      ring.material.depthTest = false;

      const plate = new THREE.Mesh(
        new THREE.CircleGeometry(0.34, 48),
        new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(zoneCenter.x, 0.02, zoneCenter.z);

      state.root.add(plate, ring);
      state.zone = ring;

      log("[BettingModule] init ✅");
    },

    // if you drop a chip object with userData.value into zone, call this:
    tryDropChip(ctx, chipObj) {
      if (!chipObj?.userData?.value) return false;
      const pos = new ctx.THREE.Vector3();
      chipObj.getWorldPosition(pos);
      if (!inZone(pos)) return false;

      const v = Number(chipObj.userData.value) || 0;
      state.potValue += v;
      chipObj.parent?.remove(chipObj);
      ctx.LOG?.push?.("log", `[BettingModule] BET +${v} (pot=${state.potValue}) ✅`);

      if (state.potValue > 500 && !state.lastWhale) {
        state.lastWhale = true;
        state.flashT = 0.9;
        ctx.LOG?.push?.("warn", "🐋 WHALE ALERT: bet exceeds 500!");
      }
      return true;
    },

    update(ctx, dt) {
      if (!state.zone) return;
      if (state.flashT > 0) {
        state.flashT -= dt;
        const pulse = Math.sin((1 - state.flashT) * 22) * 0.5 + 0.5;
        state.zone.material.opacity = 0.25 + 0.75 * pulse;
        if (state.flashT <= 0) state.zone.material.opacity = 0.75;
      }
    },

    getPot() { return state.potValue; }
  };
})();

// /js/scarlett1/modules/game/showgame_module.js
// SHOWGAME MODULE (FULL) — ROOT PATCHED (marker root for toggle)

export function createShowgameModule({
  dealInterval = 6.0,
  betPulseTime = 0.55,
  dealerSpin = 0.9,
  chipNudge = 0.06,
  commPulse = 0.85,
} = {}) {
  let t = 0;
  let lastDeal = 0;
  let built = false;

  function ensureRoot(ctx) {
    if (built) return;
    built = true;
    const root = new ctx.THREE.Group();
    root.name = "showgame_ROOT";
    ctx.scene.add(root);
  }

  function rootExists(ctx) {
    let found = false;
    ctx.scene.traverse(o => { if (o.name === "showgame_ROOT") found = true; });
    return found;
  }

  function cycleDealer(ctx) {
    const show = ctx._show;
    if (!show?.dealerButton || !show?.seats?.length) return;

    show.dealerIndex = (typeof show.dealerIndex === "number" ? show.dealerIndex : 0);
    show.dealerIndex = (show.dealerIndex + 1) % show.seats.length;

    const s = show.seats[show.dealerIndex];
    show.dealerButton.position.x = s.x * 0.55;
    show.dealerButton.position.z = s.z * 0.55;
  }

  function nudgeChipsTowardCenter(ctx) {
    const chips = ctx._show?.chips || [];
    for (let i = 0; i < chips.length; i += 7) {
      const c = chips[i];
      if (!c) continue;
      if (c.userData._ox === undefined) c.userData._ox = c.position.x;
      if (c.userData._oz === undefined) c.userData._oz = c.position.z;
      c.position.x = c.userData._ox * (1 - chipNudge);
      c.position.z = c.userData._oz * (1 - chipNudge);
    }
  }

  function resetChips(ctx) {
    const chips = ctx._show?.chips || [];
    for (let i = 0; i < chips.length; i += 7) {
      const c = chips[i];
      if (!c) continue;
      if (c.userData._ox !== undefined) c.position.x = c.userData._ox;
      if (c.userData._oz !== undefined) c.position.z = c.userData._oz;
    }
  }

  function pulseCommunity(ctx, on) {
    const comm = ctx._show?.communityCards || [];
    for (const c of comm) {
      if (!c?.material) continue;
      if (!c.material.emissive) c.material.emissive = new ctx.THREE.Color(0x000000);
      c.material.emissive.setHex(0x33ffff);
      c.material.emissiveIntensity = on ? commPulse : 0.0;
      c.material.needsUpdate = true;
    }
  }

  return {
    name: "showgame",
    onEnable(ctx) { ensureRoot(ctx); },
    update(ctx, { dt }) {
      if (!rootExists(ctx)) return; // toggled OFF
      const show = ctx._show;
      if (!show) return;

      t += dt;

      if (show.dealerButton) show.dealerButton.rotation.y += dt * dealerSpin;

      if (show.bots?.length) {
        for (const b of show.bots) {
          b.userData._sw = (b.userData._sw || Math.random() * Math.PI * 2) + dt * 0.8;
          b.rotation.z = Math.sin(b.userData._sw) * 0.01;
        }
      }

      if (t - lastDeal >= dealInterval) {
        lastDeal = t;
        cycleDealer(ctx);
        nudgeChipsTowardCenter(ctx);
        pulseCommunity(ctx, true);

        setTimeout(() => {
          resetChips(ctx);
          pulseCommunity(ctx, false);
        }, betPulseTime * 1000);
      }
    },
  };
}

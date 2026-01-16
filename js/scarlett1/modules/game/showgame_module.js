// /js/scarlett1/modules/game/showgame_module.js
// SHOWGAME MODULE (FULL) — Modular Forever
// Lightweight continuous “bots playing” loop.
// Requires ctx._show from world_master_module:
// { tableGroup, seats, bots, chips, dealerButton, communityCards }

export function createShowgameModule({
  dealInterval = 6.0,     // seconds between street changes
  betPulseTime = 0.55,    // seconds chips stay nudged
  dealerSpin = 0.9,       // dealer button spin speed
  chipNudge = 0.06,       // how far chips slide toward center (fraction)
  commPulse = 0.85,       // emissive pulse intensity
} = {}) {
  let t = 0;
  let lastDeal = 0;

  function cycleDealer(ctx) {
    const show = ctx._show;
    if (!show?.dealerButton || !show?.seats?.length) return;

    show.dealerIndex = (typeof show.dealerIndex === "number" ? show.dealerIndex : 0);
    show.dealerIndex = (show.dealerIndex + 1) % show.seats.length;

    const s = show.seats[show.dealerIndex];

    // Put dealer on the table edge near that seat
    show.dealerButton.position.x = s.x * 0.55;
    show.dealerButton.position.z = s.z * 0.55;
  }

  function nudgeChipsTowardCenter(ctx) {
    const chips = ctx._show?.chips || [];
    if (!chips.length) return;

    for (let i = 0; i < chips.length; i += 7) {
      const c = chips[i];
      if (!c) continue;

      if (c.userData._ox === undefined) c.userData._ox = c.position.x;
      if (c.userData._oz === undefined) c.userData._oz = c.position.z;

      // slide toward center (0,0) in tableGroup local space
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
      // Make emissive available even if material didn't have it set
      if (!c.material.emissive) c.material.emissive = new ctx.THREE.Color(0x000000);
      c.material.emissive.setHex(0x33ffff);
      c.material.emissiveIntensity = on ? commPulse : 0.0;
      c.material.needsUpdate = true;
    }
  }

  return {
    name: "showgame",
    update(ctx, { dt }) {
      const show = ctx._show;
      if (!show) return;

      t += dt;

      // Dealer button spin (visual)
      if (show.dealerButton) show.dealerButton.rotation.y += dt * dealerSpin;

      // If bots exist but world module already does hand bob, no harm;
      // we can do an extra subtle torso sway (optional).
      if (show.bots?.length) {
        for (const b of show.bots) {
          b.userData._sw = (b.userData._sw || Math.random() * Math.PI * 2) + dt * 0.8;
          const s = Math.sin(b.userData._sw) * 0.01;
          b.rotation.z = s;
        }
      }

      // Street change cycle
      if (t - lastDeal >= dealInterval) {
        lastDeal = t;

        // dealer moves each street
        cycleDealer(ctx);

        // "bet" motion
        nudgeChipsTowardCenter(ctx);

        // community pulse
        pulseCommunity(ctx, true);

        // settle back
        setTimeout(() => {
          resetChips(ctx);
          pulseCommunity(ctx, false);
        }, betPulseTime * 1000);
      }
    },
  };
}

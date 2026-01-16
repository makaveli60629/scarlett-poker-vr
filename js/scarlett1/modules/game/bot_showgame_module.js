// /js/scarlett1/modules/game/bot_showgame_module.js
// Bot Show-Game Module (FULL)
// - Lightweight continuous "game loop" for show
// - No heavy AI, no physics, Quest safe

export function createBotShowGameModule({
  handBobSpeed = 1.2,
  dealInterval = 6.0,
} = {}) {
  let t = 0;
  let phase = 0;
  let lastDeal = 0;

  function cycleDealer(ctx) {
    const dealer = ctx._show?.dealerButton;
    const seats = ctx._show?.seats || [];
    if (!dealer || seats.length === 0) return;

    const idx = (ctx._show.dealerIndex = ((ctx._show.dealerIndex || 0) + 1) % seats.length);
    const s = seats[idx];

    // place dealer near that seat edge (on table surface)
    dealer.position.x = s.x * 0.55;
    dealer.position.z = s.z * 0.55;
  }

  function fakeBetMotion(ctx) {
    const chips = ctx._show?.chips || [];
    if (!chips.length) return;

    // Nudge a few top chips toward center and back
    for (let i = 0; i < chips.length; i += 7) {
      const c = chips[i];
      if (!c) continue;
      const ox = c.userData._ox ?? (c.userData._ox = c.position.x);
      const oz = c.userData._oz ?? (c.userData._oz = c.position.z);

      const toward = 0.06;
      c.position.x = ox * (1 - toward);
      c.position.z = oz * (1 - toward);
    }
  }

  function resetBetMotion(ctx) {
    const chips = ctx._show?.chips || [];
    for (let i = 0; i < chips.length; i += 7) {
      const c = chips[i];
      if (!c) continue;
      if (typeof c.userData._ox === "number") c.position.x = c.userData._ox;
      if (typeof c.userData._oz === "number") c.position.z = c.userData._oz;
    }
  }

  return {
    name: "bot_showgame",
    update(ctx, { dt }) {
      t += dt;

      // Bots hand bob (if present)
      const bots = ctx._show?.bots || [];
      for (const b of bots) {
        b.userData.phase = (b.userData.phase || Math.random() * Math.PI * 2) + dt * handBobSpeed;
        const p = b.userData.phase;
        if (b.userData.handL) b.userData.handL.position.y = 1.10 + Math.sin(p) * 0.02;
        if (b.userData.handR) b.userData.handR.position.y = 1.10 + Math.cos(p) * 0.02;
      }

      // Dealer button rotation (visual)
      const dealer = ctx._show?.dealerButton;
      if (dealer) dealer.rotation.y += dt * 0.9;

      // Deal cycle
      if (t - lastDeal > dealInterval) {
        lastDeal = t;
        phase = (phase + 1) % 4;

        // cycle dealer seat
        cycleDealer(ctx);

        // “bet” motion
        fakeBetMotion(ctx);

        // pulse community cards
        const comm = ctx._show?.communityCards || [];
        for (const c of comm) {
          if (!c?.material) continue;
          c.material.emissive = c.material.emissive || new ctx.THREE.Color(0x000000);
          c.material.emissiveIntensity = 0.8;
        }

        // after short delay, reset pulse & chips
        setTimeout(() => {
          resetBetMotion(ctx);
          const comm2 = ctx._show?.communityCards || [];
          for (const c of comm2) {
            if (!c?.material) continue;
            c.material.emissiveIntensity = 0.0;
          }
        }, 550);
      }
    },
  };
}

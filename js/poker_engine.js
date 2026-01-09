// /js/poker_engine.js — Simple readable poker loop (slow + cinematic)

export function createPokerEngine({ bots, fx, log = console.log }) {

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  let running = false;
  let handNo = 0;

  // Simple “money + pot” tracking
  let pot = 0;

  // Hand names for win banner
  const HANDS = [
    "HIGH CARD",
    "ONE PAIR",
    "TWO PAIR",
    "THREE OF A KIND",
    "STRAIGHT",
    "FLUSH",
    "FULL HOUSE",
    "FOUR OF A KIND",
    "STRAIGHT FLUSH"
  ];

  function aliveBots() {
    return bots.filter(b => b.mesh.visible !== false);
  }

  function pickAliveIndex() {
    const a = aliveBots();
    if (!a.length) return 0;
    return a[Math.floor(Math.random() * a.length)].id;
  }

  async function start() {
    if (running) return;
    running = true;
    loop().catch(e => console.error(e));
  }

  async function loop() {
    while (running) {
      handNo++;
      pot = 0;

      // Occasionally respawn eliminated bots (keep table lively)
      await maybeRespawnOne();

      // New hand
      await fx.onNewHand({ handNo });

      // Dealer rotates each hand
      const dealerIndex = (handNo - 1) % bots.length;
      fx.setDealer(bots[dealerIndex]);

      // “Deal” steps (cinematic text)
      await fx.onDealStep("Dealing hole cards...");
      await fx.onDealStep("Posting blinds...");

      // Blinds (simple)
      const sb = (dealerIndex + 1) % bots.length;
      const bb = (dealerIndex + 2) % bots.length;
      pot += takeMoney(bots[sb], 25);
      pot += takeMoney(bots[bb], 50);
      fx.updateChipStackHeight(bots[sb], bots[sb].stack);
      fx.updateChipStackHeight(bots[bb], bots[bb].stack);
      await fx.onBotAction(bots[sb], "BET", 25, pot);
      await fx.onBotAction(bots[bb], "BET", 50, pot);

      // Preflop action round
      await actionRound();

      // Flop / Turn / River
      await fx.onDealStep("Flop...");
      await actionRound();

      await fx.onDealStep("Turn...");
      await actionRound();

      await fx.onDealStep("River...");
      await actionRound();

      // Showdown
      await fx.onShowdownPause();

      const winnerIdx = pickAliveIndex();
      const winner = bots[winnerIdx];
      const handName = HANDS[Math.floor(rand(0, HANDS.length))];

      // Pay pot
      winner.stack += pot;
      fx.updateChipStackHeight(winner, winner.stack);
      fx.updateBotTag(winner, { stack: winner.stack });

      await fx.onWinner({
        bot: winner,
        winnerName: `BOT ${winner.id + 1}`,
        handName,
        winAmount: pot,
        potNow: pot
      });

      // Chance someone busts (for the “eliminate themselves” request)
      await maybeBustSomeone();

      // Update tags stacks for everyone
      for (const b of bots) {
        if (b.mesh.visible === false) continue;
        fx.updateBotTag(b, { stack: b.stack });
      }

      await delay(900);
    }
  }

  async function actionRound() {
    const actives = aliveBots();
    if (actives.length < 2) return;

    for (const b of actives) {
      await fx.onBotThinking(b);

      const r = Math.random();
      if (r < 0.20) {
        fx.updateBotTag(b, { status: "FOLDED" });
        await fx.onBotAction(b, "FOLD", null, pot);
        continue;
      }

      if (r < 0.60) {
        const amt = Math.min(50, b.stack);
        pot += takeMoney(b, amt);
        fx.updateChipStackHeight(b, b.stack);
        fx.updateBotTag(b, { stack: b.stack, status: "" });
        await fx.onBotAction(b, "CALL", amt, pot);
        continue;
      }

      if (r < 0.90) {
        const amt = Math.min(120, b.stack);
        pot += takeMoney(b, amt);
        fx.updateChipStackHeight(b, b.stack);
        fx.updateBotTag(b, { stack: b.stack, status: "" });
        await fx.onBotAction(b, "RAISE", amt, pot);
        continue;
      }

      // all-in
      const amt = b.stack;
      if (amt > 0) {
        pot += takeMoney(b, amt);
        fx.updateChipStackHeight(b, b.stack);
        fx.updateBotTag(b, { status: "ALL-IN", stack: b.stack });
        await fx.onBotAction(b, "ALL-IN", amt, pot);
      }
    }
  }

  function takeMoney(bot, amt) {
    const a = Math.max(0, Math.min(bot.stack, amt));
    bot.stack -= a;
    fx.updateBotTag(bot, { stack: bot.stack });
    return a;
  }

  async function maybeBustSomeone() {
    // If someone is near zero, sometimes bust them for drama
    const candidates = aliveBots().filter(b => b.stack <= 50);
    if (!candidates.length) return;

    if (Math.random() < 0.55) {
      const bust = candidates[Math.floor(Math.random() * candidates.length)];
      bust.stack = 0;
      fx.updateBotTag(bust, { stack: 0, status: "ELIMINATED" });
      await fx.eliminateBot(bust);
    }
  }

  async function maybeRespawnOne() {
    const eliminated = bots.filter(b => b.mesh.visible === false);
    if (!eliminated.length) return;

    // Bring one back every couple hands
    if (Math.random() < 0.70) {
      const bot = eliminated[Math.floor(Math.random() * eliminated.length)];
      bot.stack = 1500 + Math.floor(rand(0, 1000));
      await fx.respawnBot(bot, { label: `BOT ${bot.id + 1}`, stack: bot.stack });
    }
  }

  return { start };
}

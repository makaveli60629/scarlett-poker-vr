// /js/poker_engine.js — staged dealing + slow decisions + 20,000 stacks

export function createPokerEngine({ bots, fx, cards, dealerPosProvider, log = console.log }) {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a,b) => a + Math.random()*(b-a);

  let running = false;
  let handNo = 0;

  const HANDS = [
    "HIGH CARD","ONE PAIR","TWO PAIR","THREE OF A KIND",
    "STRAIGHT","FLUSH","FULL HOUSE","FOUR OF A KIND","STRAIGHT FLUSH"
  ];

  // Make it HIGH STAKES
  function ensureStacks() {
    for (const b of bots) {
      if (b.stack == null || b.stack < 1) b.stack = 20000;
      fx.updateBotTag?.(b, { stack: b.stack, status: "" });
      fx.updateChipStackHeight?.(b, b.stack);
    }
  }

  function alive() {
    return bots.filter(b => b.mesh?.visible !== false);
  }

  // simple card text generator
  const R = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const S = ["♠","♥","♦","♣"];
  const drawCard = () => `${R[Math.floor(Math.random()*R.length)]}${S[Math.floor(Math.random()*S.length)]}`;

  async function start() {
    if (running) return;
    running = true;
    ensureStacks();
    loop().catch(e => console.error(e));
  }

  async function loop() {
    while (running) {
      handNo++;

      // new hand
      fx.hud?.pushAction?.(`--- Hand #${handNo} ---`);
      await fx.onNewHand?.({ handNo });

      // clear cards
      cards.clearAllCards();

      // dealer rotates
      const dealerIndex = (handNo - 1) % bots.length;
      fx.setDealer?.(bots[dealerIndex]);

      const dealerPos = dealerPosProvider?.() || null;

      // ---- Deal HOLE CARDS (physical on table + hover reflections)
      // Ensure anchors exist based on chairs
      // (cards.ensurePlayerAnchors is called from main.js with chair getter)

      fx.hud?.pushAction?.("Dealing hole cards...");
      for (const b of alive()) {
        const c1 = drawCard();
        const c2 = drawCard();
        b._hole = [c1,c2];
        await cards.dealHoleCardsToPlayer(b.id, c1, c2, { dealerPos });
        await delay(140);
      }

      // ---- Preflop actions (15 sec decisions)
      await bettingRound({ phase: "PREFLOP" });

      // ---- FLOP (3 at once)
      fx.hud?.pushAction?.("Flop...");
      await cards.dealFlop([drawCard(), drawCard(), drawCard()], { dealerPos });
      await bettingRound({ phase: "FLOP" });

      // ---- TURN
      fx.hud?.pushAction?.("Turn...");
      await cards.dealTurn(drawCard(), { dealerPos });
      await bettingRound({ phase: "TURN" });

      // ---- RIVER
      fx.hud?.pushAction?.("River...");
      await cards.dealRiver(drawCard(), { dealerPos });
      await bettingRound({ phase: "RIVER" });

      // ---- SHOWDOWN pause
      await fx.onShowdownPause?.();

      // pick winner
      const a = alive();
      const winner = a[Math.floor(Math.random()*a.length)];
      const handName = HANDS[Math.floor(rand(0, HANDS.length))];

      // Winner reveal: hole cards fly to community area
      await cards.winnerRevealToCommunity(winner.id);

      // payout (simple)
      const pot = Math.floor(rand(2500, 12000));
      winner.stack += pot;

      fx.updateBotTag?.(winner, { stack: winner.stack });
      fx.updateChipStackHeight?.(winner, winner.stack);

      await fx.onWinner?.({
        bot: winner,
        winnerName: `BOT ${winner.id + 1}`,
        handName,
        winAmount: pot,
        potNow: pot
      });

      // small rest
      await delay(1200);
    }
  }

  async function bettingRound({ phase }) {
    fx.hud?.setStatus?.(phase);

    // slow decisions: ~15 seconds per player
    for (const b of alive()) {
      // 15 seconds thinking, but not dead-silent:
      fx.updateBotTag?.(b, { status: "THINKING" });

      // break the 15 seconds into “micro beats” so it feels alive
      // (you can add idle animations here)
      const thinkTotal = 15000;
      const beats = 5;
      for (let i=0;i<beats;i++) {
        await delay(thinkTotal / beats);
        // optional small HUD tick
      }

      fx.updateBotTag?.(b, { status: "" });

      // choose action
      const r = Math.random();
      if (r < 0.18) {
        fx.updateBotTag?.(b, { status: "FOLDED" });
        await fx.onBotAction?.(b, "FOLD", null, null);
      } else if (r < 0.72) {
        const amt = Math.min(500, b.stack);
        b.stack -= amt;
        fx.updateBotTag?.(b, { stack: b.stack });
        fx.updateChipStackHeight?.(b, b.stack);
        await fx.onBotAction?.(b, "CALL", amt, null);
      } else if (r < 0.95) {
        const amt = Math.min(1500, b.stack);
        b.stack -= amt;
        fx.updateBotTag?.(b, { stack: b.stack });
        fx.updateChipStackHeight?.(b, b.stack);
        await fx.onBotAction?.(b, "RAISE", amt, null);
      } else {
        const amt = Math.min(b.stack, 5000);
        b.stack -= amt;
        fx.updateBotTag?.(b, { stack: b.stack, status: "ALL-IN" });
        fx.updateChipStackHeight?.(b, b.stack);
        await fx.onBotAction?.(b, "ALL-IN", amt, null);
      }

      // after-action settle
      await delay(1200);
    }
  }

  return { start };
  }

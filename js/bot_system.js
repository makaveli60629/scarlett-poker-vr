// /js/bot_system.js — BotSystem v2 (simple check/bet/fold loop)
// ✅ Uses PokerSystem API (dealToSeat / bet / revealCommunity / setWinner)
// ✅ Keeps bots low-poly and lightweight

export const BotSystem = (() => {
  function makeBot(THREE) {
    const g = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: 0xd8c7b2, roughness: 0.75, metalness: 0.05 });
    const suit = new THREE.MeshStandardMaterial({ color: 0x1c2433, roughness: 0.9, metalness: 0.08 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.22), suit);
    torso.position.y = 1.25;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), skin);
    head.position.y = 1.62;
    g.add(head);

    const hip = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.18), suit);
    hip.position.y = 0.95;
    g.add(hip);

    const legGeo = new THREE.BoxGeometry(0.12, 0.52, 0.12);
    const l1 = new THREE.Mesh(legGeo, suit); l1.position.set(-0.08, 0.58, 0);
    const l2 = new THREE.Mesh(legGeo, suit); l2.position.set( 0.08, 0.58, 0);
    g.add(l1, l2);

    g.userData = { phase: Math.random() * 10, seated: false, seatIndex: 0 };
    return g;
  }

  return {
    init(ctx, opt = {}) {
      const { THREE, root, log } = ctx;
      const count = opt.count ?? 6;

      const state = {
        THREE, root, log,
        bots: [],
        active: true,

        // AI loop
        poker: opt.poker || null,
        t: 0,
        step: 0,
        stepTimer: 0,

        // scorpion table seat anchors
        seats: opt.seats || [],

        // winner seat
        winnerSeat: 0
      };

      for (let i = 0; i < count; i++) {
        const b = makeBot(THREE);
        b.userData.seatIndex = i;
        state.root.add(b);
        state.bots.push(b);
      }

      log?.(`[bots] BotSystem v2 init ✅ bots=${count}`);
      return {
        state,
        setPoker(pokerApi) { state.poker = pokerApi; },
        seatBots(seatAnchors) {
          state.seats = seatAnchors || state.seats;
          for (let i = 0; i < state.bots.length; i++) {
            const b = state.bots[i];
            const seat = state.seats[i % state.seats.length];
            if (!seat) continue;
            b.position.copy(seat.pos);
            b.rotation.y = seat.yaw;
            b.userData.seated = true;
          }
        },
        update(dt, t) {
          if (!state.active) return;
          state.t = t;

          // idle animation
          for (const b of state.bots) {
            const ph = b.userData.phase || 0;
            b.position.y += Math.sin(t * 1.2 + ph) * 0.0008;
            b.rotation.y += Math.sin(t * 0.6 + ph) * 0.0004;
          }

          if (!state.poker) return;

          // simple timed round flow (demo loop)
          state.stepTimer -= dt;
          if (state.stepTimer > 0) return;

          // next step
          state.step++;
          if (state.step === 1) {
            state.poker.resetRound();
            // deal 2 hole cards to each bot
            for (let i = 0; i < state.bots.length; i++) {
              state.poker.dealToSeat(i);
              state.poker.dealToSeat(i);
            }
            state.stepTimer = 1.2;
            state.log?.("[bots] round start: dealt hole cards");
          } else if (state.step === 2) {
            // small bets
            for (let i = 0; i < state.bots.length; i++) state.poker.bet(5, i);
            state.stepTimer = 1.0;
            state.log?.("[bots] preflop bets");
          } else if (state.step === 3) {
            state.poker.revealCommunity(3);
            state.stepTimer = 1.2;
            state.log?.("[bots] flop");
          } else if (state.step === 4) {
            // bigger bets
            for (let i = 0; i < state.bots.length; i++) {
              const amt = (i % 2 === 0) ? 10 : 25;
              state.poker.bet(amt, i);
            }
            state.stepTimer = 1.0;
            state.log?.("[bots] postflop bets");
          } else if (state.step === 5) {
            state.poker.revealCommunity(4);
            state.stepTimer = 1.0;
            state.log?.("[bots] turn");
          } else if (state.step === 6) {
            state.poker.revealCommunity(5);
            state.stepTimer = 1.2;
            state.log?.("[bots] river");
          } else if (state.step === 7) {
            // pick winner
            state.winnerSeat = Math.floor(Math.random() * state.bots.length);
            state.poker.setWinner(state.winnerSeat);
            state.stepTimer = 2.0;
            state.log?.(`[bots] showdown winner seat=${state.winnerSeat}`);
          } else {
            state.step = 0;
            state.stepTimer = 0.4;
          }
        }
      };
    }
  };
})();

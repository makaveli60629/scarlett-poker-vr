// /js/scorpion_system.js — ScorpionSystem v2 (Auto-seat + Live Table Mode)
// ✅ On enter: seats player + seats bots + starts bot loop
// ✅ On exit: restores player control by moving to lobby anchor (world handles anchor)

export const ScorpionSystem = (() => {
  return {
    init(ctx, opt = {}) {
      const { THREE, log } = ctx;

      const state = {
        active: false,
        seated: false,

        // anchors/seats
        playerSeat: opt.playerSeat || { pos: new THREE.Vector3(26, 0, 0), yaw: -Math.PI/2 },
        botSeats: opt.botSeats || [],

        poker: opt.poker || null,
        bots: opt.bots || null,
      };

      function seatPlayer() {
        ctx.player.position.set(state.playerSeat.pos.x, state.playerSeat.pos.y, state.playerSeat.pos.z);
        ctx.player.rotation.set(0, state.playerSeat.yaw, 0);
        state.seated = true;
        log?.("[scorpion] player auto-seated ✅");
      }

      function enter() {
        state.active = true;
        seatPlayer();

        if (state.bots?.seatBots) state.bots.seatBots(state.botSeats);
        if (state.bots?.setPoker && state.poker) state.bots.setPoker(state.poker);

        log?.("[scorpion] enter ✅ (bots + poker linked)");
      }

      function exit() {
        state.active = false;
        state.seated = false;
        log?.("[scorpion] exit ✅");
      }

      return {
        state,
        setPoker(p) { state.poker = p; },
        setBots(b) { state.bots = b; },
        setSeats({ playerSeat, botSeats }) {
          if (playerSeat) state.playerSeat = playerSeat;
          if (botSeats) state.botSeats = botSeats;
        },
        enter,
        exit,
        update(dt, t) {
          if (!state.active) return;
          // (extra scorpion effects later)
        }
      };
    }
  };
})();

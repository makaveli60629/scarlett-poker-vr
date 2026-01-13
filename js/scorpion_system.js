// /js/scorpion_system.js — ScorpionSystem v2.2 (FULL)
// ✅ Auto-seat player in scorpion room (optional)
// ✅ Restores previous position on exit
// ✅ Integrates with poker/bots if present

export const ScorpionSystem = (() => {
  return {
    init(ctx, opt = {}) {
      const { THREE, player, log } = ctx;

      const state = {
        active: false,
        saved: { pos: new THREE.Vector3(), rotY: 0 },
        playerSeat: opt.playerSeat || { pos: new THREE.Vector3(26,0,0.9), yaw: -Math.PI/2 },
        poker: opt.poker || null,
        bots: opt.bots || null
      };

      const api = {
        enter() {
          if (state.active) return;
          state.active = true;

          state.saved.pos.copy(player.position);
          state.saved.rotY = player.rotation.y;

          player.position.copy(state.playerSeat.pos);
          player.rotation.y = state.playerSeat.yaw;

          log?.("[scorpion] enter ✅ (auto-seat)");
        },
        exit() {
          if (!state.active) return;
          state.active = false;

          player.position.copy(state.saved.pos);
          player.rotation.y = state.saved.rotY;

          log?.("[scorpion] exit ✅ (restore)");
        },
        update() {
          // could add scorpion FX here later
        }
      };

      log?.("[scorpion] ScorpionSystem v2.2 init ✅");
      return api;
    }
  };
})();

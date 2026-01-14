// /js/core/interaction.js — ScarlettVR Prime 10.0 (FULL)
// Hands-only interaction router (no controller models)
// For now: emits pointer interactions for UI buttons / future grab targets.

export const Interaction = (() => {
  return {
    init({ THREE, Signals, hands, log }) {
      const state = {
        enabled: true,
        targets: [] // { obj, id } future
      };

      log?.("[interaction] init ✅");

      // future: hook Signals for GRAB_START/END etc.
      Signals?.on?.("INTERACTION_ENABLE", (p) => {
        state.enabled = p?.enabled !== false;
        log?.(`[interaction] enabled=${state.enabled}`);
      });

      return {
        registerTarget(obj, id) {
          state.targets.push({ obj, id });
        },
        update() {
          // placeholder for raycasts / hand proximity checks
        }
      };
    }
  };
})();

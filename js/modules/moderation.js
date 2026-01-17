// moderation.js — Vote-to-kick + Bouncer guards
// This module is intentionally game-engine agnostic and calls World hooks.

import { World } from "../world.js";

export const Security = {
  activeVotes: Object.create(null),

  processVote(target) {
    if (!target) return;
    if (!this.activeVotes[target]) this.activeVotes[target] = 0;
    this.activeVotes[target] += 1;

    console.log("[Security] vote", target, this.activeVotes[target]);

    if (this.activeVotes[target] >= 3) {
      this.executeBouncer(target);
      // reset votes after action
      this.activeVotes[target] = 0;
    }
  },

  executeBouncer(playerID) {
    const guards = World.spawnNPC("Guard_Model", 2);
    World.animate(guards, "Grab_And_Carry", playerID);

    // Pixel dissolve: player + guards
    setTimeout(() => {
      World.dissolve(playerID, { color: 0xff1a1a });
      for (const g of guards) World.dissolve(g.uuid, { color: 0xff1a1a });
    }, 2500);
  }
};

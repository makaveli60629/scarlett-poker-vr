import { State } from "./state.js";
import { Crown } from "./crown.js";

export const Tournament = {
  t: 0,
  next: 60,

  init() {
    this.t = 0;
    this.next = 60 + Math.random() * 60;
  },

  update(dt) {
    if (!State.features.tournaments) return;

    this.t += dt;
    if (this.t < this.next) return;

    this.t = 0;
    this.next = 60 + Math.random() * 90;

    // Stub tournament: crown changes hands occasionally
    const from = Crown.holder || "Unknown";
    const to = ["King Jericho", "Lady Nova", "Maka V", "Shadow Ace", "Crimson", "Dealer Zero"][Math.floor(Math.random() * 6)];
    if (to !== from) Crown.take(from, to);
  }
};

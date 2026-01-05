// js/inventory.js — Patch 6.4
// Simple inventory + cosmetics persistence using localStorage (GitHub-safe)

const KEY = "scarlett_vr_inventory_v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const Inventory = {
  data: null,

  init() {
    const existing = load();
    this.data = existing || {
      chips: 10000,
      cosmetics: {
        // owned flags
        hat_black: true,     // free starter
        glasses_neon: false,
        crown_fx: false,
        shirt_nova: false
      },
      equipped: {
        hat: "hat_black",
        glasses: null,
        fx: null,
        shirt: null
      }
    };
    save(this.data);
  },

  getChips() {
    return this.data?.chips ?? 0;
  },

  addChips(amount) {
    if (!this.data) return;
    this.data.chips = Math.max(0, (this.data.chips || 0) + (amount | 0));
    save(this.data);
  },

  spendChips(amount) {
    if (!this.data) return false;
    const a = Math.max(0, amount | 0);
    if ((this.data.chips || 0) < a) return false;
    this.data.chips -= a;
    save(this.data);
    return true;
  },

  owns(itemId) {
    return !!this.data?.cosmetics?.[itemId];
  },

  unlock(itemId) {
    if (!this.data) return;
    this.data.cosmetics[itemId] = true;
    save(this.data);
  },

  equip(slot, itemId) {
    if (!this.data) return false;
    if (itemId && !this.owns(itemId)) return false;
    this.data.equipped[slot] = itemId;
    save(this.data);
    return true;
  },

  equipped() {
    return this.data?.equipped || {};
  }
};

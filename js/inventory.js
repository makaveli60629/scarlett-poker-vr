export const Inventory = {
  chips: 10000,
  owned: new Set(),
  equipped: {
    shirt: null,
    face: null,
    hat: null,
  },

  init() {
    // starter items
    this.owned.add("shirt_basic_black");
    this.owned.add("face_basic");
    this.equipped.shirt = "shirt_basic_black";
    this.equipped.face = "face_basic";
  },

  add(itemId) { this.owned.add(itemId); },
  has(itemId) { return this.owned.has(itemId); },

  equip(slot, itemId) {
    this.equipped[slot] = itemId;
  },
};

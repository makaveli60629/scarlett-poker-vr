export const Store = {
  inventory: null,

  catalog: [
    { id: "shirt_basic_black", type: "shirt", name: "Basic Tee (Black)", price: 0 },
    { id: "shirt_nova_gold", type: "shirt", name: "Team Nova Gold Tee", price: 2500 },
    { id: "face_basic", type: "face", name: "Basic Face", price: 0 },
    { id: "face_slick", type: "face", name: "Slick Face", price: 1500 },
    { id: "hat_vip", type: "hat", name: "VIP Cap", price: 2000 },
  ],

  init({ inventory }) {
    this.inventory = inventory;
    // Optional: later attach this to in-world kiosk UI
    console.log("🛒 Store ready:", this.catalog.length, "items");
  },

  buy(itemId) {
    const item = this.catalog.find(x => x.id === itemId);
    if (!item) return false;

    if (this.inventory.has(itemId)) return true;
    if (this.inventory.chips < item.price) return false;

    this.inventory.chips -= item.price;
    this.inventory.add(itemId);
    return true;
  },
};

import { State } from './state.js';

export const Store = {
  items: [
    { id: "chips_1000",  name: "1,000 Chips",  add: 1000 },
    { id: "chips_5000",  name: "5,000 Chips",  add: 5000 },
    { id: "chips_10000", name: "10,000 Chips", add: 10000 }
  ],

  buy(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;
    State.addMoney(item.add);
    console.log(`✅ Bought ${item.name}. Bank: ${State.money}`);
    return true;
  }
};

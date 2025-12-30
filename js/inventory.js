const Inventory = {
  items: [],
  
  addItem(itemName) {
    this.items.push(itemName);
    this.saveInventory();
  },

  removeItem(itemName) {
    this.items = this.items.filter(i => i !== itemName);
    this.saveInventory();
  },

  getItems() {
    return this.items;
  },

  saveInventory() {
    localStorage.setItem('scarlettInventory', JSON.stringify(this.items));
  },

  loadInventory() {
    const stored = localStorage.getItem('scarlettInventory');
    if(stored) this.items = JSON.parse(stored);
  }
};

// Load inventory on script load
Inventory.loadInventory();

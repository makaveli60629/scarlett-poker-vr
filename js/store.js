// store.js
// Handles in-game store purchases, inventory, and wrist HUD display

import { deductChips, addItemToInventory } from './economy.js';

// Sample store items
const storeItems = [
  { id: 1, name: "Golden Chip Set", price: 2000, type: "chip" },
  { id: 2, name: "VIP Table Theme", price: 5000, type: "table" },
  { id: 3, name: "Luxury Avatar Skin", price: 3000, type: "avatar" },
  { id: 4, name: "Crown Hat", price: 1000, type: "avatar" },
  { id: 5, name: "Special Card Back", price: 1500, type: "card" }
];

// Render store in VR panel or HUD
export function renderStore() {
  const storeContainer = document.getElementById('store-items');
  storeContainer.innerHTML = ''; // Clear previous

  storeItems.forEach(item => {
    const itemEl = document.createElement('a-box');
    itemEl.setAttribute('position', `0 ${storeItems.indexOf(item) * -0.6} 0`);
    itemEl.setAttribute('width', '1');
    itemEl.setAttribute('height', '0.5');
    itemEl.setAttribute('depth', '0.2');
    itemEl.setAttribute('color', '#FFD700');
    itemEl.setAttribute('class', 'clickable');

    const label = document.createElement('a-text');
    label.setAttribute('value', `${item.name}\n${item.price} chips`);
    label.setAttribute('align', 'center');
    label.setAttribute('color', '#000');
    label.setAttribute('position', '0 0 0.11');
    label.setAttribute('width', '2');
    itemEl.appendChild(label);

    // Purchase logic
    itemEl.addEventListener('click', () => {
      if (deductChips(item.price)) {
        addItemToInventory(item);
        alert(`${item.name} purchased!`);
      }
    });

    storeContainer.appendChild(itemEl);
  });
}

// Render player inventory
export function renderInventory(inventory) {
  const invContainer = document.getElementById('player-inventory');
  invContainer.innerHTML = '';

  inventory.forEach((item, i) => {
    const itemEl = document.createElement('a-box');
    itemEl.setAttribute('position', `0 ${i * -0.5} 0`);
    itemEl.setAttribute('width', '1');
    itemEl.setAttribute('height', '0.4');
    itemEl.setAttribute('depth', '0.2');
    itemEl.setAttribute('color', '#00CED1');

    const label = document.createElement('a-text');
    label.setAttribute('value', item.name);
    label.setAttribute('align', 'center');
    label.setAttribute('color', '#000');
    label.setAttribute('position', '0 0 0.11');
    label.setAttribute('width', '2');

    itemEl.appendChild(label);
    invContainer.appendChild(itemEl);
  });
}

// Initialize HUD buttons for store
document.addEventListener('DOMContentLoaded', () => {
  const storeBtn = document.getElementById('open-store');
  const invBtn = document.getElementById('open-inventory');

  if (storeBtn) storeBtn.addEventListener('click', renderStore);
  if (invBtn) storeBtn.addEventListener('click', () => renderInventory(window.playerData.inventory));
});

AFRAME.registerComponent('wrist-hud', {
    schema: {
        hand: {type: 'string', default: 'left'} // left or right hand
    },
    init: function() {
        const handEl = document.querySelector(`#${this.data.hand}Hand`);
        if (!handEl) return;

        // Create HUD entity
        const hud = document.createElement('a-plane');
        hud.setAttribute('width', 0.3);
        hud.setAttribute('height', 0.2);
        hud.setAttribute('color', '#000');
        hud.setAttribute('material', 'opacity: 0.9; side: double');
        hud.setAttribute('position', '0 0.05 0.05');
        hud.setAttribute('rotation', '-45 0 0');
        hud.setAttribute('class', 'hud-display');

        // Add text elements
        const bankText = document.createElement('a-text');
        bankText.setAttribute('id', 'hud-bank');
        bankText.setAttribute('value', `Bank: $${Economy.getPlayerBank()}`);
        bankText.setAttribute('color', 'gold');
        bankText.setAttribute('width', 0.28);
        bankText.setAttribute('position', '0 0.05 0.01');
        bankText.setAttribute('align', 'center');

        const inventoryText = document.createElement('a-text');
        inventoryText.setAttribute('id', 'hud-inventory');
        inventoryText.setAttribute('value', `Inventory: ${Inventory.getItems().join(', ') || 'Empty'}`);
        inventoryText.setAttribute('color', 'white');
        inventoryText.setAttribute('width', 0.28);
        inventoryText.setAttribute('position', '0 -0.05 0.01');
        inventoryText.setAttribute('align', 'center');

        hud.appendChild(bankText);
        hud.appendChild(inventoryText);

        handEl.appendChild(hud);

        // Update HUD every second
        this.hudInterval = setInterval(() => {
            bankText.setAttribute('value', `Bank: $${Economy.getPlayerBank()}`);
            inventoryText.setAttribute('value', `Inventory: ${Inventory.getItems().join(', ') || 'Empty'}`);
        }, 1000);
    },
    remove: function() {
        clearInterval(this.hudInterval);
        const handEl = document.querySelector(`#${this.data.hand}Hand`);
        if(handEl) {
            const hud = handEl.querySelector('.hud-display');
            if(hud) handEl.removeChild(hud);
        }
    }
});

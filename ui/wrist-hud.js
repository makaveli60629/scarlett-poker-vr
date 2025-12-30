AFRAME.registerComponent('wrist-hud', {
    schema: {
        playerID: { type: 'string', default: 'player1' }
    },

    init: function () {
        this.playerID = this.data.playerID;
        this.scene = this.el.sceneEl;

        // Create chip display
        this.chipText = document.createElement('a-text');
        this.chipText.setAttribute('value', 'CHIPS: $0');
        this.chipText.setAttribute('align', 'center');
        this.chipText.setAttribute('position', '0 0.05 0');
        this.chipText.setAttribute('color', 'gold');
        this.chipText.setAttribute('width', 1.5);
        this.el.appendChild(this.chipText);

        // Create inventory display
        this.inventoryText = document.createElement('a-text');
        this.inventoryText.setAttribute('value', 'Inventory: None');
        this.inventoryText.setAttribute('align', 'center');
        this.inventoryText.setAttribute('position', '0 -0.05 0');
        this.inventoryText.setAttribute('color', 'white');
        this.inventoryText.setAttribute('width', 1.5);
        this.el.appendChild(this.inventoryText);

        // Update values initially
        this.updateChips();
        this.updateInventory();
    },

    updateChips: function() {
        const inventorySystem = this.scene.systems['inventory'];
        const chips = inventorySystem ? inventorySystem.getChips(this.playerID) : 0;
        this.chipText.setAttribute('value', 'CHIPS: $' + chips);
    },

    updateInventory: function() {
        const inventorySystem = this.scene.systems['inventory'];
        const items = inventorySystem ? inventorySystem.getItems(this.playerID) : [];
        const display = items.length ? items.join(', ') : 'None';
        this.inventoryText.setAttribute('value', 'Inventory: ' + display);
    },

    displayStore: function(items, freeGiveaways, playerID) {
        // Remove previous store menu if exists
        const oldMenu = this.el.querySelectorAll('.store-item');
        oldMenu.forEach(i => this.el.removeChild(i));

        let posY = 0.15;

        // Display purchasable items
        items.forEach(item => {
            const itemText = document.createElement('a-text');
            itemText.classList.add('store-item');
            itemText.setAttribute('value', `${item.name} - $${item.price}`);
            itemText.setAttribute('align', 'center');
            itemText.setAttribute('position', `0 ${posY} 0`);
            itemText.setAttribute('color', 'cyan');
            itemText.setAttribute('width', 1.5);
            itemText.setAttribute('look-at', '[camera]');
            this.el.appendChild(itemText);
            posY -= 0.05;
        });

        // Display free giveaways
        freeGiveaways.forEach(item => {
            const freeText = document.createElement('a-text');
            freeText.classList.add('store-item');
            freeText.setAttribute('value', `${item.name} - FREE`);
            freeText.setAttribute('align', 'center');
            freeText.setAttribute('position', `0 ${posY} 0`);
            freeText.setAttribute('color', 'green');
            freeText.setAttribute('width', 1.5);
            freeText.setAttribute('look-at', '[camera]');
            this.el.appendChild(freeText);
            posY -= 0.05;
        });
    }
});

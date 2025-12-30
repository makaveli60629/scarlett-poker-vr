AFRAME.registerSystem('store', {
    schema: {},

    init: function () {
        this.items = [
            { id: 'avatar1', name: 'Luxury Avatar', price: 5000 },
            { id: 'chipSkin1', name: 'Gold Chips', price: 2000 },
            { id: 'tableSkin1', name: 'Royal Table', price: 3000 },
        ];
        this.freeGiveaways = [
            { id: 'freeChips500', name: '500 Free Chips', amount: 500 }
        ];
    },

    listItems: function() {
        console.log('Store Items Available:');
        this.items.forEach(item => {
            console.log(`${item.name} - $${item.price}`);
        });
        this.freeGiveaways.forEach(item => {
            console.log(`${item.name} - FREE`);
        });
    },

    purchaseItem: function(playerID, itemID) {
        const inventory = this.el.sceneEl.systems['inventory'];
        const economy = this.el.sceneEl.systems['economy'];

        const item = this.items.find(i => i.id === itemID);
        if (!item) return console.log(`Item ${itemID} not found.`);

        if (inventory.getChips(playerID) < item.price) {
            console.log(`Player ${playerID} cannot afford ${item.name}.`);
            return;
        }

        inventory.subtractChips(playerID, item.price);
        inventory.addItem(playerID, itemID);

        // Update HUD
        const wrist = document.querySelector('[wrist-hud]');
        if (wrist) wrist.components['wrist-hud'].updateInventory(playerID);

        console.log(`Player ${playerID} purchased ${item.name} for $${item.price}.`);
    },

    claimFreeGiveaway: function(playerID, giveawayID) {
        const inventory = this.el.sceneEl.systems['inventory'];
        const giveaway = this.freeGiveaways.find(g => g.id === giveawayID);
        if (!giveaway) return console.log(`Giveaway ${giveawayID} not found.`);

        inventory.addChips(playerID, giveaway.amount);

        // Update HUD
        const wrist = document.querySelector('[wrist-hud]');
        if (wrist) wrist.components['wrist-hud'].chipText.setAttribute('value', 'CHIPS: $' + inventory.getChips(playerID));

        console.log(`Player ${playerID} claimed free giveaway: ${giveaway.name} ($${giveaway.amount}).`);
    },

    openStoreUI: function(playerID) {
        const wrist = document.querySelector('[wrist-hud]');
        if (!wrist) return;

        wrist.components['wrist-hud'].displayStore(this.items, this.freeGiveaways, playerID);
        console.log(`Store UI opened for player ${playerID}.`);
    }
});

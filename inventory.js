AFRAME.registerSystem('inventory', {
    schema: {},

    init: function () {
        // Initialize player inventory
        this.players = {}; // key = playerID, value = {chips, items, skins, trophies}
    },

    addPlayer: function (playerID) {
        if (!this.players[playerID]) {
            this.players[playerID] = {
                chips: 50000,
                items: [],
                skins: [],
                trophies: []
            };
        }
    },

    getPlayer: function (playerID) {
        return this.players[playerID];
    },

    addItem: function (playerID, item) {
        if (this.players[playerID]) {
            this.players[playerID].items.push(item);
            console.log(`Added item ${item} to player ${playerID}`);
        }
    },

    addSkin: function (playerID, skin) {
        if (this.players[playerID]) {
            this.players[playerID].skins.push(skin);
            console.log(`Added skin ${skin} to player ${playerID}`);
        }
    },

    addTrophy: function (playerID, trophy) {
        if (this.players[playerID]) {
            this.players[playerID].trophies.push(trophy);
            console.log(`Added trophy ${trophy} to player ${playerID}`);
        }
    },

    addChips: function (playerID, amount) {
        if (this.players[playerID]) {
            this.players[playerID].chips += amount;
        }
    },

    subtractChips: function (playerID, amount) {
        if (this.players[playerID]) {
            this.players[playerID].chips -= amount;
            if (this.players[playerID].chips < 0) this.players[playerID].chips = 0;
        }
    },

    getChips: function (playerID) {
        return this.players[playerID] ? this.players[playerID].chips : 0;
    }
});

// WRIST HUD INTEGRATION
AFRAME.registerComponent('wrist-hud', {
    schema: {
        hand: {type: 'string', default: 'left'}
    },

    init: function () {
        const handEl = this.el;
        const hudPlane = document.createElement('a-plane');

        hudPlane.setAttribute('width', 0.6);
        hudPlane.setAttribute('height', 0.4);
        hudPlane.setAttribute('color', '#000');
        hudPlane.setAttribute('opacity', '0.85');
        hudPlane.setAttribute('position', '0 0 -0.15');
        handEl.appendChild(hudPlane);

        // Add chip display
        const chipText = document.createElement('a-text');
        chipText.setAttribute('value', 'CHIPS: 0');
        chipText.setAttribute('color', 'gold');
        chipText.setAttribute('align', 'center');
        chipText.setAttribute('width', 2);
        chipText.setAttribute('position', '0 0.1 0.01');
        hudPlane.appendChild(chipText);

        // Add item count
        const itemText = document.createElement('a-text');
        itemText.setAttribute('value', 'ITEMS: 0');
        itemText.setAttribute('color', 'white');
        itemText.setAttribute('align', 'center');
        itemText.setAttribute('width', 2);
        itemText.setAttribute('position', '0 -0.05 0.01');
        hudPlane.appendChild(itemText);

        this.chipText = chipText;
        this.itemText = itemText;

        // Update HUD every second
        setInterval(() => {
            const system = this.el.sceneEl.systems['inventory'];
            const playerID = 'localPlayer'; // single player for now
            system.addPlayer(playerID); // ensure player exists

            this.chipText.setAttribute('value', 'CHIPS: $' + system.getChips(playerID));
            const player = system.getPlayer(playerID);
            this.itemText.setAttribute('value', 'ITEMS: ' + player.items.length);
        }, 1000);
    }
});

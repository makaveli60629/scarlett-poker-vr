// ==========================
// SCARLETT VR POKER ECONOMY MODULE
// Handles: chips, bank, tournaments, achievements, inventory, wrist HUD
// ==========================

AFRAME.registerComponent('economy-system', {
    schema: {
        startingBank: {type: 'int', default: 50000}, // Default starting bank
    },

    init: function() {
        this.bank = this.data.startingBank;
        this.chips = 0;
        this.achievements = {};
        this.inventory = [];
        this.tournamentEntries = {};
        this.updateHUD();

        // Listen to game events
        this.el.addEventListener('bet', e => this.betChips(e.detail.amount));
        this.el.addEventListener('win', e => this.addWinnings(e.detail.amount));
        this.el.addEventListener('achievement', e => this.unlockAchievement(e.detail.name));
        this.el.addEventListener('buy-item', e => this.buyItem(e.detail.item, e.detail.price));
        this.el.addEventListener('tournament-entry', e => this.enterTournament(e.detail.tournamentName));
    },

    // -------------------------
    // Chip & Bank Management
    // -------------------------
    betChips: function(amount) {
        if(this.bank >= amount) {
            this.bank -= amount;
            this.chips += amount;
            this.updateHUD();
        } else {
            console.warn('Not enough funds to bet!');
        }
    },

    addWinnings: function(amount) {
        this.bank += amount;
        this.updateHUD();
        this.showNotification(`You won $${amount} chips!`);
    },

    // -------------------------
    // Achievements
    // -------------------------
    unlockAchievement: function(name) {
        if(!this.achievements[name]) {
            this.achievements[name] = true;
            this.showNotification(`Achievement unlocked: ${name}`);
        }
    },

    // -------------------------
    // Inventory Management
    // -------------------------
    buyItem: function(item, price) {
        if(this.bank >= price) {
            this.bank -= price;
            this.inventory.push(item);
            this.updateHUD();
            this.showNotification(`Purchased: ${item}`);
        } else {
            this.showNotification('Not enough chips to purchase this item.');
        }
    },

    // -------------------------
    // Tournament Entries & Events
    // -------------------------
    enterTournament: function(name) {
        if(!this.tournamentEntries[name]) {
            this.tournamentEntries[name] = true;
            this.showNotification(`Entered tournament: ${name}`);
        } else {
            this.showNotification(`Already entered: ${name}`);
        }
    },

    // -------------------------
    // HUD Updates
    // -------------------------
    updateHUD: function() {
        const wristCash = document.querySelector('#wrist-cash');
        if(wristCash) {
            wristCash.setAttribute('value', `BANK: $${this.bank} | CHIPS: $${this.chips}`);
        }
    },

    // -------------------------
    // Notifications
    // -------------------------
    showNotification: function(message, duration = 2500) {
        let notification = document.createElement('a-text');
        notification.setAttribute('value', message);
        notification.setAttribute('color', 'gold');
        notification.setAttribute('align', 'center');
        notification.setAttribute('position', '0 2 -1'); // Fixed in front of player
        notification.setAttribute('width', '4');
        this.el.sceneEl.appendChild(notification);

        setTimeout(() => {
            notification.parentNode.removeChild(notification);
        }, duration);
    },

    // -------------------------
    // Free Cash App Giveaway Ticket
    // -------------------------
    awardFreeTicket: function(eventName, amount = 5) {
        this.showNotification(`Free $${amount} Cash App ticket awarded for ${eventName}!`);
        // Logic: store ticket in inventory for tournament entry
        this.inventory.push({type: 'cashAppTicket', event: eventName, value: amount});
    },

    // -------------------------
    // Tip Chips to Friend
    // -------------------------
    tipFriend: function(friendName, amount) {
        if(amount > 2000) amount = 2000; // Max tip limit
        if(this.chips >= amount) {
            this.chips -= amount;
            // In a full multiplayer system, you would send this to friend account
            this.showNotification(`You tipped ${friendName} ${amount} chips!`);
            this.updateHUD();
        } else {
            this.showNotification(`Not enough chips to tip ${friendName}`);
        }
    }
});

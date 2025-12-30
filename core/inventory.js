AFRAME.registerSystem('inventory', {
    schema: {},

    init: function () {
        this.players = {};
        console.log('[Inventory] System initialized');
    },

    // -----------------------------
    // PLAYER SETUP
    // -----------------------------
    createPlayer: function (playerID) {
        if (!this.players[playerID]) {
            this.players[playerID] = {
                chips: 50000, // Starting chips
                items: [],
                tickets: []
            };
            console.log(`[Inventory] Player created: ${playerID}`);
        }
    },

    // -----------------------------
    // CHIP LOGIC
    // -----------------------------
    getChips: function (playerID) {
        this.createPlayer(playerID);
        return this.players[playerID].chips;
    },

    addChips: function (playerID, amount) {
        this.createPlayer(playerID);
        this.players[playerID].chips += amount;
        console.log(`[Inventory] ${playerID} +${amount} chips`);
    },

    subtractChips: function (playerID, amount) {
        this.createPlayer(playerID);
        if (this.players[playerID].chips < amount) {
            console.warn(`[Inventory] ${playerID} insufficient chips`);
            return false;
        }
        this.players[playerID].chips -= amount;
        console.log(`[Inventory] ${playerID} -${amount} chips`);
        return true;
    },

    // -----------------------------
    // ITEM LOGIC
    // -----------------------------
    getItems: function (playerID) {
        this.createPlayer(playerID);
        return this.players[playerID].items;
    },

    addItem: function (playerID, itemID) {
        this.createPlayer(playerID);
        if (!this.players[playerID].items.includes(itemID)) {
            this.players[playerID].items.push(itemID);
            console.log(`[Inventory] ${playerID} received item: ${itemID}`);
        }
    },

    removeItem: function (playerID, itemID) {
        this.createPlayer(playerID);
        this.players[playerID].items =
            this.players[playerID].items.filter(i => i !== itemID);
        console.log(`[Inventory] ${playerID} removed item: ${itemID}`);
    },

    // -----------------------------
    // EVENT / TOURNAMENT TICKETS
    // -----------------------------
    addTicket: function (playerID, ticketID) {
        this.createPlayer(playerID);
        this.players[playerID].tickets.push(ticketID);
        console.log(`[Inventory] ${playerID} received ticket: ${ticketID}`);
    },

    getTickets: function (playerID) {
        this.createPlayer(playerID);
        return this.players[playerID].tickets;
    },

    useTicket: function (playerID, ticketID) {
        this.createPlayer(playerID);
        const index = this.players[playerID].tickets.indexOf(ticketID);
        if (index !== -1) {
            this.players[playerID].tickets.splice(index, 1);
            console.log(`[Inventory] ${playerID} used ticket: ${ticketID}`);
            return true;
        }
        console.warn(`[Inventory] ${playerID} does not have ticket: ${ticketID}`);
        return false;
    },

    // -----------------------------
    // DEBUG / DEV TOOLS
    // -----------------------------
    resetPlayer: function (playerID) {
        delete this.players[playerID];
        console.log(`[Inventory] Player reset: ${playerID}`);
    },

    getFullProfile: function (playerID) {
        this.createPlayer(playerID);
        return JSON.parse(JSON.stringify(this.players[playerID]));
    }
});

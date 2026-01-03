export const Logic = {
    // Persistent Stats
    stats: {
        chips: 5000,
        rank: "Gold",
        inventory: ["Standard Deck", "Red Chair"],
        vaultLocked: true
    },

    // Poker State
    gameState: {
        pot: 0,
        currentBet: 0,
        stage: "Lobby" // Lobby, Dealing, Flop, Turn, River
    },

    // Functions
    addChips(amount) {
        this.stats.chips += amount;
        console.log(`New Balance: $${this.stats.chips}`);
        this.updateHUD();
    },

    buyItem(item, cost) {
        if (this.stats.chips >= cost) {
            this.stats.chips -= cost;
            this.stats.inventory.push(item);
            return true;
        }
        return false;
    },

    updateHUD() {
        // This will be called to refresh the Wrist Watch display
        const event = new CustomEvent('logicUpdate', { detail: this.stats });
        window.dispatchEvent(event);
    }
};

// --- STORE SYSTEM (Permanent) ---
const StoreSystem = {
    // Inventory definition
    items: {
        ticket: { id: 'special_ticket', price: 1000, name: 'Tournament Entry' },
        chips: { id: 'chip_pack', price: 0, name: 'Starter Pack', amount: 5000 }
    },

    init() {
        console.log("Store System Online.");
        this.setupListeners();
    },

    setupListeners() {
        const storePortal = document.querySelector('#portal-store');
        if (storePortal) {
            storePortal.addEventListener('click', () => {
                this.openStoreMenu();
            });
        }
    },

    openStoreMenu() {
        // Logic to show a VR UI menu
        // For now, we will use a prompt for testing
        const choice = confirm("Buy Special Ticket for 1000 Blue Chips?");
        if (choice) {
            this.purchaseTicket();
        }
    },

    purchaseTicket() {
        if (playerState.chips >= this.items.ticket.price) {
            playerState.chips -= this.items.ticket.price;
            playerState.hasTournamentTicket = true;
            console.log("Purchase Successful: Special Ticket Added.");
            alert("You now have a Special Ticket for the Tournament!");
        } else {
            alert("Not enough chips! Claim your daily blue chips first.");
        }
    }
};

// Initialize when the logic file is ready
window.addEventListener('load', () => {
    StoreSystem.init();
});

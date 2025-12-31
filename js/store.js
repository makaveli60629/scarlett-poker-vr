// --- STORE INVENTORY CONFIG ---
const STORE_ITEMS = {
    TICKETS: [
        { id: 'main_event_pass', name: 'Main Event Special Ticket', price: 1000, type: 'access' }
    ],
    CHIPS: [
        { id: 'starter_pack', name: '5k Blue Chips', price: 5.00, amount: 5000, type: 'currency' },
        { id: 'pro_pack', name: '50k Blue Chips', price: 20.00, amount: 50000, type: 'currency' }
    ],
    SKINS: [
        { id: 'gold_card_back', name: 'Gold Skin Cards', price: 2500, type: 'visual' }
    ]
};

// --- STORE CORE LOGIC ---
const StoreManager = {
    init() {
        console.log("Store Engine Online: Permanent Structure Loaded.");
        this.createStoreUI();
    },

    // Function to handle purchases
    buyItem(itemID) {
        // 1. Find the item in our inventory categories
        let item = [...STORE_ITEMS.TICKETS, ...STORE_ITEMS.CHIPS, ...STORE_ITEMS.SKINS]
                   .find(i => i.id === itemID);

        if (!item) return;

        // 2. Logic for Tickets
        if (item.type === 'access') {
            if (playerState.chips >= item.price) {
                playerState.chips -= item.price;
                playerState.hasTournamentTicket = true;
                this.notifyPlayer(`Purchased: ${item.name}. Tournament Portal Unlocked!`);
            } else {
                this.notifyPlayer("Not enough Blue Chips!");
            }
        }

        // 3. Logic for Chip Packs (Real currency or exchange)
        if (item.type === 'currency') {
            playerState.chips += item.amount;
            this.notifyPlayer(`Added ${item.amount} chips to your account.`);
        }
    },

    createStoreUI() {
        // This generates the 3D buttons inside the Store Portal area
        const storeArea = document.querySelector('#portal-store');
        
        // Add interactive buttons for the items (Low-poly UI)
        // Note: These buttons use the Oculus Trigger via logic.js
    },

    notifyPlayer(msg) {
        console.log("STORE NOTIFICATION: " + msg);
        // This hooks into your HUD system
    }
};

window.addEventListener('load', () => StoreManager.init());

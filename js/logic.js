// Game Logic, Store, and Inventory Management
export const GameState = {
    balance: 1000,
    inventory: [],
    stores: [
        { name: "High Roller Suite", minEntry: 1000000 },
        { name: "The Billionaire Club", minEntry: 1500000000 } // Idea for 1.5 Billion
    ],
    
    processWin(player, amount) {
        player.chips += amount;
        // Trigger the pop-up notification from index.js
    }
};

export const OculusControlsMap = {
    primary: "Trigger",
    secondary: "Grip",
    teleport: "Left Stick",
    action: "A Button"
};

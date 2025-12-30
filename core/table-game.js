// Table Game Logic for Scarlett VR Poker

document.addEventListener("DOMContentLoaded", () => {
    const hudChips = document.querySelector("#hudChips");
    const hudPot = document.querySelector("#hudPot");
    const hudTickets = document.querySelector("#hudTickets");

    const potChips = document.querySelector("#potChips");
    const communityCards = document.querySelector("#communityCards");

    const players = [
        {id: "playerSeat", chips: 1000, hand: []},
        {id: "aiSeat1", chips: 1000, hand: []},
        {id: "aiSeat2", chips: 1000, hand: []},
        {id: "aiSeat3", chips: 1000, hand: []},
        {id: "aiSeat4", chips: 1000, hand: []},
        {id: "aiSeat5", chips: 1000, hand: []},
    ];

    // Initialize chips and pot display
    function updateHUD() {
        hudChips.setAttribute("value", `Chips: ${players[0].chips}`);
        hudPot.setAttribute("value", `Pot: ${economy.pot}`);
        hudTickets.setAttribute("value", `Tickets: ${economy.tickets}`);
    }

    // Deal cards to each player (placeholder logic)
    function dealHands() {
        players.forEach(player => {
            player.hand = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
        });
        // Display for debug
        console.log("Hands dealt:", players.map(p => p.hand));
    }

    // Start a new round
    function startRound() {
        economy.pot = 0;
        dealHands();
        updateHUD();
    }

    // Place bet
    function placeBet(playerIndex, amount) {
        const player = players[playerIndex];
        if (player.chips >= amount) {
            player.chips -= amount;
            economy.pot += amount;
            updateHUD();
        } else {
            console.warn("Not enough chips");
        }
    }

    // Example auto-AI betting
    function aiBetting() {
        for (let i = 1; i < players.length; i++) {
            placeBet(i, Math.floor(Math.random() * 50));
        }
    }

    // Start game loop
    startRound();
    aiBetting();

    // Animation of chips (hover effect)
    potChips.addEventListener("mouseenter", () => {
        potChips.setAttribute("color", "yellow");
    });
    potChips.addEventListener("mouseleave", () => {
        potChips.setAttribute("color", "red");
    });

    // Update HUD every 1 sec
    setInterval(updateHUD, 1000);
});

// --- MOVEMENT STICK LOGIC ---
document.querySelector('a-scene').addEventListener('loaded', () => {
    const rig = document.querySelector('#rig');
    
    // Ensure the player is standing on the ground
    rig.setAttribute('movement-controls', {
        speed: 0.2,
        fly: false
    });

    console.log("Movement logic initialized. Joysticks should now be active.");
});


// --- GLOBAL USER DATA ---
const playerState = {
    chips: 1000,
    hasTournamentTicket: false,
    dailyClaimed: false,
    currentRoom: 'Lobby'
};

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    setupPortalListeners();
    checkDailyStatus();
});

// --- PORTAL & TICKET LOGIC ---
function setupPortalListeners() {
    // Tournament Portal Logic
    const tournamentPortal = document.querySelector('#portal-tournament');
    if (tournamentPortal) {
        tournamentPortal.addEventListener('click', () => {
            if (playerState.hasTournamentTicket) {
                teleportToRoom('MainEvent');
            } else {
                alert("ACCESS DENIED: You need a Special Ticket for the Main Event!");
                // Optionally redirect them to the Store portal
            }
        });
    }

    // Stakes Portals
    const tablePortal = document.querySelector('#portal-tables');
    if (tablePortal) {
        tablePortal.addEventListener('click', () => {
            // Logic to open a UI menu for Low, Med, High selection
            console.log("Opening Stakes Selector...");
        });
    }
}

// --- BLUE DAILY GIVEAWAY LOGIC ---
function checkDailyStatus() {
    // Look for the blue giveaway interaction point in the Lobby
    const giveawayZone = document.querySelector('#blue-chip-logic');
    
    // logic for awarding blue chips
    window.claimDailyChips = function() {
        if (!playerState.dailyClaimed) {
            playerState.chips += 500; // Award chips
            playerState.dailyClaimed = true;
            updateUI("You received 500 Blue Chips!");
            // Visual feedback: Change giveaway color to grey/inactive
        } else {
            updateUI("Already claimed! Come back tomorrow.");
        }
    };
}

// --- TICKET SYSTEM ---
function awardSpecialTicket() {
    playerState.hasTournamentTicket = true;
    console.log("Special Ticket Added to Inventory.");
    updateUI("Ticket Earned! Tournament Portal Unlocked.");
}

// --- UTILITIES ---
function teleportToRoom(roomName) {
    const rig = document.querySelector('#rig');
    playerState.currentRoom = roomName;
    
    if(roomName === 'MainEvent') {
        rig.setAttribute('position', '100 1.6 100'); // Send to isolated event room
    }
    // Fade effect logic can be added here
}

function updateUI(message) {
    // If you have a VR HUD, update text here
    console.log("HUD Update:", message);
}

// --- PLAYER DATA ---
const playerState = {
    chips: 1000,
    hasTournamentTicket: false,
    dailyClaimed: false
};

// --- INITIALIZE ---
window.addEventListener('load', () => {
    const sceneEl = document.querySelector('a-scene');
    
    if (sceneEl.hasLoaded) {
        initLogic();
    } else {
        sceneEl.addEventListener('loaded', initLogic);
    }
});

function initLogic() {
    console.log("Logic System Active.");
    setupPortals();
    
    // Add the Blue Daily Giveaway to the Lobby automatically
    createDailyGiveawayStation();
}

function setupPortals() {
    // Tournament Logic
    document.querySelector('#portal-tournament').addEventListener('click', () => {
        if (playerState.hasTournamentTicket) {
            console.log("Entering Tournament...");
            // Teleport logic here
        } else {
            alert("Special Ticket Required! Visit the Store.");
        }
    });

    // Store Logic
    document.querySelector('#portal-store').addEventListener('click', () => {
        console.log("Opening Store UI...");
    });
}

function createDailyGiveawayStation() {
    const lobby = document.querySelector('#lobby');
    const station = document.createElement('a-box');
    station.setAttribute('position', '-4 1 -4');
    station.setAttribute('color', 'blue');
    station.setAttribute('class', 'interactable');
    station.innerHTML = '<a-text value="DAILY CHIPS" align="center" position="0 0.6 0" scale="0.5 0.5 0.5"></a-text>';
    
    station.addEventListener('click', () => {
        if(!playerState.dailyClaimed) {
            playerState.chips += 500;
            playerState.dailyClaimed = true;
            console.log("500 Blue Chips Added! Total: " + playerState.chips);
        }
    });
    
    lobby.appendChild(station);
}

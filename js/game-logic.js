// --- Poker Game Logic Update 1.3 ---

const gameState = {
    isPlayerSeated: false,
    pot: 0,
    deck: [],
    playerHand: [],
    communityCards: [],
    winningMessage: ""
};

// 1. Oculus Control Mapping
document.addEventListener('DOMContentLoaded', () => {
    const rig = document.querySelector('#rig');
    const playTrigger = document.querySelector('#play-trigger');
    const winDisplay = document.querySelector('#win-display');
    const winText = document.querySelector('#win-text');

    // Check for "Play Game" proximity
    setInterval(() => {
        const playerPos = rig.getAttribute('position');
        const triggerPos = playTrigger.getAttribute('position');
        
        const dist = Math.sqrt(
            Math.pow(playerPos.x - triggerPos.x, 2) + 
            Math.pow(playerPos.z - triggerPos.z, 2)
        );

        if (dist < 1 && !gameState.isPlayerSeated) {
            sitDownAndStart();
        }
    }, 500);

    function sitDownAndStart() {
        gameState.isPlayerSeated = true;
        // Snap player to table position
        rig.setAttribute('position', '0 0 -2.5');
        console.log("Player seated. Dealing cards...");
        dealInitialHand();
    }

    // 2. Win Display Logic (10 Second Rule)
    window.displayWinner = function(winnerName, handDescription) {
        winText.setAttribute('value', `${winnerName} WINS!\n${handDescription}`);
        winDisplay.setAttribute('scale', '1 1 1'); // Make visible
        
        // Highlight logic (Visual change to player position)
        // In 1.4 this will trigger a shader glow
        
        setTimeout(() => {
            winDisplay.setAttribute('scale', '0 0 0'); // Hide after 10 seconds
        }, 10000);
    };

    // 3. Controller Input Handlers
    const rightHand = document.querySelector('#rightHand');
    rightHand.addEventListener('abuttondown', () => {
        console.log("A Button Pressed: Call/Check");
    });
    
    rightHand.addEventListener('bbuttondown', () => {
        console.log("B Button Pressed: Fold");
    });
});

function dealInitialHand() {
    // Basic logic for Update 1.3
    gameState.playerHand = ["As", "Ks"]; // Example: Ace/King of Spades
    console.log("Hand Dealt: ", gameState.playerHand);
}

// Module for Hand Evaluation (to be expanded)
const PokerEngine = {
    evaluate: (hand, community) => {
        // Logic for identifying winning hands
        return "Royal Flush"; 
    }
};

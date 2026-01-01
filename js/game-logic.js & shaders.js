// game-logic.js excerpt
window.gameEngine = {
    dealHand: function() {
        // Logic for low-poly card generation
        console.log("Hand Dealt");
    },
    showWinner: function(playerName, handName) {
        // 10 Second Win Notification per instructions
        const winText = document.createElement('a-entity');
        winText.setAttribute('text', {
            value: playerName + " WINS WITH " + handName,
            align: 'center',
            color: '#FFD700'
        });
        winText.setAttribute('position', '0 2 -2');
        document.querySelector('a-scene').appendChild(winText);
        
        // Highlight player logic
        setTimeout(() => { winText.remove(); }, 10000);
    }
};

// Daily Pick Logic
AFRAME.registerComponent('daily-pick-logic', {
    init: function() {
        this.el.addEventListener('click', () => {
            let winAmount = Math.floor(Math.random() * 10) * 500 + 500;
            console.log("You won: $" + winAmount);
        });
    }
});

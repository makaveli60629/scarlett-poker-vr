window.pokerLogic = {
    startDeal: function() {
        console.log("Dealing low-poly cards...");
    },
    showWinner: function(playerEl, handType) {
        // Highlight the player
        playerEl.setAttribute('material', 'emissive: #00FF00; emissiveIntensity: 0.8');

        // Create the 10-second pop-up
        let winNotice = document.createElement('a-entity');
        winNotice.setAttribute('text', {
            value: "WINNER: " + handType,
            align: 'center',
            width: 5,
            color: '#FFD700'
        });
        winNotice.setAttribute('position', '0 2.5 -2');
        document.querySelector('a-scene').appendChild(winNotice);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            winNotice.remove();
            playerEl.setAttribute('material', 'emissiveIntensity: 0');
        }, 10000);
    }
};

AFRAME.registerComponent('daily-pick-logic', {
    init: function() {
        this.el.addEventListener('click', () => {
            let win = Math.floor(Math.random() * 4501) + 500;
            alert("Reward: $" + win);
        });
    }
});

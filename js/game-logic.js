window.pokerLogic = {
    startDeal: function() {
        // Logic for Update 1.3 low-poly cards
        console.log("Cards Dealt to Player");
    },
    triggerWin: function(winnerID, handDescription) {
        // Winning player highlight logic
        const winner = document.querySelector(winnerID);
        winner.setAttribute('material', 'emissive: #00FF00; emissiveIntensity: 0.5');

        // 10 Second Pop-up UI
        const potLabel = document.createElement('a-entity');
        potLabel.setAttribute('geometry', 'primitive: plane; width: 3; height: 1');
        potLabel.setAttribute('material', 'color: black; opacity: 0.8');
        potLabel.setAttribute('text', {
            value: "WINNER: " + handDescription,
            align: 'center',
            width: 6,
            color: '#00FF00'
        });
        potLabel.setAttribute('position', '0 2.5 -3');
        document.querySelector('a-scene').appendChild(potLabel);

        // Remove after 10 seconds exactly
        setTimeout(() => {
            potLabel.remove();
            winner.setAttribute('material', 'emissiveIntensity: 0');
        }, 10000);
    }
};

AFRAME.registerComponent('daily-pick-logic', {
    init: function() {
        this.el.addEventListener('click', () => {
            let rewards = [500, 1000, 2500, 5000];
            let win = rewards[Math.floor(Math.random() * rewards.length)];
            alert("Daily Reward: $" + win + " added to chips!");
        });
    }
});

/** * index.js - The Logic & Interactions
 */
AFRAME.registerComponent('poker-logic', {
    init: function () {
        // Winner Display Logic
        this.winnerUI = document.createElement('a-entity');
        this.winnerUI.setAttribute('position', '0 3 -5.7');
        this.winnerUI.setAttribute('text', {align: 'center', width: 6, color: '#39FF14'});
        this.el.sceneEl.appendChild(this.winnerUI);
    },

    announceWinner: function(msg) {
        this.winnerUI.setAttribute('text', 'value', msg);
        setTimeout(() => {
            this.winnerUI.setAttribute('text', 'value', '');
        }, 10000); // 10 Second Rule
    }
});

// Initializing the "Brain"
document.addEventListener('DOMContentLoaded', () => {
    const rig = document.querySelector('#rig');
    const scene = document.querySelector('a-scene');
    scene.setAttribute('poker-logic', '');

    // Setup Interaction for Sitting
    scene.addEventListener('navigation-start', (e) => {
        if (e.target.id === 'poker-sit-trigger') {
            rig.setAttribute('position', '0 0 -0.8');
            scene.components['poker-logic'].announceWinner('YOU WON THE HAND!');
        }
    });

    // Daily Grab interaction
    document.addEventListener('click', (e) => {
        if (e.target.id === 'daily-grab-box') {
            e.target.setAttribute('color', '#444');
            console.log("Chips Claimed!");
        }
    });
});

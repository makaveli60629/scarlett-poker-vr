/** * Poker VR Update 1.3 Core Logic
 * Handles: Hand Menus, Auto-Sitting, and Winner Displays
 */

AFRAME.registerComponent('play-game-logic', {
    init: function () {
        this.el.addEventListener('navigation-start', () => {
            console.log("Sitting down at table...");
            // Lock player into position
            const rig = document.querySelector('#rig');
            rig.setAttribute('movement-controls', 'enabled: false');
            rig.setAttribute('position', '0 0 -1.2');
            
            // Trigger UI
            this.showWinner("SYSTEM", "READY TO DEAL");
        });
    },

    showWinner: function(name, hand) {
        // Winner UI Logic (10 second rule)
        let ui = document.querySelector('#winner-ui');
        if (!ui) {
            ui = document.createElement('a-entity');
            ui.setAttribute('id', 'winner-ui');
            ui.setAttribute('position', '0 2 -3.5');
            document.querySelector('a-scene').appendChild(ui);
        }
        ui.setAttribute('text', {
            value: `${name} WINS WITH ${hand}`,
            align: 'center',
            width: 4,
            color: '#FFD700'
        });

        setTimeout(() => {
            ui.setAttribute('text', 'value: ');
        }, 10000);
    }
});

// Hand Menu Interaction Logic
document.addEventListener('DOMContentLoaded', () => {
    const btnLobby = document.querySelector('#btn-lobby');
    const btnStore = document.querySelector('#btn-store');
    const rig = document.querySelector('#rig');

    if(btnLobby) {
        btnLobby.addEventListener('click', () => {
            rig.setAttribute('position', '0 0 10');
        });
    }

    if(btnStore) {
        btnStore.addEventListener('click', () => {
            rig.setAttribute('position', '-10 0 0');
        });
    }
});

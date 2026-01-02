<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VR Poker - Update 1.3 (Logic Complete)</title>
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/aframe-blink-controls/dist/aframe-blink-controls.min.js"></script>
    
    <script>
        // --- GAME LOGIC MODULE ---
        AFRAME.registerComponent('poker-logic', {
            init: function () {
                this.isSeated = false;
                this.winDisplay = document.querySelector('#win-display');
                this.playerEl = document.querySelector('#player');
                
                // Set Spawn Point: Clear of all tables/objects
                this.playerEl.setAttribute('position', {x: 0, y: 0, z: 5}); 
                console.log("Spawn point set: Clear of tables.");
            },

            // Triggered when entering "Play Game" zone
            sitPlayer: function() {
                if (!this.isSeated) {
                    this.isSeated = true;
                    // Move player to table seat
                    this.playerEl.setAttribute('position', {x: 0, y: 0.6, z: -1.5});
                    this.displayWin("YOU ARE SEATED - DEALING CARDS...");
                    this.dealCards();
                }
            },

            dealCards: function() {
                console.log("Logic: Dealing cards from assets/textures/...");
                // Add card logic here
            },

            displayWin: function(message) {
                const textEl = this.winDisplay;
                textEl.setAttribute('value', message);
                textEl.setAttribute('visible', true);
                
                // Highlight Player (Simulated via light/scale)
                this.playerEl.setAttribute('animation', "property: scale; to: 1.1 1.1 1.1; dur: 500; loop: 2");

                // Hide after 10 seconds exactly per requirements
                setTimeout(() => {
                    textEl.setAttribute('visible', false);
                }, 10000);
            }
        });

        // Trigger Component for Seating
        AFRAME.registerComponent('play-zone', {
            init: function() {
                this.el.addEventListener('click', () => {
                    document.querySelector('[poker-logic]').components['poker-logic'].sitPlayer();
                });
            }
        });
    </script>
</head>
<body>
    <a-scene poker-logic renderer="antialias: true; colorManagement: true;">
        
        <a-assets>
            <img id="table-tex" src="assets/textures/table_felt.jpg">
            <img id="floor-tex" src="assets/textures/floor_wood.jpg">
        </a-assets>

        <a-entity id="player" position="0 0 5">
            <a-camera look-controls wasd-controls="enabled: false"></a-camera>
            <a-entity id="leftHand" hand-tracking-controls="hand: left;"></a-entity>
            <a-entity id="rightHand" hand-tracking-controls="hand: right;"></a-entity>
        </a-entity>

        <a-text id="win-display" 
                value="" 
                position="0 2 -3" 
                align="center" 
                color="#FFD700" 
                scale="2 2 2" 
                visible="false"></a-text>

        <a-sky color="#111"></a-sky>
        <a-plane position="0 0 0" rotation="-90 0 0" width="20" height="20" src="#floor-tex"></a-plane>

        <a-entity id="poker-table" position="0 0.7 -2">
            <a-cylinder radius="1.5" height="0.1" src="#table-tex"></a-cylinder>
            <a-box id="sit-trigger" 
                   play-zone
                   position="0 0.5 1" 
                   width="1" height="0.5" depth="0.5" 
                   color="#4CAF50" 
                   opacity="0.6">
                <a-text value="WALK HERE TO PLAY" align="center" position="0 0.6 0" scale="0.5 0.5 0.5"></a-text>
            </a-box>
        </a-entity>

        <a-box position="-5 1 -2" width="2" height="2" depth="0.5" color="#333">
            <a-text value="STORE" align="center" position="0 1.2 0.3"></a-text>
        </a-box>

    </a-scene>
</body>
</html>

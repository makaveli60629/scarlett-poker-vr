<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VR Poker - Update 1.4 (Interactive Store & Textures)</title>
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    
    <script>
        AFRAME.registerShader('poker-felt-shader', {
            schema: { color: {type: 'color', is: 'uniform', default: '#076324'} },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform vec3 color;
                float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                void main() {
                    float n = noise(vUv * 500.0);
                    gl_FragColor = vec4(color + (n * 0.05), 1.0);
                }
            `
        });

        // --- GAME & STORE LOGIC ---
        AFRAME.registerComponent('poker-logic', {
            init: function () {
                this.isSeated = false;
                this.balance = 1000;
                this.winDisplay = document.querySelector('#win-display');
                this.playerEl = document.querySelector('#player');
                
                // Permanent Spawn: Clear of tables and store counters
                this.playerEl.setAttribute('position', {x: 0, y: 0, z: 5}); 
            },

            sitPlayer: function() {
                if (!this.isSeated) {
                    this.isSeated = true;
                    this.playerEl.setAttribute('position', {x: 0, y: 0.6, z: -1.5});
                    this.dealCards();
                }
            },

            dealCards: function() {
                console.log("Assets: Mapping card textures from assets/textures/...");
                // Animation logic for dealing cards would go here
            },

            buyChips: function(amount) {
                this.balance += amount;
                this.displayWin("PURCHASE SUCCESS", `NEW BALANCE: $${this.balance}`);
                console.log("Store: Chips purchased via Hand Interaction.");
            },

            displayWin: function(winnerName, handName) {
                const textEl = this.winDisplay;
                textEl.setAttribute('value', `${winnerName}\n${handName}`);
                textEl.setAttribute('visible', true);
                
                // Highlight winning player (Pulse effect)
                this.playerEl.setAttribute('animation', "property: scale; to: 1.05 1.05 1.05; dur: 300; loop: 4; dir: alternate");

                setTimeout(() => { textEl.setAttribute('visible', false); }, 10000);
            }
        });

        // Store Interaction Component
        AFRAME.registerComponent('chip-purchase', {
            schema: { amount: {type: 'number', default: 100} },
            init: function() {
                this.el.addEventListener('click', () => {
                    const logic = document.querySelector('[poker-logic]').components['poker-logic'];
                    logic.buyChips(this.data.amount);
                });
            }
        });

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
            <img id="card-back" src="assets/textures/card_back_red.jpg">
            <img id="chip-tex" src="assets/textures/poker_chip_diffuse.jpg">
            <img id="floor-tex" src="assets/textures/floor_wood.jpg">
            <img id="store-counter-tex" src="assets/textures/marble.jpg">
            <img id="sky-tex" src="assets/textures/casino_sky.jpg">
        </a-assets>

        <a-entity id="player" position="0 0 5">
            <a-camera look-controls></a-camera>
            <a-entity id="leftHand" hand-tracking-controls="hand: left;"></a-entity>
            <a-entity id="rightHand" hand-tracking-controls="hand: right;"></a-entity>
        </a-entity>

        <a-text id="win-display" value="" position="0 2.2 -3" align="center" color="#FFD700" scale="1.5 1.5 1.5" visible="false"></a-text>

        <a-sky src="#sky-tex"></a-sky>
        <a-plane position="0 0 0" rotation="-90 0 0" width="30" height="30" src="#floor-tex" repeat="10 10"></a-plane>

        <a-entity id="poker-table" position="0 0.7 -2">
            <a-cylinder radius="1.5" height="0.1" material="shader: poker-felt-shader; color: #076324;"></a-cylinder>
            
            <a-box id="sit-trigger" play-zone position="0 0.5 1.2" width="0.8" height="0.2" depth="0.4" color="#FFD700" opacity="0.8">
                <a-text value="SIT TO PLAY" align="center" position="0 0.3 0" scale="0.4 0.4 0.4" color="black"></a-text>
            </a-box>
        </a-entity>

        <a-entity id="store-area" position="-6 0 -2" rotation="0 45 0">
            <a-box position="0 0.7 0" width="3" height="1.4" depth="1" src="#store-counter-tex"></a-box>
            <a-text value="CHIP STORE" position="0 1.6 0" align="center" scale="1.5 1.5 1.5"></a-text>

            <a-entity id="stack-100" chip-purchase="amount: 100" position="-0.5 1.5 0">
                <a-cylinder radius="0.1" height="0.2" src="#chip-tex"></a-cylinder>
                <a-text value="BUY $100" position="0 0.25 0" align="center" scale="0.3 0.3 0.3"></a-text>
            </a-entity>

            <a-entity id="stack-500" chip-purchase="amount: 500" position="0.5 1.5 0">
                <a-cylinder radius="0.1" height="0.4" src="#chip-tex" color="#cc0000"></a-cylinder>
                <a-text value="BUY $500" position="0 0.35 0" align="center" scale="0.3 0.3 0.3"></a-text>
            </a-entity>
        </a-entity>

    </a-scene>
</body>
</html>

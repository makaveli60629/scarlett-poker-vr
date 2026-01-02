<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VR Poker - RECOVERY BOOT</title>
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    
    <script>
        // --- EMERGENCY FIX LOGIC ---
        AFRAME.registerComponent('poker-logic', {
            init: function () {
                this.isSeated = false;
                this.playerEl = document.querySelector('#player');
                
                // Force Spawn to safe location
                this.playerEl.setAttribute('position', "0 0 5"); 
                console.log("Emergency Boot: Player positioned at 0 0 5");
            },

            sitPlayer: function() {
                if (!this.isSeated) {
                    this.isSeated = true;
                    this.playerEl.setAttribute('position', "0 0.6 -1.5");
                    this.displayWin("SEATED");
                }
            },

            displayWin: function(msg) {
                const textEl = document.querySelector('#win-display');
                textEl.setAttribute('value', msg);
                textEl.setAttribute('visible', true);
                setTimeout(() => { textEl.setAttribute('visible', false); }, 10000);
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
        
        <a-assets timeout="3000">
            <img id="floor-tex" src="assets/textures/floor_wood.jpg">
        </a-assets>

        <a-entity id="player" position="0 0 5">
            <a-camera id="cam" look-controls wasd-controls="enabled: true">
                <a-cursor color="red"></a-cursor>
            </a-camera>
            <a-entity id="leftHand" hand-tracking-controls="hand: left;"></a-entity>
            <a-entity id="rightHand" hand-tracking-controls="hand: right;"></a-entity>
        </a-entity>

        <a-text id="win-display" value="" position="0 2.2 -3" align="center" color="#FFD700" scale="1.5 1.5 1.5" visible="false"></a-text>

        <a-sky color="#222"></a-sky> <a-plane position="0 0 0" rotation="-90 0 0" width="30" height="30" color="#333" src="#floor-tex"></a-plane>
        <a-light type="ambient" color="#FFF"></a-light>
        <a-light type="directional" position="-1 2 1" intensity="0.8"></a-light>

        <a-entity id="poker-table" position="0 0.7 -2">
            <a-cylinder radius="1.5" height="0.1" color="#076324"></a-cylinder>
            
            <a-box id="sit-trigger" play-zone position="0 0.5 1.2" width="0.8" height="0.2" depth="0.4" color="#FFD700">
                <a-text value="SIT TO PLAY" align="center" position="0 0.3 0" scale="0.4 0.4 0.4" color="black"></a-text>
            </a-box>
        </a-entity>

        <a-entity id="store-area" position="-6 0 -2" rotation="0 45 0">
            <a-box position="0 0.7 0" width="3" height="1.4" depth="1" color="#444"></a-box>
            <a-text value="STORE" position="0 1.6 0" align="center"></a-text>
        </a-entity>

    </a-scene>
</body>
</html>

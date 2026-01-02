<!DOCTYPE html>
<html>
  <head>
    <title>Poker VR - Scorpion Plan Master</title>
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v6.1.1/dist/aframe-extras.min.js"></script>
    <script src="https://unpkg.com/aframe-event-set-component@5.0.0/dist/aframe-event-set-component.min.js"></script>
  </head>
  <body>
    <a-scene renderer="antialias: true; colorManagement: true; exposure: 1.2;">
      
      <a-assets>
        <img id="brick-wall" src="assets/textures/brick_diffuse.jpg">
        <img id="table-felt" src="assets/textures/table_brand.jpg">
        <img id="brand-logo" src="logo.jpg">
        
        <a-mixin id="neon-blue" material="color: #00FFFF; emissive: #00FFFF; emissiveIntensity: 4; shader: flat"></a-mixin>
        <a-mixin id="pillar" geometry="primitive: box; width: 0.6; height: 6; depth: 0.6" material="color: #111"></a-mixin>
        <a-mixin id="checkpoint-disk" geometry="primitive: cylinder; radius: 0.6; height: 0.05" material="color: #39FF14; emissive: #39FF14; opacity: 0.8"></a-mixin>
      </a-assets>

      <a-sky color="#0a0a0a"></a-sky>
      <a-light type="ambient" color="#FFF" intensity="1.2"></a-light>
      <a-light type="point" position="0 5 -2" intensity="1.5" distance="50"></a-light>
      <a-light type="directional" color="#00FFFF" intensity="0.5" position="1 1 1"></a-light>

      <a-entity id="rig" 
                movement-controls="controls: checkpoint, keyboard, touchpad; speed: 0.2" 
                checkpoint-controls="mode: animate" 
                position="0 0 8">
        <a-camera id="camera" look-controls position="0 1.6 0">
            <a-cursor color="red" raycaster="objects: .collidable"></a-cursor>
        </a-camera>
        
        <a-entity id="leftHand" hand-tracking-controls="hand: left; modelStyle: mesh;">
            <a-entity id="hand-menu" position="0.08 0.12 0" rotation="-90 0 0">
                <a-plane width="0.35" height="0.45" color="#111" opacity="0.9" class="collidable">
                    <a-text value="SCORPION NAV" align="center" position="0 0.18 0.01" scale="0.12 0.12 0.12" color="#00FFFF"></a-text>
                    <a-box id="btn-lobby" class="collidable" position="0 0.08 0.02" width="0.25" height="0.06" color="#333">
                        <a-text value="LOBBY" align="center" scale="0.1 0.1 0.1"></a-text>
                    </a-box>
                    <a-box id="btn-table" class="collidable" position="0 -0.02 0.02" width="0.25" height="0.06" color="#333">
                        <a-text value="POKER TABLE" align="center" scale="0.1 0.1 0.1"></a-text>
                    </a-box>
                    <a-box id="btn-store" class="collidable" position="0 -0.12 0.02" width="0.25" height="0.06" color="#333">
                        <a-text value="THE STORE" align="center" scale="0.1 0.1 0.1"></a-text>
                    </a-box>
                </a-plane>
            </a-entity>
        </a-entity>
        <a-entity id="rightHand" hand-tracking-controls="hand: right; modelStyle: mesh;"></a-entity>
      </a-entity>

      <a-entity id="scorpion-world">
          
          <a-box position="0 3 -6" width="14" height="6" depth="0.2" material="src: #brick-wall; repeat: 4 2">
              <a-plane src="#brand-logo" position="0 0.5 0.12" width="4" height="2" transparent="true"></a-plane>
          </a-box>
          <a-box position="0 3 15" width="14" height="6" depth="0.2" material="src: #brick-wall; repeat: 4 2"></a-box>
          <a-box position="-7 3 4.5" rotation="0 90 0" width="21" height="6" depth="0.2" material="src: #brick-wall; repeat: 6 2"></a-box>
          <a-box position="7 3 4.5" rotation="0 -90 0" width="21" height="6" depth="0.2" material="src: #brick-wall; repeat: 6 2"></a-box>
          
          <a-plane rotation="-90 0 0" width="14" height="21" position="0 0.01 4.5" color="#111"></a-plane>

          <a-entity mixin="pillar" position="-6.7 3 -5.7"></a-entity>
          <a-entity mixin="pillar" position="6.7 3 -5.7"></a-entity>
          <a-entity mixin="pillar" position="-6.7 3 14.7"></a-entity>
          <a-entity mixin="pillar" position="6.7 3 14.7"></a-entity>

          <a-box mixin="neon-blue" position="0 0.05 -5.9" width="14" height="0.05" depth="0.05"></a-box>
          <a-box mixin="neon-blue" position="0 5.95 -5.9" width="14" height="0.05" depth="0.05"></a-box>
          <a-box mixin="neon-blue" position="-6.9 3 -5.9" rotation="90 0 0" width="0.05" height="6" depth="0.05"></a-box>
          <a-box mixin="neon-blue" position="6.9 3 -5.9" rotation="90 0 0" width="0.05" height="6" depth="0.05"></a-box>

          <a-entity id="poker-core" position="0 0 -2">
              <a-cylinder radius="2.2" height="0.1" material="src: #table-felt"></a-cylinder>
              <a-plane id="leaderboard" position="0 3.2 -0.5" width="3" height="1.5" color="#000" opacity="0.85" class="collidable">
                  <a-text value="LEADERBOARD\n1. PLAYER_1: $5400\n2. DEALER: $2100" align="center" color="#00FFFF" scale="0.8 0.8 0.8"></a-text>
              </a-plane>
              <a-entity id="sit-trigger" class="collidable" mixin="checkpoint-disk" position="0 0.01 1.8">
                  <a-text value="SIT HERE" rotation="-90 0 0" position="0 0.1 0" align="center" scale="0.4 0.4 0.4"></a-text>
              </a-entity>
          </a-entity>

          <a-entity id="lobby-core" position="0 0 10">
              <a-text value="LOBBY" position="0 3.5 -2" align="center" scale="2.5 2.5 2.5"></a-text>
              <a-box id="daily-grab-box" class="collidable" position="-4 0.8 -1" width="1" height="1" color="#FFD700" 
                     animation="property: rotation; to: 0 360 0; loop: true; dur: 4000; easing: linear">
                  <a-text value="DAILY GRAB" align="center" position="0 0.7 0" scale="0.6 0.6 0.6" color="#000"></a-text>
              </a-box>
              <a-entity id="lobby-trigger" class="collidable" mixin="checkpoint-disk" position="0 0.01 0"></a-entity>
          </a-entity>

          <a-entity id="store-core" position="-5 0 3" rotation="0 90 0">
              <a-text value="THE STORE" position="0 3.5 -1" align="center" scale="2 2 2"></a-text>
              <a-entity id="store-trigger" class="collidable" mixin="checkpoint-disk" position="0 0.01 0"></a-entity>
          </a-entity>
      </a-entity>

      <a-entity id="winner-ui" position="0 2.5 -5.8" text="value: ; align: center; width: 8; color: #39FF14; font: monoid;"></a-entity>

    </a-scene>

    <script>
      /** * LOGIC ENGINE: SCORPION PLAN */
      const rig = document.querySelector('#rig');
      const winUI = document.querySelector('#winner-ui');

      // 1. Navigation & Winning Hand Logic
      document.addEventListener('navigation-start', (e) => {
        const id = e.target.id;
        if (id === 'sit-trigger') {
          rig.setAttribute('position', '0 0 -0.8');
          // Winner Display (10 Seconds)
          winUI.setAttribute('text', 'value', 'WINNER: YOU\nHIGHEST CARD: ACE');
          setTimeout(() => { winUI.setAttribute('text', 'value', ''); }, 10000);
        }
      });

      // 2. Menu Button Interactions
      document.addEventListener('click', (e) => {
        const id = e.target.id;
        if (id === 'btn-lobby') rig.setAttribute('position', '0 0 10');
        if (id === 'btn-table') rig.setAttribute('position', '0 0 1.5');
        if (id === 'btn-store') rig.setAttribute('position', '-5 0 3');
        
        // 3. Daily Grab Logic
        if (id === 'daily-grab-box') {
          e.target.setAttribute('animation', 'property: scale; to: 0 0 0; dur: 500');
          setTimeout(() => { e.target.setAttribute('visible', 'false'); }, 500);
        }
      });
    </script>
  </body>
</html>

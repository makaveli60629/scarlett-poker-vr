<!DOCTYPE html>
<html>
  <head>
    <title>Poker VR - Permanent Stable 1.3</title>
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
        
        <a-mixin id="neon-blue" material="color: #00FFFF; emissive: #00FFFF; emissiveIntensity: 3; shader: flat"></a-mixin>
        <a-mixin id="pillar" geometry="primitive: box; width: 0.6; height: 5; depth: 0.6" material="color: #111"></a-mixin>
        <a-mixin id="checkpoint-disk" geometry="primitive: cylinder; radius: 0.6; height: 0.05" material="color: #39FF14; emissive: #39FF14; opacity: 0.8"></a-mixin>
      </a-assets>

      <a-sky color="#050505"></a-sky>
      <a-light type="ambient" color="#FFF" intensity="1.5"></a-light>
      <a-light type="directional" color="#FFF" intensity="1" position="-1 4 2"></a-light>
      <a-light type="point" position="0 4 -2" intensity="1" distance="50"></a-light>

      <a-entity id="rig" movement-controls="controls: checkpoint" checkpoint-controls="mode: animate" position="0 0 8">
        <a-camera id="camera" look-controls position="0 1.6 0">
            <a-cursor color="red" fuse="false" raycaster="objects: .collidable"></a-cursor>
        </a-camera>
        
        <a-entity id="leftHand" hand-tracking-controls="hand: left; modelStyle: mesh;">
            <a-entity id="hand-menu" position="0.1 0.1 0" rotation="-90 0 0">
                <a-plane width="0.4" height="0.5" color="#111" opacity="0.9" class="collidable">
                    <a-text value="MENU" align="center" position="0 0.2 0.01" scale="0.15 0.15 0.15"></a-text>
                    <a-box id="btn-lobby" class="collidable" position="0 0.08 0.02" width="0.3" height="0.08" color="#444"><a-text value="LOBBY" align="center" scale="0.1 0.1 0.1"></a-text></a-box>
                    <a-box id="btn-table" class="collidable" position="0 -0.02 0.02" width="0.3" height="0.08" color="#444"><a-text value="POKER" align="center" scale="0.1 0.1 0.1"></a-text></a-box>
                    <a-box id="btn-store" class="collidable" position="0 -0.12 0.02" width="0.3" height="0.08" color="#444"><a-text value="STORE" align="center" scale="0.1 0.1 0.1"></a-text></a-box>
                </a-plane>
            </a-entity>
        </a-entity>
        <a-entity id="rightHand" hand-tracking-controls="hand: right; modelStyle: mesh;"></a-entity>
      </a-entity>

      <a-entity id="world-container">
          
          <a-box position="0 2.5 -6" width="12" height="5" depth="0.2" material="src: #brick-wall; repeat: 4 2">
              <a-plane src="#brand-logo" position="0 0 0.15" width="4" height="2" transparent="true"></a-plane>
          </a-box>
          <a-box position="0 2.5 15" width="12" height="5" depth="0.2" material="src: #brick-wall; repeat: 4 2"></a-box>
          <a-box position="-6 2.5 4.5" rotation="0 90 0" width="21" height="5" depth="0.2" material="src: #brick-wall; repeat: 8 2"></a-box>
          <a-box position="6 2.5 4.5" rotation="0 -90 0" width="21" height="5" depth="0.2" material="src: #brick-wall; repeat: 8 2"></a-box>
          <a-plane rotation="-90 0 0" width="12" height="21" position="0 0 4.5" color="#1a1a1a"></a-plane>
          <a-plane rotation="90 0 0" position="0 5 4.5" width="12" height="21" color="#111"></a-plane>

          <a-entity mixin="pillar" position="-5.7 2.5 -5.7"></a-entity>
          <a-entity mixin="pillar" position="5.7 2.5 -5.7"></a-entity>
          <a-entity mixin="pillar" position="-5.7 2.5 14.7"></a-entity>
          <a-entity mixin="pillar" position="5.7 2.5 14.7"></a-entity>

          <a-box mixin="neon-blue" position="0 0.05 -5.9" width="12" height="0.05" depth="0.05"></a-box>
          <a-box mixin="neon-blue" position="0 4.95 -5.9" width="12" height="0.05" depth="0.05"></a-box>
          <a-box mixin="neon-blue" position="0 0.05 14.9" width="12" height="0.05" depth="0.05"></a-box>

          <a-entity id="poker-area" position="0 0 -2">
              <a-cylinder radius="2" height="0.1" material="src: #table-felt"></a-cylinder>
              <a-plane position="0 2.8 0" width="2.5" height="1" color="black" opacity="0.8">
                  <a-text id="scoreboard-text" value="STAKES: 10/20\nPOT: $0" align="center" color="#00FFFF"></a-text>
              </a-plane>
              <a-entity id="sit-trigger" class="collidable" mixin="checkpoint-disk" position="0 0.01 1.5"></a-entity>
          </a-entity>

          <a-entity id="lobby-zone" position="0 0 10">
              <a-text value="LOBBY" position="0 3 -2" align="center" scale="2 2 2"></a-text>
              <a-box id="daily-grab-box" class="collidable" position="-3 0.6 -1" width="0.8" height="0.8" color="#FFD700" 
                     animation="property: rotation; to: 0 360 0; loop: true; dur: 5000; easing: linear">
                  <a-text value="DAILY GRAB" align="center" position="0 0.6 0" scale="0.5 0.5 0.5"></a-text>
              </a-box>
              <a-entity id="lobby-trigger" class="collidable" mixin="checkpoint-disk" position="0 0.01 0"></a-entity>
          </a-entity>

          <a-entity id="store-zone" position="-4.5 0 3" rotation="0 90 0">
              <a-text value="STORE" position="0 3 -1" align="center" scale="1.5 1.5 1.5"></a-text>
              <a-entity id="store-trigger" class="collidable" mixin="checkpoint-disk" position="0 0.01 0"></a-entity>
          </a-entity>
      </a-entity>

      <a-entity id="winner-ui" position="0 3 -5.8" text="value: ; align: center; width: 8; color: #39FF14;"></a-entity>

      <a-entity id="ambient-sound-anchor"></a-entity>
      <a-entity id="ui-sound-anchor"></a-entity>

    </a-scene>

    <script>
      // Interaction & Logic Script
      const rig = document.querySelector('#rig');
      const winUI = document.querySelector('#winner-ui');

      // Teleportation Logic
      document.addEventListener('navigation-start', (e) => {
        const id = e.target.id;
        if (id === 'sit-trigger') {
          rig.setAttribute('position', '0 0 -0.8');
          // Trigger the 10-second win display
          winUI.setAttribute('text', 'value', 'PLAYER 1 WINS THE POT!');
          setTimeout(() => { winUI.setAttribute('text', 'value', ''); }, 10000);
        }
      });

      // Hand Menu & Click Logic
      document.addEventListener('click', (e) => {
        const id = e.target.id;
        if (id === 'btn-lobby') rig.setAttribute('position', '0 0 10');
        if (id === 'btn-table') rig.setAttribute('position', '0 0 1');
        if (id === 'btn-store') rig.setAttribute('position', '-4.5 0 3');
        
        if (id === 'daily-grab-box') {
          alert("Daily Bonus Claimed!");
          e.target.setAttribute('visible', 'false');
        }
      });
    </script>
  </body>
</html>

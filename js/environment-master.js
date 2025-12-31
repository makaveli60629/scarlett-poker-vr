// js/environment-master.js
window.initEnvironment = function() {
    const root = document.querySelector('#world-root');

    // --- LOBBY ROOM ---
    const lobby = document.createElement('a-entity');
    lobby.id = "room-lobby";
    lobby.innerHTML = `
        <a-plane class="nav-mesh" rotation="-90 0 0" width="50" height="50" material="color: #1a1a1a; roughness: 1" shadow="receive: true"></a-plane>
        
        <a-box position="0 2.5 -10" width="20" height="5" depth="0.5" mixin="brick-texture" shadow></a-box>
        <a-box position="-10 2.5 0" rotation="0 90 0" width="20" height="5" depth="0.5" mixin="brick-texture" shadow></a-box>
        <a-box position="10 2.5 0" rotation="0 -90 0" width="20" height="5" depth="0.5" mixin="brick-texture" shadow></a-box>

        <a-entity position="-3 1 -4">
            <a-entity mixin="felt-texture" shadow></a-entity>
            <a-cylinder radius="0.2" height="1" position="0 -0.5 0" color="#222"></a-cylinder>
            <a-text value="DAILY PICK" align="center" position="0 1.2 0" color="cyan" width="4"></a-text>
            <a-cylinder id="blue-chip" class="clickable" position="0 0.1 0" radius="0.2" height="0.08" color="blue" 
                        animation="property: rotation; to: 0 360 0; loop: true; dur: 3000" onclick="window.claimDaily()"></a-cylinder>
        </a-entity>

        <a-entity position="6 1.8 -6">
            <a-text id="wallet-display" value="WALLET: $2500" align="center" color="white" width="6"></a-text>
            <a-light type="point" color="cyan" intensity="0.5" position="0 -0.5 0"></a-light>
            <a-box class="clickable" position="0 -1.3 1" width="2" height="0.1" depth="2" color="green" onclick="window.enterZone()">
                <a-text value="ENTER PLANE TABLES" align="center" position="0 0.1 0" rotation="-90 0 0" width="4"></a-text>
            </a-box>
        </a-entity>
    `;

    // --- POKER ROOM ---
    const pokerRoom = document.createElement('a-entity');
    pokerRoom.id = "room-poker";
    pokerRoom.setAttribute('position', '100 0 0');
    pokerRoom.innerHTML = `
        <a-plane class="nav-mesh" rotation="-90 0 0" width="50" height="50" material="color: #0a0a0a" shadow="receive: true"></a-plane>
        <a-box position="0 2.5 -10" width="20" height="5" depth="0.5" mixin="brick-texture"></a-box>
        
        <a-entity id="main-table" position="0 1 -4">
            <a-entity mixin="felt-texture" shadow></a-entity>
            <a-text value="ELITE POKER" align="center" position="0 0.1 0" rotation="-90 0 0" color="gold" width="6"></a-text>
            
            <a-entity id="win-ui" visible="false" position="0 2 0">
                <a-text id="win-banner" value="" align="center" color="yellow" width="10"></a-text>
            </a-entity>
        </a-entity>

        <a-box class="clickable" position="0 0.5 -1.5" width="1" height="0.1" depth="1" color="green" onclick="window.sitAndPlay()">
            <a-text value="SIT DOWN" align="center" position="0 0.1 0" rotation="-90 0 0"></a-text>
        </a-box>
    `;

    root.appendChild(lobby);
    root.appendChild(pokerRoom);
};

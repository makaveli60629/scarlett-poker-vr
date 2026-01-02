/** * world.js - The Physical Laws & Environment
 */
document.addEventListener('DOMContentLoaded', () => {
    const world = document.querySelector('#game-world');

    // BUILD ROOMS & WALLS
    world.innerHTML = `
        <a-box position="0 2.5 -6" width="12" height="5" depth="0.2" material="src: #brick-wall; repeat: 4 2">
            <a-plane src="#brand-logo" position="0 0 0.12" width="4" height="2" transparent="true"></a-plane>
        </a-box>
        <a-box position="0 2.5 15" width="12" height="5" depth="0.2" material="src: #brick-wall; repeat: 4 2"></a-box>
        
        <a-plane rotation="-90 0 0" width="30" height="30" color="#222"></a-plane>

        <a-box position="-5.9 2.5 -5.9" width="0.6" height="5" depth="0.6" color="#111"></a-box>
        <a-box position="5.9 2.5 -5.9" width="0.6" height="5" depth="0.6" color="#111"></a-box>
        <a-box mixin="neon-blue" position="0 0.1 -5.9" width="12" height="0.05" depth="0.05"></a-box>
        <a-box mixin="neon-blue" position="0 4.9 -5.9" width="12" height="0.05" depth="0.05"></a-box>

        <a-entity position="0 0.8 -2">
            <a-cylinder radius="2" height="0.1" material="src: #table-felt"></a-cylinder>
            <a-entity mixin="checkpoint-disk" position="0 -0.79 1.5" id="poker-sit-trigger"></a-entity>
            <a-plane id="scoreboard" position="0 2.5 0" width="3" height="1.2" color="black" opacity="0.8">
                <a-text value="POT: $0" align="center" color="#00FFFF"></a-text>
            </a-plane>
        </a-entity>

        <a-entity id="lobby-room" position="0 0 12">
            <a-text value="LOBBY" position="0 3 -2" align="center" scale="2 2 2"></a-text>
            <a-box id="daily-grab-box" position="-2 0.5 -1" width="1" height="1" color="#FFD700">
                <a-text value="DAILY GRAB" align="center" position="0 0.6 0" scale="0.5 0.5 0.5"></a-text>
            </a-box>
            <a-entity mixin="checkpoint-disk" position="0 0.01 0" id="lobby-trigger"></a-entity>
        </a-entity>
    `;
});

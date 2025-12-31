// UI and Hologram Logic for 1.2
window.onload = function() {
    const zone1 = document.querySelector('#room-zone-1');
    
    // Create the Floating Wallet Hologram
    let hologram = document.createElement('a-entity');
    hologram.setAttribute('position', '0 3.5 0');
    hologram.setAttribute('look-at', '#rig');
    hologram.innerHTML = `
        <a-text value="PLANE TABLES ZONE" align="center" color="cyan" width="8"></a-text>
        <a-plane width="2.5" height="0.8" position="0 -0.6 0" material="color: black; opacity: 0.6">
            <a-text id="wallet-val" value="WALLET: $3,250" align="center" color="#00ff00" width="6"></a-text>
        </a-plane>
    `;
    zone1.appendChild(hologram);

    // Create the Wrist Watch
    const watchContainer = document.querySelector('#watch-container');
    let watch = document.createElement('a-entity');
    watch.setAttribute('position', '-0.3 -0.2 -0.4');
    watch.innerHTML = `
        <a-box width="0.1" height="0.04" depth="0.08" color="#111">
            <a-sphere id="notif-dot" radius="0.015" position="0 0.02 0" color="green"></a-sphere>
        </a-box>
    `;
    watchContainer.appendChild(watch);
};

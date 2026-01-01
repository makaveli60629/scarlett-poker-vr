import * as THREE from 'three';
import { createBot } from './avatar.js';

export function initPoker(scene, playerRig) {
    const pokerArea = new THREE.Group();
    pokerArea.position.set(25, 0, 0);
    scene.add(pokerArea);

    // Table
    const table = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32), new THREE.MeshStandardMaterial({color: 0x076324}));
    table.position.y = 0.8;
    pokerArea.add(table);

    // Dealer
    const dealer = createBot(pokerArea, 0, -2.8);
    dealer.lookAt(0, 1.6, 0);

    function showWinner(name, hand) {
        const popup = document.getElementById('win-popup');
        document.getElementById('win-player').innerText = name;
        document.getElementById('win-hand').innerText = hand;
        popup.style.display = 'block';
        setTimeout(() => popup.style.display = 'none', 10000);
    }

    return {
        update: () => {
            const dist = playerRig.position.distanceTo(new THREE.Vector3(25, 0, 0));
            if (dist < 3) dealer.lookAt(playerRig.position.x - 25, 1.6, playerRig.position.z);
        },
        triggerWin: (name, hand) => showWinner(name, hand)
    };
}

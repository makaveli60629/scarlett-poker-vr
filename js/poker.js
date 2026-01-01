import * as THREE from 'three';
import { scene, pokerRoom } from './world.js';

const table = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2), new THREE.MeshStandardMaterial({color: 0x076324}));
table.position.set(0, 0.8, 0);
pokerRoom.add(table);

// Sitting Trigger
export function autoSit(playerRig) {
    const dist = playerRig.position.distanceTo(new THREE.Vector3(25, 0, 0));
    if (dist < 3) {
        playerRig.position.set(25, 0, 1.5); // Snap to table
        announceWinner("PLAYER 1", "FULL HOUSE"); // Test 10s popup
    }
}

function announceWinner(name, hand) {
    const ui = document.getElementById('win-tag');
    document.getElementById('winner-name').innerText = name + " WINS!";
    document.getElementById('winner-hand').innerText = hand;
    ui.style.display = 'block';
    setTimeout(() => { ui.style.display = 'none'; }, 10000);
}

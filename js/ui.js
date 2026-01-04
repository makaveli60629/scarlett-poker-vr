import * as THREE from 'three';
import { World } from './world.js';

export const UI = {
    createLeaderboard(scene){
        if(!World.leaderboard) return;
        // Add simple text mesh (placeholder)
        const loader = new THREE.FontLoader();
        loader.load('assets/fonts/helvetiker_regular.typeface.json', font=>{
            const textGeo = new THREE.TextGeometry('Leaderboard\nPlayer1 100\nPlayer2 90', {font:font,size:0.2,height:0.05});
            const textMat = new THREE.MeshBasicMaterial({color:0xffffff});
            const textMesh = new THREE.Mesh(textGeo,textMat);
            textMesh.position.set(-0.9,1.5,0.05);
            World.leaderboard.add(textMesh);
        });
    },

    createStore(scene){
        if(!World.storePanel) return;
        const loader = new THREE.FontLoader();
        loader.load('assets/fonts/helvetiker_regular.typeface.json', font=>{
            const textGeo = new THREE.TextGeometry('Store\nItem1\nItem2', {font:font,size:0.2,height:0.05});
            const textMat = new THREE.MeshBasicMaterial({color:0xffffff});
            const textMesh = new THREE.Mesh(textGeo,textMat);
            textMesh.position.set(-0.9,1.5,0.05);
            World.storePanel.add(textMesh);
        });
    }
};

import * as THREE from 'three';
import { Table } from './table.js';
import { Chair } from './chair.js';

export const World = {
    build(scene) {
        // Ambient + directional lighting
        scene.background = new THREE.Color(0x050508);
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(5, 15, 5);
        scene.add(sun);

        // Floor + walls
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat);
        floor.rotation.x = -Math.PI/2;
        scene.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMat);
        backWall.position.set(0, 5, -25);
        scene.add(backWall);

        // Main table
        Table.createTable(scene, 0, 0);

        // 6 chairs around table
        const chairRadius = 5;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.sin(angle) * chairRadius;
            const z = Math.cos(angle) * chairRadius;
            Chair.loadChair(scene, x, z);
        }

        // 20 extra features
        for(let i=0;i<20;i++){
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),
                new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
            box.position.set(Math.random()*20-10,0.25,Math.random()*20-10);
            scene.add(box);
        }
    }
};

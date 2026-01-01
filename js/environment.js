import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();
        // Go BACK out of 'js' and INTO 'assets/textures'
        const path = '../assets/textures/'; 

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(5, 10, 5);
        scene.add(sun);

        // Brick Walls
        const wallTex = loader.load(`${path}brickwall.jpg`);
        wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(4, 2);
        const room = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.BackSide }));
        scene.add(room);

        // Poker Table
        const tableTex = loader.load(`${path}table_felt_green.jpg`);
        const table = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 32), new THREE.MeshStandardMaterial({ map: tableTex }));
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // Brand Logo
        const logoTex = loader.load(`${path}brand_logo.jpg`);
        const logo = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true }));
        logo.rotation.x = -Math.PI / 2;
        logo.position.set(0, 0.91, -5);
        scene.add(logo);
    }
};

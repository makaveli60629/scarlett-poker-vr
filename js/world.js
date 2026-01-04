import * as THREE from 'three';
import { Table } from './table.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

export const World = {
    textureLoader: new THREE.TextureLoader(),

    build(scene) {
        // Lighting and background
        scene.background = new THREE.Color(0x050508);
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(5, 15, 5);
        scene.add(sun);

        // Floors
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Walls (simple room)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(100, 20), wallMat);
        backWall.position.set(0, 10, -50);
        scene.add(backWall);

        const frontWall = backWall.clone();
        frontWall.position.set(0, 10, 50);
        frontWall.rotation.y = Math.PI;
        scene.add(frontWall);

        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(100, 20), wallMat);
        leftWall.position.set(-50, 10, 0);
        leftWall.rotation.y = Math.PI / 2;
        scene.add(leftWall);

        const rightWall = leftWall.clone();
        rightWall.position.set(50, 10, 0);
        rightWall.rotation.y = -Math.PI / 2;
        scene.add(rightWall);

        // Tables
        Table.createTable(scene, 0, 0); // Oval table in center
        Table.createChairs(scene, 0, 0); // 6 chairs around table

        // Testing Sofa/Chair
        this.loadSofa(scene);

        console.log("World built successfully.");
    },

    generateDefaultTexture(color = 0x888888) {
        const tex = new THREE.Texture();
        tex.image = document.createElement('canvas');
        tex.image.width = tex.image.height = 16;
        const ctx = tex.image.getContext('2d');
        ctx.fillStyle = '#' + color.toString(16);
        ctx.fillRect(0, 0, 16, 16);
        tex.needsUpdate = true;
        return tex;
    },

    loadSofa(scene) {
        const loader = new GLTFLoader();
        const textureLoader = new THREE.TextureLoader();

        // Try to load sofa texture, fallback if missing
        let sofaTex;
        try {
            sofaTex = textureLoader.load('assets/textures/sofa_02_diff_4k.jpg');
            sofaTex.flipY = false;
        } catch {
            sofaTex = new THREE.MeshStandardMaterial({ color: 0x666666 });
        }

        loader.load('models/sofa_02_4k.gltf', (gltf) => {
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.map = sofaTex;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            model.position.set(3, 0, -2);
            model.scale.set(1, 1, 1);
            scene.add(model);
            console.log("Sofa/Chair added for testing.");
        });
    }
};

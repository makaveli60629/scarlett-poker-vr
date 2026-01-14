import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.textureLoader = new THREE.TextureLoader();
        this.objects = []; // Track interactive items
        
        this.initEnvironment();
        this.addInteractiveCube();
    }

    initEnvironment() {
        // Example of using your assets folder
        const floorTex = this.textureLoader.load('assets/textures/floor_diffuse.jpg');
        const floorGeo = new THREE.PlaneGeometry(10, 10);
        const floorMat = new THREE.MeshStandardMaterial({ map: floorTex });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);
    }

    addInteractiveCube() {
        // A placeholder for event chips/logic
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 1.2, -0.5);
        this.scene.add(cube);
        this.objects.push(cube);
    }

    // This runs every frame
    update(hand1, hand2) {
        // Logic for Hand Interaction (Collision detection)
        this.checkHandProximity(hand1);
        this.checkHandProximity(hand2);
        
        // Constant world updates (e.g. floating animations)
        this.objects.forEach(obj => {
            obj.rotation.y += 0.01;
        });
    }

    checkHandProximity(hand) {
        if (!hand) return;
        
        // Simple distance-based interaction logic
        this.objects.forEach(obj => {
            const distance = hand.position.distanceTo(obj.position);
            if (distance < 0.1) {
                obj.material.color.setHex(0xff0000); // Visual feedback
            } else {
                obj.material.color.setHex(0x00ff00);
            }
        });
    }
}

import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
        this.interactiveObjects = [];
        this.grabbing = { left: null, right: null };

        this.initContent();
    }

    initContent() {
        // --- Floor Configuration ---
        const floorTex = this.loader.load('assets/textures/floor.jpg'); // Adjust to your filename
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(4, 4);
        
        const floorGeo = new THREE.PlaneGeometry(10, 10);
        const floorMat = new THREE.MeshStandardMaterial({ map: floorTex });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // --- Create Grabable Objects ---
        this.createBox("CardBox", 0, 1, -0.5);
    }

    createBox(name, x, y, z) {
        const tex = this.loader.load('assets/textures/box_skin.jpg');
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.name = name;
        
        this.scene.add(mesh);
        this.interactiveObjects.push(mesh);
    }

    update(hand1, hand2) {
        this.handleHand(hand1, 'left');
        this.handleHand(hand2, 'right');
    }

    handleHand(hand, side) {
        if (!hand || !hand.visible) return;

        const indexTip = hand.joints['index-finger-tip'];
        const thumbTip = hand.joints['thumb-tip'];

        if (indexTip && thumbTip) {
            const distance = indexTip.position.distanceTo(thumbTip.position);
            const isPinching = distance < 0.02;

            if (isPinching) {
                if (!this.grabbing[side]) {
                    // Try to pick up object
                    this.interactiveObjects.forEach(obj => {
                        if (indexTip.position.distanceTo(obj.position) < 0.1) {
                            this.grabbing[side] = obj;
                        }
                    });
                } else {
                    // Object follows hand
                    this.grabbing[side].position.copy(indexTip.position);
                }
            } else {
                // Release
                this.grabbing[side] = null;
            }
        }
    }
}

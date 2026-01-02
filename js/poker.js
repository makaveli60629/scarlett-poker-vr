import * as THREE from 'three';

export class PokerEngine {
    constructor(scene, loader) {
        this.scene = scene;
        this.loader = loader;
        this.isSeated = false;
        this.createTable();
        this.createNeonRing();
    }

    createTable() {
        const tableTex = this.loader.load('assets/textures/table_felt.jpg');
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32),
            new THREE.MeshStandardMaterial({ map: tableTex, color: 0x006400 })
        );
        table.position.set(0, 0.8, -3);
        this.scene.add(table);
    }

    createNeonRing() {
        // The green glow seating area
        const ringGeo = new THREE.RingGeometry(1.2, 1.3, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.05, -3);
        this.scene.add(ring);
    }

    update(playerPos) {
        const dist = playerPos.distanceTo(new THREE.Vector3(0, 1.6, -3));
        if (!this.isSeated && dist < 1.4) {
            this.isSeated = true;
            this.showWinner("HAND WON: ROYAL FLUSH");
        }
    }

    showWinner(msg) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512; canvas.height = 128;
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 44px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(msg, 256, 80);

        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
        sprite.position.set(0, 2.2, -3);
        sprite.scale.set(3, 0.75, 1);
        this.scene.add(sprite);

        setTimeout(() => { this.scene.remove(sprite); this.isSeated = false; }, 10000);
    }
}

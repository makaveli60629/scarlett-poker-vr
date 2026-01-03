import * as THREE from 'three';

export class PokerWorld {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
        this.setupEnvironment();
        this.setupLights();
    }

    loadTextureWithFallback(url, fallbackColor) {
        const mat = new THREE.MeshStandardMaterial({ color: fallbackColor });
        this.loader.load(
            url,
            tex => { mat.map = tex; mat.needsUpdate = true; },
            undefined,
            err => console.warn(`Failed to load ${url}, using fallback color`, err)
        );
        return mat;
    }

    setupEnvironment() {
        // ---------- Floor ----------
        const floorMat = this.loadTextureWithFallback('assets/textures/lobby_carpet.jpg', 0x444444);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.scene.add(floor);

        // ---------- Poker Table ----------
        const tableMat = this.loadTextureWithFallback('assets/textures/table_felt_green.jpg', 0x006600);
        const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 0.1, 32), tableMat);
        table.position.set(0, 0.8, 0);
        this.scene.add(table);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const point = new THREE.PointLight(0xffffff, 1);
        point.position.set(0, 5, 0);
        this.scene.add(point);
    }
}

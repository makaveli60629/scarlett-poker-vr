import * as THREE from 'three';

export class PokerWorld {
    constructor(scene) {
        this.scene = scene;
        this.loader = new THREE.TextureLoader();
        this.build();
    }

    safeMaterial(texturePath, fallbackColor) {
        const mat = new THREE.MeshStandardMaterial({ color: fallbackColor });

        this.loader.load(
            texturePath,
            tex => {
                mat.map = tex;
                mat.needsUpdate = true;
            },
            undefined,
            () => console.warn("Texture failed:", texturePath)
        );

        return mat;
    }

    build() {
        this.buildLights();
        this.buildFloor();
        this.buildWalls();
        this.buildTable();
        this.buildSpawnMarker();
    }

    buildLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));

        const light = new THREE.PointLight(0xffffff, 1.2);
        light.position.set(0, 5, 0);
        this.scene.add(light);
    }

    buildFloor() {
        const floorMat = this.safeMaterial(
            'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/assets/textures/lobby_carpet.jpg',
            0x444444
        );

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.scene.add(floor);
    }

    buildWalls() {
        const wallMat = this.safeMaterial(
            'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/assets/textures/brickwall.jpg',
            0x222222
        );

        const geo = new THREE.BoxGeometry(30, 4, 0.5);
        const positions = [
            [0, 2, -15, 0],
            [0, 2, 15, 0],
            [-15, 2, 0, Math.PI / 2],
            [15, 2, 0, Math.PI / 2]
        ];

        positions.forEach(p => {
            const wall = new THREE.Mesh(geo, wallMat);
            wall.position.set(p[0], p[1], p[2]);
            wall.rotation.y = p[3];
            this.scene.add(wall);
        });
    }

    buildTable() {
        const feltMat = this.safeMaterial(
            'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/assets/textures/table_felt_green.jpg',
            0x006600
        );

        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.4, 0.15, 32),
            feltMat
        );
        table.position.set(0, 0.8, 0);
        this.scene.add(table);

        const trimMat = this.safeMaterial(
            'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/assets/textures/Table leather trim.jpg',
            0x4a2a18
        );

        const trim = new THREE.Mesh(
            new THREE.TorusGeometry(1.7, 0.12, 16, 64),
            trimMat
        );
        trim.rotation.x = Math.PI / 2;
        trim.position.y = 0.88;
        this.scene.add(trim);
    }

    buildSpawnMarker() {
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        marker.position.set(0, 1.6, 10);
        this.scene.add(marker);
    }
}

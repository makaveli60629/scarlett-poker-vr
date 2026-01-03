import * as THREE from 'three';

export const WorldControl = {
    init(scene) {
        this.addLighting(scene);
        this.buildRoom(scene);
        this.addTable(scene);
    },

    addLighting(scene) {
        // High intensity ambient light to ensure visibility
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambient);

        const pointLight = new THREE.PointLight(0xffffff, 2);
        pointLight.position.set(0, 4, 0);
        scene.add(pointLight);
    },

    buildRoom(scene) {
        // Floor Grid (Visible ground so you aren't floating in void)
        const grid = new THREE.GridHelper(20, 20, 0x00f2ff, 0x444444);
        scene.add(grid);

        // Brick Walls (as per your assets/textures folder request)
        const wallGeo = new THREE.BoxGeometry(20, 4, 0.5);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brick-ish
        
        const backWall = new THREE.Mesh(wallGeo, wallMat);
        backWall.position.set(0, 2, -10);
        scene.add(backWall);
    },

    addTable(scene) {
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x006400 }) // Green felt
        );
        table.position.y = 0.8;
        scene.add(table);
    },

    showWinText(player, hand) {
        const ui = document.getElementById('win-ui');
        document.getElementById('winner-name').innerText = player + " WINS";
        document.getElementById('winner-hand').innerText = hand;
        ui.style.display = 'block';
        
        // 10 second timer as requested
        setTimeout(() => { ui.style.display = 'none'; }, 10000);
    }
};

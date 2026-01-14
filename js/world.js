import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export const World = {
    loader: new THREE.TextureLoader(),
    bots: [],

    async init({ scene }) {
        // 1. Load Textures from your assets/textures folder
        const tableTex = this.loader.load('assets/textures/table_top.jpg');
        const floorTex = this.loader.load('assets/textures/floor_grid.png');
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(10, 10);

        // 2. The Sunken Pit Floor
        const pitGeo = new THREE.CircleGeometry(12, 64);
        const pitMat = new THREE.MeshStandardMaterial({ color: 0x111111, map: floorTex });
        const pit = new THREE.Mesh(pitGeo, pitMat);
        pit.rotation.x = -Math.PI / 2;
        scene.add(pit);

        // 3. Neon Rails (The "Divot" Circle)
        const railGeo = new THREE.TorusGeometry(6.5, 0.08, 16, 100);
        const railMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff, 
            emissive: 0x00ffff, 
            emissiveIntensity: 2 
        });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.rotation.x = Math.PI / 2;
        rail.position.y = 1.1; // Waist height
        scene.add(rail);

        // 4. Textured Gold Table
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.4, 32),
            new THREE.MeshStandardMaterial({ map: tableTex, color: 0xd2b46a, metalness: 0.7 })
        );
        table.position.y = 0.2;
        scene.add(table);

        this.spawnBots(scene);
        console.log("WORLD_ASSETS: OK");
    },

    spawnBots(scene) {
        const botMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.1, metalness: 0.5 });
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const bot = new THREE.Group();
            bot.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), botMat));
            bot.position.set(Math.cos(angle) * 4.5, 0, Math.sin(angle) * 4.5);
            bot.lookAt(0, 1, 0);
            scene.add(bot);
            this.bots.push(bot);
        }
    }
};

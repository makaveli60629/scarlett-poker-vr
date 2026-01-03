import * as THREE from 'three';

export const World = {
    build(scene) {
        // Add massive light as a backup
        const light = new THREE.HemisphereLight(0xffffff, 0x444444, 3.0);
        scene.add(light);

        // THE LOBBY (Center)
        this.createFloor(scene, 0, 0, 0x111111);
        
        // NEON PURPLE PILLARS (Now using "Basic" so they glow)
        const neonPurple = new THREE.MeshBasicMaterial({ color: 0xbc13fe });
        const locations = [[-10, -10], [10, -10], [-10, 10], [10, 10]];
        locations.forEach(loc => {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8), neonPurple);
            pillar.position.set(loc[0], 4, loc[1]);
            scene.add(pillar);
        });

        // POKER TABLE (Right side of lobby for easy finding)
        const pokerGroup = new THREE.Group();
        pokerGroup.position.set(15, 0, 0); 
        
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 0.5, 32),
            new THREE.MeshStandardMaterial({ color: 0x006400, emissive: 0x002200 })
        );
        table.position.y = 0.9;
        pokerGroup.add(table);
        
        // 6 Dealer Chairs
        for(let i=0; i<6; i++) {
            const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), new THREE.MeshStandardMaterial({color: 0x222222}));
            const angle = (i/6) * Math.PI * 2;
            chair.position.set(Math.cos(angle)*3.5, 0.6, Math.sin(angle)*3.5);
            pokerGroup.add(chair);
        }
        scene.add(pokerGroup);
    },

    createFloor(scene, x, z, color) {
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: color })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0, z);
        scene.add(floor);
    }
};

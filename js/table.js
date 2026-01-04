import * as THREE from 'three';

export const Table = {
    textureLoader: new THREE.TextureLoader(),

    createTable(scene, x, z) {
        const group = new THREE.Group();

        // Materials with fallback
        const woodTex = this.textureLoader.load('assets/textures/table_atlas.jpg', undefined, undefined, () => {});
        const feltTex = this.textureLoader.load('assets/textures/table_felt_green.jpg', undefined, undefined, () => {});
        const leatherTex = this.textureLoader.load('assets/textures/Table leather trim.jpg', undefined, undefined, () => {});

        const mats = {
            wood: new THREE.MeshStandardMaterial({ map: woodTex, color: 0x8B4513 }),
            felt: new THREE.MeshStandardMaterial({ map: feltTex, color: 0x076324 }),
            leather: new THREE.MeshStandardMaterial({ map: leatherTex, color: 0x111111 })
        };

        // Felt top
        const felt = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.2, 64), mats.felt);
        felt.scale.set(1.8, 1, 1);
        felt.position.y = 1.05;
        group.add(felt);

        // Leather rail
        const rail = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.2, 16, 100), mats.leather);
        rail.rotation.x = Math.PI / 2;
        rail.scale.set(1.8, 1.1, 1);
        rail.position.y = 1.12;
        group.add(rail);

        // Wood skirt
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.5, 64), mats.wood);
        skirt.scale.set(1.78, 1, 0.98);
        skirt.position.y = 0.8;
        group.add(skirt);

        // Pedestal legs
        const legGeo = new THREE.CylinderGeometry(0.8, 1, 0.8, 16);
        const legL = new THREE.Mesh(legGeo, mats.wood);
        legL.position.set(-2.5, 0.4, 0);
        group.add(legL);

        const legR = legL.clone();
        legR.position.set(2.5, 0.4, 0);
        group.add(legR);

        // Branding logo
        let logoTex;
        try {
            logoTex = this.textureLoader.load('assets/textures/brand_logo.jpg');
        } catch {
            logoTex = new THREE.MeshStandardMaterial({ color: 0xffffff });
        }
        const logo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true }));
        logo.rotation.x = -Math.PI / 2;
        logo.position.y = 1.16;
        group.add(logo);

        group.position.set(x, 0, z);
        scene.add(group);
    },

    createChairs(scene, x, z) {
        const chairCount = 6;
        const radius = 4.5;
        for (let i = 0; i < chairCount; i++) {
            const angle = (i / chairCount) * Math.PI * 2;
            const chair = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 1, 0.5),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            chair.position.set(x + radius * Math.sin(angle), 0.5, z + radius * Math.cos

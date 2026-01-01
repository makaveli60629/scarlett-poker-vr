import * as THREE from 'three';

export const World = {
    build(scene) {
        const loader = new THREE.TextureLoader();

        // LIGHTING
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(2, 5, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040, 1.5));

        // BRICK WALLS (Using ./assets/ to stay in folder)
        // If your file is "brick.jpg", change the name below!
        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0x552222, 
            side: THREE.BackSide 
        });
        const room = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), wallMat);
        scene.add(room);

        // TABLE FELT
        const tableGeo = new THREE.CylinderGeometry(3, 3, 0.2, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x076324 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.8, -5);
        scene.add(table);

        // $5,000 BALANCE HOLOGRAM
        const spriteMat = new THREE.SpriteMaterial({ color: 0x00ffff });
        const balanceTag = new THREE.Sprite(spriteMat);
        balanceTag.position.set(-2, 2.5, -4.5);
        balanceTag.scale.set(1.5, 0.7, 1);
        scene.add(balanceTag);
    }
};

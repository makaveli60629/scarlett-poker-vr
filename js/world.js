import * as THREE from 'three';

export function buildWorld(scene) {
    // 1. CELESTIAL MOON LIGHTING
    const moonGeo = new THREE.SphereGeometry(4, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(20, 40, -30);
    scene.add(moon);

    const light = new THREE.DirectionalLight(0xffffee, 2.5);
    light.position.copy(moon.position);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // 2. LUXURY WOOD FLOOR (Corrected Shader)
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a0f00, roughness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 3. TABLE WITH LEATHER TRIM
    const table = new THREE.Group();
    const felt = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 64), new THREE.MeshStandardMaterial({color: 0x07331a}));
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 16, 100), new THREE.MeshStandardMaterial({color: 0x111111}));
    bumper.rotation.x = Math.PI/2; bumper.position.y = 0.05;
    table.add(felt); table.add(bumper);
    table.position.y = 0.8;
    scene.add(table);
}

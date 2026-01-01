import * as THREE from 'three';

export function createHand(isLeft) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color: 0xffdbac, roughness: 0.8});
    
    // Palm
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.08), mat);
    group.add(palm);

    // Fingers
    for(let i=0; i<4; i++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.07), mat);
        finger.rotation.x = Math.PI/2;
        finger.position.set(i*0.022 - 0.033, 0, -0.05);
        group.add(finger);
    }
    return group;
}

export function createBot(scene, x, z) {
    const bot = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), new THREE.MeshStandardMaterial({color: 0x222222}));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshStandardMaterial({color: 0xffdbac}));
    body.position.y = 1.1; head.position.y = 1.6;
    bot.add(body, head);
    bot.position.set(x, 0, z);
    scene.add(bot);
    return bot;
}

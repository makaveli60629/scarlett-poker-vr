import * as THREE from 'three';

class Physics {
    constructor() { this.colliders = []; }
    add(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push(box);
    }
    check(pos) {
        const playerSphere = new THREE.Sphere(pos, 0.5);
        for(let wall of this.colliders) {
            if(wall.intersectsSphere(playerSphere)) return true;
        }
        return false;
    }
}

export const World = {
    P: new Physics(),
    buildRoom(scene, name, x, z, size, color) {
        const group = new THREE.Group();
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({color: 0x111111}));
        floor.rotation.x = -Math.PI/2;
        group.add(floor);

        setupLights() {
    // Base room visibility (Increased to 1.0 for maximum brightness)
    const ambient = new THREE.AmbientLight(0xffffff, 1.0); 
    this.scene.add(ambient);

    // Focused table light
    const spot = new THREE.SpotLight(0xffffff, 2.5);
    spot.position.set(0, 5, 0);
    this.scene.add(spot);
    
    // Directional "Sun" light to create depth
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 7);
    this.scene.add(sun);
}

        // Solid Back Wall for Physics
        const wall = new THREE.Mesh(new THREE.BoxGeometry(size, 4, 0.5), new THREE.MeshStandardMaterial({color: 0x8b2222}));
        wall.position.set(0, 2, -size/2);
        group.add(wall);
        this.P.add(wall); 

        group.position.set(x, 0, z);
        scene.add(group);
    }
};

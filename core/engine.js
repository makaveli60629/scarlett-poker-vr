import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export let userRig;

export function initEngine() {
    // 1. Setup the Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black void for open-air look

    // 2. Setup the User Rig (This is your "Body" in VR)
    userRig = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    userRig.add(camera);
    scene.add(userRig);

    // 3. Setup Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 4. Luxury Lighting (Open Air Ambient)
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    // Auto-Sit Position: Move user to table height immediately
    userRig.position.set(0, 1.2, -5);

    return { scene, camera, renderer };
}

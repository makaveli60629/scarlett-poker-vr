import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function initEngine() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const userRig = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    userRig.add(camera);
    scene.add(userRig);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);

    // Initial position
    userRig.position.set(0, 0, 0); 

    return { scene, camera, renderer, userRig };
}

import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

export function initEngine() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const userRig = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    userRig.add(camera);
    userRig.position.set(0, 1.6, 5); // Human height, back from wall
    scene.add(userRig);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(light);

    return { scene, camera, renderer, userRig };
}

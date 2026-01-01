import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export function initEngine() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    const playerRig = new THREE.Group();
    playerRig.add(camera);
    scene.add(playerRig);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    return { scene, renderer, camera, playerRig };
}

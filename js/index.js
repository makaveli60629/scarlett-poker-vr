import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PokerWorld } from './world.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

let scene, camera, renderer, world;

function init() {
    // ---------- Scene ----------
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // ---------- Camera ----------
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 6); // Safe spawn area away from tables/walls
    camera.lookAt(0, 1.6, 0);

    // ---------- Renderer ----------
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // ---------- Initialize World ----------
    world = new PokerWorld(scene);

    // ---------- Setup Hands ----------
    const handFactory = new XRHandModelFactory();

    const leftHand = renderer.xr.getHand(0);
    try {
        leftHand.add(handFactory.createHandModel(leftHand, 'mesh'));
    } catch (err) {
        console.warn("Left hand failed, adding fallback sphere");
        leftHand.add(new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffaa00 })
        ));
    }
    scene.add(leftHand);

    const rightHand = renderer.xr.getHand(1);
    try {
        rightHand.add(handFactory.createHandModel(rightHand, 'mesh'));
    } catch (err) {
        console.warn("Right hand failed, adding fallback sphere");
        rightHand.add(new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffaa00 })
        ));
    }
    scene.add(rightHand);

    animate();
}

function animate() {
    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
    });
}

export function showWinner(name) {
    const el = document.getElementById('winner-display');
    el.innerText = `${name} WINS THE POT!`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 10000);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();

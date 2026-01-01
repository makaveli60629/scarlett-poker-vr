import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

let scene, camera, renderer, playerRig;
let controller1, controller2;

init().catch(err => {
    document.getElementById('status').innerText = "Error: " + err.message;
});

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    // RIG SETUP: Moves you AWAY from the table center to avoid the "inside table" black screen
    playerRig = new THREE.Group();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    playerRig.add(camera);
    playerRig.position.set(0, 0, 2); // 2 meters back
    scene.add(playerRig);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // ADD VR BUTTON
    const vrButton = VRButton.createButton(renderer);
    document.body.appendChild(vrButton);
    document.getElementById('status').innerText = "Ready for VR";

    // LIGHTING
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    // CARPET (Solid Red for Stability)
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x800000 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // POKER TABLE
    const table = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x004400 })
    );
    table.position.y = 0.7;
    scene.add(table);

    setupControllers();
    renderer.setAnimationLoop(render);
}

function setupControllers() {
    const factory = new XRControllerModelFactory();
    
    controller1 = renderer.xr.getController(0);
    playerRig.add(controller1);
    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(factory.createControllerModel(grip1));
    playerRig.add(grip1);

    controller2 = renderer.xr.getController(1);
    playerRig.add(controller2);
    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(factory.createControllerModel(grip2));
    playerRig.add(grip2);
}

function render() {
    // Auto-Sit Logic (If you walk to the table, you sit)
    if (playerRig.position.z < 1.3) {
        playerRig.position.y = -0.4;
    }
    renderer.render(scene, camera);
}

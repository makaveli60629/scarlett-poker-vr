import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let scene, camera, renderer, playerGroup;
let controllerLeft, controllerRight;
let watchMesh, watchMenu;
let playerSatDown = false;
let moveSpeed = 0.05;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    playerGroup = new THREE.Group();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);
    playerGroup.add(camera);
    scene.add(playerGroup);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.getElementById('vr-button-container').appendChild(VRButton.createButton(renderer));

    // Lobby & Table (One Big Room, No Arches)
    createLobby();
    createPokerTable();

    // VR Setup
    setupControllers();

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    scene.add(sun);
}

function setupControllers() {
    const modelFactory = new XRControllerModelFactory();

    // LEFT CONTROLLER (Movement + Y Button)
    controllerLeft = renderer.xr.getController(0);
    playerGroup.add(controllerLeft);
    const gripLeft = renderer.xr.getControllerGrip(0);
    gripLeft.add(modelFactory.createControllerModel(gripLeft));
    playerGroup.add(gripLeft);

    // RIGHT CONTROLLER (Trigger Interaction)
    controllerRight = renderer.xr.getController(1);
    controllerRight.addEventListener('selectstart', onRightTrigger);
    playerGroup.add(controllerRight);
    const gripRight = renderer.xr.getControllerGrip(1);
    gripRight.add(modelFactory.createControllerModel(gripRight));
    playerGroup.add(gripRight);

    // Attach Wrist Watch to Left Grip
    createWristWatch(gripLeft);
}

function createWristWatch(parent) {
    // Watch Face
    const watchGeom = new THREE.BoxGeometry(0.08, 0.02, 0.08);
    const watchMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    watchMesh = new THREE.Mesh(watchGeom, watchMat);
    watchMesh.position.set(0, 0.03, 0.05);
    parent.add(watchMesh);

    // The Menu (Attached to watch, hidden by default)
    const menuGeom = new THREE.PlaneGeometry(0.2, 0.2);
    const menuMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
    watchMenu = new THREE.Mesh(menuGeom, menuMat);
    watchMenu.position.set(0, 0.15, 0); // Floats above watch
    watchMenu.rotation.x = -Math.PI / 4;
    watchMenu.visible = false;
    watchMesh.add(watchMenu);
}

function handleInputs() {
    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;

        const axes = source.gamepad.axes; // Sticks
        const buttons = source.gamepad.buttons; // A, B, X, Y

        // LEFT CONTROLLER LOGIC (source 0 usually)
        if (source.handedness === 'left') {
            // 1. Walking with Stick (Axes 2 and 3)
            const forward = axes[3];
            const side = axes[2];
            
            // Movement direction based on camera orientation
            const moveVec = new THREE.Vector3(side, 0, forward);
            moveVec.applyQuaternion(camera.quaternion);
            moveVec.y = 0; // Keep on ground
            playerGroup.position.add(moveVec.multiplyScalar(moveSpeed));

            // 2. Y-Button Toggle (Button Index 5 on Quest)
            if (buttons[5].pressed) {
                watchMenu.visible = true;
            } else {
                // Keep menu visible logic can be added here if you want it to stay
            }
        }
    }
}

function onRightTrigger() {
    console.log("Right Trigger Pressed - Interaction Active");
    // This is where you will select cards or menu buttons
}

function createLobby() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(30, 10, 30),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, side: THREE.BackSide })
    );
    walls.position.y = 5;
    scene.add(walls);
}

function createPokerTable() {
    const table = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x076324 })
    );
    table.position.set(0, 0.9, -5);
    scene.add(table);
}

function checkAutoSit() {
    const dist = playerGroup.position.distanceTo(new THREE.Vector3(0, 0, -5));
    if (dist < 1.3 && !playerSatDown) {
        playerSatDown = true;
        playerGroup.position.set(0, 0, -4); // Sit position
        console.log("Player Seated");
    }
}

function animate() {
    renderer.setAnimationLoop(() => {
        handleInputs();
        checkAutoSit();
        renderer.render(scene, camera);
    });
}

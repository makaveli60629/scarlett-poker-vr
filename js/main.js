import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let scene, camera, renderer, controller1, controller2, raycaster;
let INTERSECTED;
const tempMatrix = new THREE.Matrix4();

init();

function init() {
    // 1. SCENE & SKY
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue

    // 2. CAMERA & RENDERER
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // 3. LIGHTING (Stronger for visibility)
    const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(5, 10, 5);
    scene.add(sun);

    // 4. GEOMETRY (Rooms & Walls)
    createWorld();

    // 5. CONTROLLERS & TELEPORT
    setupVR();

    renderer.setAnimationLoop(render);
}

function createWorld() {
    // FLOOR (Grey)
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.name = "Floor";
    scene.add(floor);

    // WALLS (Brick Red - No Ceilings)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const wallGeo = new THREE.BoxGeometry(10, 3, 0.2);

    // Room 1 (Lobby)
    const lobbyWall = new THREE.Mesh(wallGeo, wallMat);
    lobbyWall.position.set(0, 1.5, -5);
    scene.add(lobbyWall);

    // PILLARS (Corner Trim)
    const pillarGeo = new THREE.BoxGeometry(0.4, 3, 0.4);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const p1 = new THREE.Mesh(pillarGeo, pillarMat);
    p1.position.set(-5, 1.5, -5);
    scene.add(p1);

    // POKER TABLE (Green)
    const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x006400 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.8, 0);
    scene.add(table);

    // TELEPHONE (Black)
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.2), new THREE.MeshStandardMaterial({color: 0x000000}));
    phone.position.set(1.5, 0.9, 0);
    scene.add(phone);

    // EVENT CHIP (Gold)
    const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 32), new THREE.MeshStandardMaterial({color: 0xFFD700}));
    chip.position.set(0, 0.9, -0.5);
    scene.add(chip);
}

function setupVR() {
    const modelFactory = new XRControllerModelFactory();

    // Controller 1 (Teleport)
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    scene.add(controller1);

    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(modelFactory.createControllerModel(grip1));
    scene.add(grip1);

    // Controller 2 (Watch/Menu)
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(modelFactory.createControllerModel(grip2));
    scene.add(grip2);

    // Laser pointer for teleport
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1)]);
    const line = new THREE.Line(lineGeo);
    line.name = 'line';
    line.scale.z = 5;
    controller1.add(line.clone());

    raycaster = new THREE.Raycaster();
}

function onSelectStart() {
    // Teleportation Logic
    tempMatrix.identity().extractRotation(controller1.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects(scene.children);
    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.name === "Floor") {
            const p = intersects[i].point;
            // Move the camera setup (the player) to the floor point
            const group = renderer.xr.getCamera(camera).parent; 
            group.position.set(p.x, 0, p.z);
            break;
        }
    }
}

function render() {
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

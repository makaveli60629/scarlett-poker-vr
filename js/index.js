import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let scene, camera, renderer, playerGroup;
let controller1, controller2;
let raycaster, marker;
let playerSatDown = false;

// Wrist Watch & Menu Variables
let watchMesh, watchCanvas, watchTexture;
let mainMenuVisible = false;
let mainMenuMesh;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    playerGroup = new THREE.Group();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    playerGroup.add(camera);
    scene.add(playerGroup);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.getElementById('vr-button-container').appendChild(VRButton.createButton(renderer));

    // 1. LOBBY & TABLE
    createLobby();
    createPokerTable();

    // 2. VR CONTROLLERS
    setupVR();

    // 3. WRIST WATCH (On Left Controller Grip)
    createWristWatch();

    // 4. MAIN MENU (Hidden by default)
    createMainMenu();

    scene.add(new THREE.AmbientLight(0x404040, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    scene.add(sun);
}

function setupVR() {
    const modelFactory = new XRControllerModelFactory();

    // Left Controller
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', () => { marker.visible = true; });
    controller1.addEventListener('selectend', teleportPlayer);
    playerGroup.add(controller1);

    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(modelFactory.createControllerModel(grip1));
    playerGroup.add(grip1);

    // Right Controller
    controller2 = renderer.xr.getController(1);
    // "White Button" Mapping (A/X buttons usually trigger 'squeeze' or custom mapping)
    controller2.addEventListener('squeezestart', toggleMenu); 
    playerGroup.add(controller2);

    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(modelFactory.createControllerModel(grip2));
    playerGroup.add(grip2);

    raycaster = new THREE.Raycaster();
    createTeleportMarker();
}

function createWristWatch() {
    // Create Watch Face
    watchCanvas = document.createElement('canvas');
    watchCanvas.width = 256;
    watchCanvas.height = 256;
    watchTexture = new THREE.CanvasTexture(watchCanvas);

    const watchGeom = new THREE.BoxGeometry(0.08, 0.02, 0.08);
    const watchMat = new THREE.MeshStandardMaterial({ map: watchTexture });
    watchMesh = new THREE.Mesh(watchGeom, watchMat);

    // Position on the Left Grip (Wrist area)
    const leftGrip = renderer.xr.getControllerGrip(0);
    watchMesh.position.set(0, 0.03, 0.05);
    watchMesh.rotation.x = Math.PI / 2;
    leftGrip.add(watchMesh);
}

function updateWatchFace() {
    const ctx = watchCanvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.fillStyle = 'gold';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(time, 128, 50);
    
    ctx.fillStyle = 'white';
    ctx.font = '22px Arial';
    ctx.fillText('Cash: $50,000', 128, 110);
    ctx.fillText('Rank: Pro', 128, 160);
    ctx.fillText('Player: You', 128, 210);
    
    watchTexture.needsUpdate = true;
}

function createMainMenu() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 512;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 502);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MAIN MENU', 256, 100);
    ctx.font = '30px Arial';
    ctx.fillText('1. Resume', 256, 200);
    ctx.fillText('2. Settings', 256, 280);
    ctx.fillText('3. Exit Game', 256, 360);

    const tex = new THREE.CanvasTexture(canvas);
    mainMenuMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    mainMenuMesh.visible = false;
    scene.add(mainMenuMesh);
}

function toggleMenu() {
    mainMenuVisible = !mainMenuVisible;
    mainMenuMesh.visible = mainMenuVisible;
    
    // Place menu in front of user
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const pos = camera.getWorldPosition(new THREE.Vector3()).add(dir.multiplyScalar(1.5));
    mainMenuMesh.position.copy(pos);
    mainMenuMesh.lookAt(camera.position);
}

function createLobby() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.name = "Floor";
    scene.add(floor);

    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(20, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.BackSide })
    );
    walls.position.y = 4;
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

function createTeleportMarker() {
    marker = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 0.15, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);
}

function teleportPlayer() {
    if (marker.visible) {
        playerGroup.position.set(marker.position.x, 0, marker.position.z);
    }
    marker.visible = false;
}

function updateTeleportRay() {
    if (marker.visible) {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.extractRotation(controller1.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const intersects = raycaster.intersectObjects(scene.children);
        const floorIntersect = intersects.find(i => i.object.name === "Floor");
        if (floorIntersect) {
            marker.position.copy(floorIntersect.point);
        }
    }
}

function checkAutoSit() {
    const dist = playerGroup.position.distanceTo(new THREE.Vector3(0, 0, -5));
    if (dist < 1.2 && !playerSatDown) {
        playerSatDown = true;
        playerGroup.position.set(0, 0, -4); 
        console.log("Seated at table.");
    }
}

function animate() {
    renderer.setAnimationLoop(() => {
        updateWatchFace();
        updateTeleportRay();
        checkAutoSit();
        renderer.render(scene, camera);
    });
}

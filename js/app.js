import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

let scene, camera, renderer, controller1, controller2;
let watch, carpet, pokerTable, chair;

// User Data (Wrist Watch Stats)
const userData = { money: 2500, rank: "Gold", name: "Player 1" };

init();

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205); // Near black space blue

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);
    camera.position.set(0, 1.6, 2.5); // Start at standard eye height

    // --- RENDERER (Black Screen Fixes) ---
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: false,
        powerPreference: "high-performance" 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Attempting to force XR compatibility for Oculus Android
    const gl = renderer.getContext();
    if (gl.makeXRCompatible) await gl.makeXRCompatible();

    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // --- LIGHTING (Required for some VR Browsers) ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // --- PERMANENT ASSETS (Update 1.3 Logic) ---

    // 1. The Carpet (Solid Red Mesh)
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x550000 });
    carpet = new THREE.Mesh(floorGeo, floorMat);
    carpet.rotation.x = -Math.PI / 2;
    scene.add(carpet);

    // 2. The Poker Table
    const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x004400 });
    pokerTable = new THREE.Mesh(tableGeo, tableMat);
    pokerTable.position.y = 0.75;
    scene.add(pokerTable);

    // 3. Play Game / Chair Logic
    const chairGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(0, 0.25, 1.6);
    chair.name = "PlayGameTrigger";
    scene.add(chair);

    // Setup Oculus Hand Tracking & Watch
    setupControllers();

    // Start Rendering
    renderer.setAnimationLoop(render);
}

function setupControllers() {
    const modelFactory = new XRControllerModelFactory();

    // Controller 1 (Left Hand - Watch)
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);

    const grip1 = renderer.xr.getControllerGrip(0);
    grip1.add(modelFactory.createControllerModel(grip1));
    scene.add(grip1);

    // Controller 2 (Right Hand)
    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    const grip2 = renderer.xr.getControllerGrip(1);
    grip2.add(modelFactory.createControllerModel(grip2));
    scene.add(grip2);

    // --- THE WRIST WATCH (Permanent 1.3 Item) ---
    const watchGeo = new THREE.BoxGeometry(0.08, 0.015, 0.05);
    const watchMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    watch = new THREE.Mesh(watchGeo, watchMat);
    watch.position.set(0, 0.03, 0.02); // On the wrist
    grip1.add(watch);
}

// Win State Logic (Letters pop up for 10 seconds)
export function showWin(playerName, rank) {
    const ui = document.getElementById('win-popup');
    ui.innerText = `${playerName} WINS!\nRank: ${rank}`;
    ui.style.display = 'block';

    // Highlight Poker Table for the win
    pokerTable.material.emissive.setHex(0x00ff00);

    setTimeout(() => {
        ui.style.display = 'none';
        pokerTable.material.emissive.setHex(0x000000);
    }, 10000);
}

function render() {
    // 1. Teleport/Auto-Sit Logic
    const headPos = new THREE.Vector3();
    camera.getWorldPosition(headPos);

    // If near chair, "sit" the player down
    if (headPos.distanceTo(chair.position) < 1.0) {
        camera.position.y = 1.1; // Seated height
    }

    // 2. Watch Update (Oculus Control Button Logic)
    // Check for "White Button" on controller to trigger menu
    // renderer.xr.getSession() logic would go here for buttons

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

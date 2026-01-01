import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

let scene, camera, renderer, controller1, controller2;
let controllerGrip1, controllerGrip2;
let watchMesh, watchText;

// Game State
let userStats = { name: "Player", money: 5000, rank: "Rookie" };

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    // Move camera back and up so we aren't inside the floor (prevents black screen)
    camera.position.set(0, 1.6, 2); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.PointLight(0xffffff, 1);
    sun.position.set(0, 5, 0);
    scene.add(sun);

    // --- WORLD OBJECTS ---
    
    // The Carpet (Update 1.3 Stability)
    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x440000 }); // Red Carpet
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // The Poker Table
    const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 32);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x003300 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.8;
    scene.add(table);

    // Play Game / Seat Trigger
    const seatGeo = new THREE.BoxGeometry(0.4, 0.1, 0.4);
    const seatMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const seatTrigger = new THREE.Mesh(seatGeo, seatMat);
    seatTrigger.position.set(0, 0.1, 1.5);
    seatTrigger.name = "PlayGameTrigger";
    scene.add(seatTrigger);

    // Oculus Controllers & Watch
    setupControllers();

    // Start Loop
    renderer.setAnimationLoop(render);
}

function setupControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    // Controllers
    controller1 = renderer.xr.getController(0);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    scene.add(controller2);

    // Controller Grips (The Models)
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    // THE WRIST WATCH (On Left Hand - Grip 1)
    const watchGeo = new THREE.BoxGeometry(0.08, 0.02, 0.05);
    const watchMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    watchMesh = new THREE.Mesh(watchGeo, watchMat);
    watchMesh.position.set(0, 0.03, 0); // Position on top of wrist
    controllerGrip1.add(watchMesh);
}

// Logic for Win Display (10 Seconds)
export function handleWin(winnerName, hand) {
    const el = document.getElementById('win-display');
    el.innerText = `${winnerName} WINS WITH ${hand}!`;
    el.style.display = 'block';
    
    // Highlight winning player (placeholder logic)
    console.log("Highlighting Winner...");

    setTimeout(() => {
        el.style.display = 'none';
    }, 10000);
}

function updateWatch() {
    // This updates every frame for the time
    const now = new Date();
    const timeStr = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    // Future update: Draw this to a CanvasTexture for the watch screen
}

function render() {
    updateWatch();

    // Auto-Sit Logic: Check if camera is near "Play Game" trigger
    if (camera.position.distanceTo(new THREE.Vector3(0, 1.6, 1.5)) < 0.5) {
        // Automatic seat logic
        camera.position.y = 1.2; // Sit down height
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

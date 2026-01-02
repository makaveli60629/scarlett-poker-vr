    import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { createEnvironment } from './environment.js';
import { setupControllers, handleMovement } from './controls.js';
import { generateTables } from './tableGenerator.js';

let scene, camera, renderer, controls;
let userWallet = 5000;

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    
    // NEW SPAWN: Centered X, 1.6m Height, far back at 80m from table center
    camera.position.set(0, 1.6, 80); 

    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true // Helps fix Oculus browser black screens
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    scene.add(new THREE.AmbientLight(0xffffff, 1.5)); // Brightness boost

    createEnvironment(scene, userWallet);
    controls = setupControllers(renderer, scene);
    generateTables(scene);

    renderer.setAnimationLoop(render);
}

function render() {
    handleMovement(renderer, camera, controls);

    // Auto-Sit logic for 200x200 room
    const dist = Math.sqrt(camera.position.x**2 + (camera.position.z % 200)**2);
    if (dist < 10) { 
        camera.position.y = 1.1; // Sits down near table
    } else { 
        camera.position.y = 1.6; // Stands up
    }

    renderer.render(scene, camera);
}

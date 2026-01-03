import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

let scene, camera, renderer, cameraRig, hand1, hand2;
let snapTurned = false;

// --- INITIALIZE ENGINE ---
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

    cameraRig = new THREE.Group();
    cameraRig.position.set(0, 0, 2.0); // Audited Spawn Position
    cameraRig.add(camera);
    scene.add(cameraRig);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Hands Setup
    const handFactory = new XRHandModelFactory();
    hand1 = renderer.xr.getHand(0); 
    hand1.add(handFactory.createHandModel(hand1, "mesh")); 
    cameraRig.add(hand1);

    hand2 = renderer.xr.getHand(1); 
    hand2.add(handFactory.createHandModel(hand2, "mesh")); 
    cameraRig.add(hand2);

    // Load External World Logic (Coming in world.js)
    setupWorld();

    renderer.setAnimationLoop(render);
}

function setupWorld() {
    // Moonlight & Sky
    const moonLight = new THREE.DirectionalLight(0xffffee, 3.0);
    moonLight.position.set(30, 50, -40);
    scene.add(moonLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    // Luxury Floor (Placeholder for Wood/Gold logic)
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a0f00 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
}

function render(time) {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad) {
                const axes = source.gamepad.axes; 
                
                // Movement Logic
                cameraRig.position.x += (axes[0] || 0) * 0.05;
                cameraRig.position.z += (axes[1] || 0) * 0.05;

                // 45° Snap Turn (Critique Fix)
                const rx = axes[2] || 0;
                if (Math.abs(rx) > 0.75 && !snapTurned) {
                    cameraRig.rotation.y -= Math.sign(rx) * (Math.PI / 4);
                    snapTurned = true;
                } else if (Math.abs(rx) < 0.1) {
                    snapTurned = false;
                }
            }
        }
    }
    renderer.render(scene, camera);
}

init();

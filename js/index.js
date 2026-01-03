import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { buildWorld } from './world.js';

let scene, camera, renderer, cameraRig, hand1, hand2;
let snapTurned = false;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010103); // Fix: Ensure scene isn't just "void"
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    cameraRig = new THREE.Group();
    cameraRig.position.set(0, 0, 2.0); // Audited Spawn
    cameraRig.add(camera);
    scene.add(cameraRig);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    const handFactory = new XRHandModelFactory();
    hand1 = renderer.xr.getHand(0); hand1.add(handFactory.createHandModel(hand1, "mesh")); cameraRig.add(hand1);
    hand2 = renderer.xr.getHand(1); hand2.add(handFactory.createHandModel(hand2, "mesh")); cameraRig.add(hand2);

    // BUILD THE AUDITED WORLD
    buildWorld(scene);

    renderer.setAnimationLoop(render);
}

function render() {
    const session = renderer.xr.getSession();
    if (session) {
        for (const source of session.inputSources) {
            if (source.gamepad) {
                const axes = source.gamepad.axes; 
                cameraRig.position.x += (axes[0] || 0) * 0.05;
                cameraRig.position.z += (axes[1] || 0) * 0.05;
                const rx = axes[2] || 0;
                if (Math.abs(rx) > 0.75 && !snapTurned) {
                    cameraRig.rotation.y -= Math.sign(rx) * (Math.PI / 4);
                    snapTurned = true;
                } else if (Math.abs(rx) < 0.1) { snapTurned = false; }
            }
        }
    }
    renderer.render(scene, camera);
}
init();

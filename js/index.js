import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

let scene,camera,renderer,world,teleport;

async function init(){
    scene=new THREE.Scene();
    scene.background=new THREE.Color(0x111111);

    camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
    camera.position.set(0,1.6,10);

    renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.xr.enabled=true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Load World safely
    try {
        const module = await import('./world.js');
        world = new module.PokerWorld(scene);
    } catch(e){ console.warn("World module failed:", e); }

    // Hands
    const factory = new XRHandModelFactory();
    [0,1].forEach(i=>{
        const hand = renderer.xr.getHand(i);
        try{ hand.add(factory.createHandModel(hand,'mesh')); }
        catch{ hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8), new THREE.MeshStandardMaterial({color:0xffaa00}))); }
        scene.add(hand);
    });

    // Teleport fallback
    try{
        const module = await import('./teleport.js');
        teleport = new module.TeleportSystem(renderer,camera,scene,world);
    }catch(e){ console.warn("Teleport module failed:",e); }

    renderer.setAnimationLoop(render);
    document.getElementById('status').innerText='Scarlet VR Loaded';
}

function render(){ renderer.render(scene,camera); }

window.addEventListener('resize',()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
});

init();
